/** Per-account detail, explorers, and mutations. */

import {
  adminUserCalls,
  adminUserCourses,
  adminUserDetail,
  adminUserEvents,
  adminUserNodes,
  adminUserStudies,
  clearAdminCalls,
  clearAdminEvents,
  clearAdminPortalData,
  deleteAdminUser,
  disconnectAdminCampus,
  disconnectAdminIlias,
  linkAdminPlatform,
  readAdminUserIliasContent,
  readAdminUserIliasFile,
  readAdminUserIliasImage,
  readAdminUserIliasMembers,
  readAdminUserIliasProfile,
  revokeAdminSession,
  revokeAdminSessions,
  startAdminSyncJob,
  touchAdminPlatform,
  unlinkAdminPlatform,
  updateAdminUser,
} from '../../admin/index.mjs';
import { getUser } from '../../auth.mjs';
import { attachmentDisposition, readJsonBody, send } from '../../http.mjs';
import { adminUserId, decode, fail, query } from './shared.mjs';

export async function handleUser(request, response, url) {
  const match = url.pathname.match(/^\/v1\/admin\/users\/([^/]+)(?:\/(.*))?$/);
  if (!match) {
    send(response, 404, { error: 'not_found' });
    return true;
  }
  const userId = decode(match[1]);
  if (!adminUserId(userId)) {
    send(response, 400, { error: 'bad_user_id' });
    return true;
  }
  const action = match[2] ? decode(match[2]) : '';
  if (action === null) {
    send(response, 400, { error: 'bad_action' });
    return true;
  }
  if (!getUser(userId)) {
    send(response, 404, { error: 'unknown_user' });
    return true;
  }
  const params = query(url);

  if (request.method === 'GET' && action === '') {
    send(response, 200, adminUserDetail(userId));
    return true;
  }
  if (request.method === 'POST' && action === '') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      updateAdminUser(userId, parsed.body);
      send(response, 200, adminUserDetail(userId));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'DELETE' && action === '') {
    deleteAdminUser(userId);
    send(response, 200, { ok: true });
    return true;
  }
  if (request.method === 'GET' && action === 'studies') {
    send(response, 200, adminUserStudies(userId));
    return true;
  }
  if (request.method === 'GET' && action === 'courses') {
    send(response, 200, adminUserCourses(userId, params));
    return true;
  }
  if (request.method === 'GET' && action === 'nodes') {
    send(response, 200, adminUserNodes(userId, params));
    return true;
  }
  if (request.method === 'GET' && action === 'events') {
    send(response, 200, adminUserEvents(userId, params));
    return true;
  }
  if (request.method === 'GET' && action === 'calls') {
    send(response, 200, adminUserCalls(userId, params));
    return true;
  }
  if (request.method === 'POST' && action === 'sessions/revoke') {
    send(response, 200, revokeAdminSessions(userId));
    return true;
  }
  if (request.method === 'DELETE' && action.startsWith('sessions/')) {
    const sessionId = decode(action.slice('sessions/'.length));
    if (!sessionId || !revokeAdminSession(userId, sessionId)) {
      send(response, 404, { error: 'unknown_session' });
      return true;
    }
    send(response, 200, adminUserDetail(userId));
    return true;
  }
  if (request.method === 'POST' && action === 'platforms') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      send(response, 200, linkAdminPlatform(userId, parsed.body));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  const touch = action.match(/^platforms\/([^/]+)\/touch$/);
  if (request.method === 'POST' && touch) {
    const platform = decode(touch[1]);
    try {
      send(response, 200, touchAdminPlatform(userId, platform));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'DELETE' && action.startsWith('platforms/') && !action.slice('platforms/'.length).includes('/')) {
    const platform = decode(action.slice('platforms/'.length));
    try {
      send(response, 200, unlinkAdminPlatform(userId, platform));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'POST' && action === 'campus/disconnect') {
    send(response, 200, disconnectAdminCampus(userId));
    return true;
  }
  if (request.method === 'POST' && action === 'ilias/disconnect') {
    disconnectAdminIlias(userId);
    send(response, 200, adminUserDetail(userId));
    return true;
  }
  if (request.method === 'GET' && action === 'ilias/content') {
    try {
      const content = await readAdminUserIliasContent(userId, {
        refId: url.searchParams.get('refId'),
        kind: url.searchParams.get('kind') || 'crs',
      });
      send(response, 200, content);
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && action === 'ilias/members') {
    try {
      const members = await readAdminUserIliasMembers(userId, {
        refId: url.searchParams.get('refId'),
        kind: url.searchParams.get('kind') || 'crs',
        membersUrl: url.searchParams.get('url') || '',
      });
      send(response, 200, members);
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && action === 'ilias/profile') {
    try {
      const profile = await readAdminUserIliasProfile(userId, {
        profileUserId: url.searchParams.get('userId'),
        profileUrl: url.searchParams.get('url') || '',
      });
      send(response, 200, profile);
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && action === 'ilias/image') {
    try {
      const image = await readAdminUserIliasImage(userId, url.searchParams.get('url') || '');
      response.writeHead(200, {
        'Content-Type': image.contentType,
        'Content-Length': image.bytes.length,
        'Cache-Control': 'private, max-age=600',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(image.bytes);
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'GET' && action === 'ilias/file') {
    try {
      const file = await readAdminUserIliasFile(userId, { refId: url.searchParams.get('refId') });
      const disposition = attachmentDisposition(file.filename);
      response.writeHead(200, {
        'Content-Type': file.contentType,
        'Content-Length': file.bytes.length,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(disposition ? { 'Content-Disposition': disposition } : {}),
      });
      response.end(file.bytes);
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'POST' && action === 'portal/clear') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      send(response, 200, clearAdminPortalData(userId, parsed.body?.studyId));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  if (request.method === 'POST' && action === 'portal/events/clear') {
    send(response, 200, clearAdminEvents(userId));
    return true;
  }
  if (request.method === 'POST' && action === 'portal/calls/clear') {
    send(response, 200, clearAdminCalls(userId));
    return true;
  }
  if (request.method === 'POST' && action === 'sync') {
    const parsed = await readJsonBody(request, response);
    if (!parsed) return true;
    try {
      send(response, 200, await startAdminSyncJob(userId, parsed.body));
    } catch (error) {
      fail(response, error);
    }
    return true;
  }
  send(response, 404, { error: 'not_found' });
}
