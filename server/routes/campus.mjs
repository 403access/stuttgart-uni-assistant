/**
 * C@MPUS routes: login, curriculum reads, background sync, calendar, and the
 * stored portal rows. The browser sends cookies once; after that the server
 * holds the credential per account.
 */

import { exportCampusCalendar, loadCampusStudies, loadCourseGroups, loadCurriculumCourses, loadCurriculumStructure, publicCampusStatus, readCampusLogin, resolveLoginCredential, setUserCampusCredential, storeCampusLogin, syncExportedCalendar, validateBrowserCredentials } from '../campus.mjs';
import { authenticateRequest, campusPlatformLinks, createUserSession, getUser, requireAuth } from '../auth.mjs';
import { getCoursesSync, loadCourses, loadCoursesFetchedIds, loadExportedEvents, loadStructure, readPortalCalls, saveCampusSource } from '../db.mjs';
import { readJsonBody, send } from '../http.mjs';
import { errorBody, logRequest, previewBody } from '../request-log.mjs';
import { cancelSyncJobForUser, getSyncJobForUser, startSyncJob } from '../sync.mjs';

function logFailure(reqId, action, error) {
  const code = error.message || 'campus_failed';
  console.log(`[campus #${reqId}] ${action} failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
}

export async function handleCampus(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/v1/campus/config') {
    const auth = authenticateRequest(request);
    send(response, 200, publicCampusStatus(auth?.user?.id));
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/credentials') {
    console.log('[campus] POST /v1/campus/credentials');
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    try {
      // Secrets in, never out: the body is neither logged nor echoed.
      const auth = authenticateRequest(request);
      const result = await validateBrowserCredentials({ cookies: body?.cookies, storage: body?.storage });
      if (auth) {
        // A signed-in user reconnecting C@MPUS: keep the credential under that account.
        setUserCampusCredential(auth.user.id, result.credential);
        saveCampusSource(auth.user.id, 'browser', auth.user.account);
        console.log(`[campus] credentials ok studies=${result.studies} user=${auth.user.id}`);
        send(response, 200, { ok: true, studies: result.studies, activeStudyId: result.activeStudyId, user: getUser(auth.user.id) });
        return true;
      }
      // Pre-login: hand the validated credential to /v1/campus/login by ticket.
      console.log(`[campus] credentials ok studies=${result.studies} ticket issued`);
      send(response, 200, { ok: true, studies: result.studies, activeStudyId: result.activeStudyId, ticket: result.ticket });
    } catch (error) {
      const code = error.message || 'campus_failed';
      console.log(`[campus] credentials failed ${code}${error.detail ? ` detail=${error.detail}` : ''}`);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/login') {
    const reqId = logRequest('POST /v1/campus/login');
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    try {
      const auth = authenticateRequest(request);
      const credential = resolveLoginCredential({ ticket: body?.ticket, userId: auth?.user?.id });
      // Read the profile before choosing the user id: a pre-login ticket has no account yet.
      const profile = await readCampusLogin(credential, fetch, auth?.user?.id ?? null, false);
      const { credential: _credential, ...profileData } = profile;
      // The C@MPUS read proves the st-account. Mint the app session for this
      // user and record the platforms that share the same SIAM identity.
      const session = createUserSession({
        account: profileData.account,
        name: profileData.name,
        mode: 'campus',
        platforms: campusPlatformLinks({ account: profileData.account }),
      });
      setUserCampusCredential(session.user.id, { ...credential, account: profileData.account });
      saveCampusSource(session.user.id, credential.source, profileData.account);
      storeCampusLogin(session.user.id, profileData);
      console.log(`[campus #${reqId}] login ok name=${profileData.name} account=${profileData.account} nodes=${profileData.nodes.length} studies=${profileData.studies?.length ?? 0} user=${session.user.id}`);
      send(response, 200, { ...profileData, user: session.user, token: session.token, sessionId: session.sessionId, expiresAt: session.expiresAt });
    } catch (error) {
      logFailure(reqId, 'login', error);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/structure') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    const reqId = logRequest('POST /v1/campus/structure', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await loadCurriculumStructure(body?.elementId, body?.studyId, fetch, undefined, auth.user.id);
      console.log(`[campus #${reqId}] structure ok study=${result.studyId} element=${result.elementId} nodes=${result.nodes.length}`);
      send(response, 200, result);
    } catch (error) {
      logFailure(reqId, 'structure', error);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/courses') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    const reqId = logRequest('POST /v1/campus/courses', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await loadCurriculumCourses(body?.studyId, body?.elementId, fetch, undefined, auth.user.id);
      console.log(`[campus #${reqId}] courses ok study=${result.studyId} element=${result.elementId} count=${result.courses.length}`);
      send(response, 200, result);
    } catch (error) {
      logFailure(reqId, 'courses', error);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/course-groups') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    const reqId = logRequest('POST /v1/campus/course-groups', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await loadCourseGroups(body?.courseId, fetch, undefined, auth.user.id);
      console.log(`[campus #${reqId}] course groups ok course=${result.courseId} groups=${result.groups.length}`);
      send(response, 200, result);
    } catch (error) {
      logFailure(reqId, 'course groups', error);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/sync') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    const reqId = logRequest('POST /v1/campus/sync', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const job = await startSyncJob({ userId: auth.user.id, studyId: body?.studyId, elementId: body?.elementId, includeCourses: body?.includeCourses });
      console.log(`[campus #${reqId}] sync started job=${job.jobId} study=${job.studyId}`);
      send(response, 200, job);
    } catch (error) {
      logFailure(reqId, 'sync', error);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  if ((request.method === 'GET' || request.method === 'DELETE') && url.pathname.startsWith('/v1/campus/sync/')) {
    const id = url.pathname.slice('/v1/campus/sync/'.length);
    if (!/^[1-9]\d{0,9}$/.test(id)) {
      send(response, 400, { error: 'bad_job_id' });
      return true;
    }
    try {
      const auth = requireAuth(request);
      const job = request.method === 'DELETE' ? cancelSyncJobForUser(auth.user.id, id) : getSyncJobForUser(auth.user.id, id);
      if (!job) {
        send(response, 404, { error: 'unknown_job' });
        return true;
      }
      send(response, 200, job);
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/tree') {
    const studyId = Number(url.searchParams.get('studyId'));
    if (!Number.isInteger(studyId) || studyId <= 0) {
      send(response, 400, { error: 'bad_study_id' });
      return true;
    }
    try {
      const auth = requireAuth(request);
      const stored = loadStructure(auth.user.id, studyId);
      send(response, 200, {
        studyId,
        nodes: stored.nodes,
        expandedIds: stored.expandedIds,
        sync: stored.sync
          ? { nodeCount: stored.sync.nodeCount, finishedAt: stored.sync.finishedAt, complete: stored.sync.complete }
          : null,
      });
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/courses/all') {
    const studyId = Number(url.searchParams.get('studyId'));
    if (!Number.isInteger(studyId) || studyId <= 0) {
      send(response, 400, { error: 'bad_study_id' });
      return true;
    }
    try {
      const auth = requireAuth(request);
      const sync = getCoursesSync(auth.user.id, studyId);
      send(response, 200, {
        studyId,
        courses: loadCourses(auth.user.id, studyId),
        fetchedElementIds: loadCoursesFetchedIds(auth.user.id, studyId),
        sync: sync ? { courseCount: sync.courseCount, finishedAt: sync.finishedAt, complete: sync.complete } : null,
      });
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/calendar-export') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    const reqId = logRequest('POST /v1/campus/calendar-export', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await exportCampusCalendar(body, undefined, auth.user.id);
      console.log(`[campus #${reqId}] calendar export ok ${result.filename} ${result.bytes} bytes`);
      send(response, 200, result);
    } catch (error) {
      logFailure(reqId, 'calendar export', error);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  if (request.method === 'POST' && url.pathname === '/v1/campus/calendar-sync') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    const body = parsed.body;
    const reqId = logRequest('POST /v1/campus/calendar-sync', `body=${previewBody(body)}`);
    try {
      const auth = requireAuth(request);
      const result = await syncExportedCalendar(body, undefined, auth.user.id);
      console.log(`[campus #${reqId}] calendar sync ok ${result.imported} new, ${result.skipped} duplicates`);
      send(response, 200, result);
    } catch (error) {
      logFailure(reqId, 'calendar sync', error);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/calendar-events') {
    try {
      const auth = requireAuth(request);
      const events = loadExportedEvents(auth.user.id, url.searchParams.get('limit'));
      send(response, 200, {
        events: events.map((event) => ({
          uid: event.uid,
          summary: event.summary,
          location: event.location,
          description: event.description,
          dtstart: event.dtstart,
          dtend: event.dtend,
          fetchedAt: event.fetched_at,
        })),
      });
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/calls') {
    try {
      const auth = requireAuth(request);
      send(response, 200, { calls: readPortalCalls(auth.user.id, url.searchParams.get('limit')) });
    } catch (error) {
      send(response, Number(error.status) || 500, { error: error.message || 'campus_failed' });
    }
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/v1/campus/studies') {
    const reqId = logRequest('GET /v1/campus/studies');
    try {
      const auth = requireAuth(request);
      const result = await loadCampusStudies(undefined, auth.user.id);
      console.log(`[campus #${reqId}] studies ok count=${result.studies.length}`);
      send(response, 200, result);
    } catch (error) {
      logFailure(reqId, 'studies', error);
      send(response, Number(error.status) || 500, errorBody(error));
    }
    return true;
  }
  return false;
}
