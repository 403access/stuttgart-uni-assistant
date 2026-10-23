/**
 * ILIAS client coverage. The flow is served locally: a login form, a form POST
 * that sets PHPSESSID, and a dashboard with the blocks the real portal renders.
 * No request leaves the machine.
 */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, beforeEach, test } from 'node:test';

process.env.CAMPUS_DB_PATH = ':memory:';

const { resetDbForTests, loadIliasSnapshot, loadIliasSource, saveIliasSnapshot, saveIliasSource } = await import('./db.mjs');
const {
  CookieJar,
  cachedIliasContent,
  cachedIliasDashboard,
  cachedIliasMembers,
  fetchIliasContent,
  fetchIliasDashboard,
  fetchIliasFile,
  fetchIliasMembers,
  iliasLoginName,
  ingestIliasPage,
  loginIlias,
  looksLikeIliasLogin,
  mask,
  normalizeIliasCookie,
  parseIliasContent,
  parseIliasDashboard,
  parseIliasMembers,
  parseIliasLoginForm,
  publicIliasStatus,
  setUserIliasSession,
  clearUserIliasSession,
  disconnectIlias,
} = await import('./ilias.mjs');
const { handleIlias } = await import('./routes/ilias.mjs');

const LOGIN_FORM = `<!doctype html><html><body>
  <div class="alert alert-danger" style="display:none">hidden</div>
  <form class="c-form" enctype="multipart/form-data" name="login_form" action="__ACTION__" method="post">
    <input type="hidden" name="login_form/input_1" value="csrf" />
    <input id="user" type="text" name="login_form/input_3/input_4" />
    <input id="password" type="password" name="login_form/input_3/input_5" />
    <button class="btn btn-default" data-action="">Anmelden</button>
  </form>
</body></html>`;

const DASHBOARD = `<!doctype html><html><head><title>Dashboard: ILIAS für Lehre und Lernen</title></head><body>
  <span class="abbreviation">Ol</span>
  <a href="ilias.php?baseClass=ilDashboardGUI&amp;cmd=jumpToProfile"><span class="bulky-label">Profil und Datenschutz · Oliver Molnar [OliverMolnar]</span></a>
  <div id="block_dash_mem_0">
    <div class="il-item-group"><h3>Einführung in die Geschichte der Philosophie</h3>
      <div class="il-item-group-items"><ul>
        <li class="il-std-item-container"><div class="il-item il-std-item">
          <img class="icon custom medium" src="icon_grp.svg" alt="Gruppe" />
          <h4 class="il-item-title"><a href="https://ilias3.uni-stuttgart.de/go/grp/4642950">Tutorium Penelope Martinez Halmen</a></h4>
          <div class="il-item-description">Mi. 11:30-13:00 M11.62</div>
          <hr class="il-item-divider" />
          <span class="il-item-property-name">Beitrittszeitraum</span><span class="il-item-property-value">Keine Anmeldung möglich</span>
        </div></li>
      </ul></div>
    </div>
    <div class="il-item-group"><h3>Winter 2026/27</h3>
      <div class="il-item-group-items"><ul>
        <li class="il-std-item-container"><div class="il-item il-std-item">
          <img class="icon custom medium" src="icon_crs.svg" alt="Kurs" />
          <h4 class="il-item-title"><a href="https://ilias3.uni-stuttgart.de/go/crs/4582895">Basic Phonetics &amp; Phonology (B) (WiSe 2026/27)</a></h4>
          <hr class="il-item-divider" />
          <span class="il-item-property-name">Lernfortschritt</span><span class="il-item-property-value">In Bearbeitung</span>
        </div></li>
        <li class="il-std-item-container"><div class="il-item il-std-item">
          <img class="icon custom medium" src="icon_crs.svg" alt="Kurs" />
          <h4 class="il-item-title"><a href="https://ilias3.uni-stuttgart.de/go/crs/4590579">Einführung in die formale Logik</a></h4>
        </div></li>
      </ul></div>
    </div>
  </div>
  <aside>
    <div id="block_pdnews_5885197"><div class="il-item-group"><div class="il-item-group-items"><ul>
      <li class="il-std-item-container"><div class="il-item il-std-item">
        <h4 class="il-item-title"><a href="ilias.php?baseClass=ildashboardgui&amp;news_context=4663623&amp;news_id=3907532">Es wurde eine Datei hinzugefügt.</a></h4>
        <div class="il-item-description">Datei: Literaturempfehlungen.pdf</div>
        <span class="il-item-property-name">Datum</span><span class="il-item-property-value">Heute, 21:55</span>
      </div></li>
    </ul></div></div></div>
    <div id="block_pdmail_0"><div class="il-item-group"><div class="il-item-group-items"><ul>
      <li class="il-std-item-container"><div class="il-item il-std-item">
        <h4 class="il-item-title"><a href="ilias.php?baseClass=ilmailgui&amp;mail_id=47225318">Ihre Anmeldung für Gruppe „Tutorium 5“</a></h4>
        <span class="il-item-property-name">Von</span><span class="il-item-property-value">ILIAS Universität Stuttgart</span>
        <span class="il-item-property-name">Datum</span><span class="il-item-property-value">15. Okt 2026, 19:06</span>
      </div></li>
    </ul></div></div></div>
    <div id="block_pdtasks_0"><div class="panel-body">Es sind keine To-Dos für Sie vorhanden.</div></div>
  </aside>
  <div class="badge badge-notify il-counter-novelty">4</div>
  <a href="ilias.php?baseClass=ilMailGUI">Sie haben 4 ungelesene Mails</a>
</body></html>`;

const CONTENT_PAGE = `<!doctype html><html><head><title>ILIAS</title></head><body>
  <nav><a href="https://ilias3.uni-stuttgart.de/go/crs/4590579">Einführung in die formale Logik</a></nav>
  <ul id="ilTab">
    <li><a href="ilias.php?baseClass=ilrepositorygui&amp;cmdNode=xi:md:9s:14x&amp;cmdClass=ilusersgallerygui&amp;cmd=view&amp;ref_id=4590579">Mitglieder</a></li>
  </ul>
  <div id="mainspacekeeper">
    <h1 class="il-page-content-header media-heading ilHeader ">Einführung in die formale Logik</h1>
    <div class="ilHeaderDesc">Vorlesung im Wintersemester</div>
    <div id="ilContentContainer">
      <div id="bl_cntr_1" class="ilContainerBlock">
        <ul class="ilContainerItemsContainer">
          <li id="item_row__other-4665501" class="ilCLI ilObjListRow">
            <div class="ilContainerListItemOuter" data-list-item-id="lg_div_4665501">
              <div class="ilContainerListItemIcon"><img alt="Inline Datei" class="ilListItemIcon" src="icon.svg" /></div>
              <div class="ilContainerListItemContent"><div class="il_ContainerListItem">
                <h3 class="il_ContainerItemTitle">
                  <a href="https://ilias3.uni-stuttgart.de/ilias.php?baseClass=ilrepositorygui&amp;cmdClass=ilObjFileGUI&amp;cmd=sendfile&amp;ref_id=4665501" class="il_ContainerItemTitle">Regelübersicht_-_Kalkül_des_natürlichen_Schließens</a>
                </h3>
                <div class="ilListItemSection il_Description"></div>
                <div class="ilListItemSection il_ItemProperties">
                  <span class="il_ItemProperty">pdf&nbsp;&nbsp;</span>
                  <span class="il_ItemProperty">146.22 KB&nbsp;&nbsp;</span>
                  <span class="il_ItemProperty">Heute, 11:05&nbsp;&nbsp;</span>
                  <span class="il_ItemProperty">Anzahl Seiten: 2&nbsp;&nbsp;</span>
                </div>
              </div></div>
            </div>
          </li>
          <li id="item_row__other-4646496" class="ilCLI ilObjListRow">
            <div class="ilContainerListItemOuter" data-list-item-id="lg_div_4646496">
              <div class="ilContainerListItemIcon"><img alt="Inline Datei" class="ilListItemIcon" src="icon.svg" /></div>
              <div class="ilContainerListItemContent"><div class="il_ContainerListItem">
                <h3 class="il_ContainerItemTitle"><a href="https://ilias3.uni-stuttgart.de/ilias.php?baseClass=ilrepositorygui&amp;cmdClass=ilObjFileGUI&amp;cmd=sendfile&amp;ref_id=4646496">Syllabus_-_Einfuehrung_in_die_formale_Logik</a></h3>
                <div class="ilListItemSection il_ItemProperties">
                  <span class="il_ItemProperty">pdf&nbsp;&nbsp;</span>
                  <span class="il_ItemProperty">560.22 KB&nbsp;&nbsp;</span>
                  <span class="il_ItemProperty">12. Okt 2026, 12:09&nbsp;&nbsp;</span>
                  <span class="il_ItemProperty">Anzahl Seiten: 4&nbsp;&nbsp;</span>
                </div>
              </div></div>
            </div>
          </li>
          <li id="item_row__other-4643172" class="ilCLI ilObjListRow">
            <div class="ilContainerListItemOuter" data-list-item-id="lg_div_4643172">
              <div class="ilContainerListItemIcon"><img alt="Gruppe" class="ilListItemIcon" src="icon.svg" /></div>
              <div class="ilContainerListItemContent"><div class="il_ContainerListItem">
                <h3 class="il_ContainerItemTitle"><a href="https://ilias3.uni-stuttgart.de/go/grp/4643172" class="il_ContainerItemTitle">Tutorium 1: Montag, 15.45 Uhr bei Lea Heim</a></h3>
                <div class="ilListItemSection il_Description">Raum: M11.71</div>
                <div class="ilListItemSection il_ItemProperties">
                  <span class="il_ItemProperty">Anmeldungsende: 30. Nov 2026, 10:12&nbsp;&nbsp;</span>
                  <span class="il_ItemProperty">Keine freien Plätze verfügbar&nbsp;&nbsp;</span>
                </div>
              </div></div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</body></html>`;

const MEMBERS_PAGE = `<!doctype html><html><head><title>Mitglieder: Tutorium 1</title></head><body>
  <h1 class="il-page-content-header media-heading ilHeader ">Tutorium 1</h1>
  <div class="il-deck"><div class="row row-eq-height">
    <div class="col-xs-6"><div class="il-card thumbnail">
      <div class="il-card-image-container">
        <a href="ilias.php?baseClass=ilrepositorygui&amp;cmdClass=ilPublicUserProfileGUI&amp;ref_id=4642950&amp;user=5855743">
          <img src="avatar.png" class="img-standard" alt="Öffnen Lea Heim" />
        </a>
      </div>
      <div class="caption card-title">
        <a href="ilias.php?baseClass=ilrepositorygui&amp;cmdClass=ilPublicUserProfileGUI&amp;ref_id=4642950&amp;user=5855743">Lea Heim</a>
      </div>
      <div class="caption"><dl>
        <dt>Anmeldename</dt>
        <dd>LeaHeim</dd>
        <dt>Zuständigkeit</dt>
        <dd>Kontaktperson</dd>
      </dl></div>
    </div></div>
    <div class="col-xs-6"><div class="il-card thumbnail">
      <div class="il-card-image-container"><img src="avatar.png" class="img-standard" alt="" /></div>
      <div class="caption card-title">Nicht freigegeben</div>
      <div class="caption"><dl>
        <dt>Anmeldename</dt>
        <dd>VivianEichholz</dd>
      </dl></div>
    </div></div>
    <div class="col-xs-6"><div class="il-card thumbnail">
      <div class="il-card-image-container"><img src="avatar.png" class="img-standard" alt="" /></div>
      <div class="caption card-title">
        <a href="ilias.php?baseClass=ilrepositorygui&amp;cmdClass=ilPublicUserProfileGUI&amp;ref_id=4642950&amp;user=4437291">Eros Steiner</a>
      </div>
      <div class="caption"><dl>
        <dt>Anmeldename</dt>
        <dd>ErosSteiner</dd>
      </dl></div>
    </div></div>
  </div></div>
</body></html>`;

function page(action = 'http://127.0.0.1/login', extra = '') {
  return LOGIN_FORM.replaceAll('__ACTION__', action).replace('</body>', `${extra}</body>`);
}

const servers = [];
after(() => {
  for (const server of servers) server.close();
});

async function startIlias() {
  const requests = [];
  const server = createServer((request, response) => {
    let raw = '';
    request.on('data', (chunk) => {
      raw += chunk;
    });
    request.on('end', () => {
      const url = request.url ?? '/';
      requests.push({ method: request.method, url, cookie: request.headers.cookie ?? '', body: raw });
      if (url === '/start') {
        response.writeHead(200, { 'Content-Type': 'text/html', 'Set-Cookie': 'PHPSESSID=pre-login; Path=/' });
        response.end(page(`${base}/login`));
      } else if (url === '/login' && request.method === 'POST') {
        if (raw.includes('correct')) {
          response.writeHead(302, { Location: `${base}/ilias.php?baseClass=ilDashboardGUI&cmd=jumpToSelectedItems`, 'Set-Cookie': 'PHPSESSID=session-abc; Path=/; HttpOnly' });
          response.end();
        } else {
          response.writeHead(200, { 'Content-Type': 'text/html' });
          response.end(page(`${base}/login`, '<div class="alert alert-danger">Anmeldename oder Passwort ist ungültig.</div>'));
        }
      } else if (url.startsWith('/ilias.php') && url.includes('ilDashboardGUI')) {
        if ((request.headers.cookie ?? '').includes('PHPSESSID=session-abc')) {
          response.writeHead(200, { 'Content-Type': 'text/html' });
          response.end(DASHBOARD);
        } else {
          response.writeHead(200, { 'Content-Type': 'text/html' });
          response.end(page(`${base}/login`));
        }
      } else {
        response.writeHead(404);
        response.end();
      }
    });
  });
  const base = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
  servers.push(server);
  return { base, requests };
}

beforeEach(() => {
  resetDbForTests();
  delete process.env.ILIAS_SESSION_COOKIE;
  delete process.env.ILIAS_ACCOUNT;
});

test('login form is read from the real field names', () => {
  const form = parseIliasLoginForm(page());
  assert.equal(form.usernameField, 'login_form/input_3/input_4');
  assert.equal(form.passwordField, 'login_form/input_3/input_5');
  assert.equal(form.method, 'POST');
  assert.match(form.action, /\/login$/);
  assert.equal(form.inputs.find((input) => input.name === 'login_form/input_1').value, 'csrf');
});

test('dashboard blocks become courses, groups, news, and mail', () => {
  const dashboard = parseIliasDashboard(DASHBOARD, '2026-10-20T20:00:00.000Z');
  assert.equal(dashboard.account, 'OliverMolnar');
  assert.equal(dashboard.name, 'Oliver Molnar');
  assert.deepEqual(dashboard.counts, {
    memberships: 3,
    courses: 2,
    groups: 1,
    news: 1,
    mails: 1,
    unreadMails: 4,
    tasks: 0,
  });
  assert.equal(dashboard.memberships[0].group, 'Einführung in die Geschichte der Philosophie');
  assert.equal(dashboard.courses[0].title, 'Basic Phonetics & Phonology (B) (WiSe 2026/27)');
  assert.equal(dashboard.courses[0].refId, 4582895);
  assert.equal(dashboard.news[0].newsId, 3907532);
  assert.match(dashboard.news[0].url, /^https:\/\/ilias3\.uni-stuttgart\.de\/ilias\.php/);
  assert.equal(dashboard.mails[0].mailId, 47225318);
  assert.equal(dashboard.mails[0].date, '15. Okt 2026, 19:06');
});

test('course content rows become materials, folders, and groups', () => {
  const content = parseIliasContent(CONTENT_PAGE, { refId: 4590579, kind: 'crs', fetchedAt: '2026-10-22T09:00:00.000Z' });
  assert.equal(content.refId, 4590579);
  assert.equal(content.kind, 'crs');
  assert.equal(content.title, 'Einführung in die formale Logik');
  assert.equal(content.description, 'Vorlesung im Wintersemester');
  assert.equal(content.items.length, 3);

  const file = content.items[0];
  assert.equal(file.kind, 'file');
  assert.equal(file.refId, 4665501);
  assert.equal(file.title, 'Regelübersicht_-_Kalkül_des_natürlichen_Schließens');
  assert.equal(file.type, 'pdf');
  assert.equal(file.size, '146.22 KB');
  assert.equal(file.date, 'Heute, 11:05');
  assert.equal(file.pages, '2');
  assert.equal(file.downloadable, true);
  assert.match(file.url, /cmd=sendfile/);

  const group = content.items[2];
  assert.equal(group.kind, 'grp');
  assert.equal(group.refId, 4643172);
  assert.equal(group.type, 'Gruppe');
  assert.equal(group.description, 'Raum: M11.71');
  assert.equal(group.downloadable, false);

  assert.match(content.membersUrl, /cmdClass=ilusersgallerygui/);
  assert.match(content.membersUrl, /ref_id=4590579/);
});

test('members tabs list the tutor first and keep hidden names readable', () => {
  const members = parseIliasMembers(MEMBERS_PAGE, { refId: 4642950, kind: 'grp', fetchedAt: '2026-10-22T09:00:00.000Z' });
  assert.equal(members.refId, 4642950);
  assert.equal(members.kind, 'grp');
  assert.equal(members.title, 'Tutorium 1');
  assert.equal(members.members.length, 3);

  const [tutor, hidden, named] = members.members;
  assert.equal(tutor.name, 'Lea Heim');
  assert.equal(tutor.username, 'LeaHeim');
  assert.equal(tutor.role, 'Kontaktperson');
  assert.equal(tutor.roleKind, 'tutor');
  assert.match(tutor.profileUrl, /ilPublicUserProfileGUI/);

  // "Nicht freigegeben" still names the member through the login.
  assert.equal(hidden.name, 'Vivian Eichholz');
  assert.equal(hidden.username, 'VivianEichholz');
  assert.equal(hidden.roleKind, 'participant');
  assert.equal(hidden.hidden, true);

  assert.equal(named.name, 'Eros Steiner');
  assert.equal(named.roleKind, 'participant');
});

test('members read the members tab with the session cookie', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(String(url));
    return { status: 200, ok: true, headers: { get: () => null }, text: async () => MEMBERS_PAGE };
  };
  const members = await fetchIliasMembers({
    cookie: 'session-abc',
    refId: 4642950,
    kind: 'grp',
    membersUrl: 'https://ilias3.uni-stuttgart.de/ilias.php?baseClass=ilrepositorygui&cmdClass=ilusersgallerygui&cmd=view&ref_id=4642950',
    fetchImpl,
  });
  assert.equal(members.members.length, 3);
  assert.equal(members.members[0].roleKind, 'tutor');
  assert.match(requested[0], /ilusersgallerygui/);

  await assert.rejects(
    () =>
      fetchIliasMembers({
        cookie: 'session-abc',
        refId: 4642950,
        kind: 'grp',
        membersUrl: 'https://example.com/members',
        fetchImpl,
      }),
    (error) => error.status === 400 && error.message === 'ilias_url_invalid',
  );
});

test('content reads use the session cookie and report an expired session', async () => {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(request.url === '/expired' ? LOGIN_FORM.replaceAll('__ACTION__', '/login') : CONTENT_PAGE);
  });
  const base = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
  try {
    const content = await fetchIliasContent({ cookie: 'session-abc', refId: 4590579, kind: 'crs', contentUrl: `${base}/course` });
    assert.equal(content.items.length, 3);
    await assert.rejects(
      () => fetchIliasContent({ cookie: 'session-abc', refId: 4590579, kind: 'crs', contentUrl: `${base}/expired` }),
      (error) => error.status === 401 && error.message === 'ilias_session_expired',
    );
    await assert.rejects(
      () => fetchIliasContent({ cookie: 'session-abc', refId: 0 }),
      (error) => error.status === 400 && error.message === 'ilias_ref_id_invalid',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('file downloads keep bytes, type, and filename and detect login pages', async () => {
  const bytes = Buffer.from('%PDF-1.4 test');
  const server = createServer((request, response) => {
    if (request.url === '/login') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(LOGIN_FORM.replaceAll('__ACTION__', '/login'));
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Regeluebersicht.pdf"; filename*=UTF-8\'\'Regel%C3%BCbersicht.pdf',
    });
    response.end(bytes);
  });
  const base = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
  try {
    const file = await fetchIliasFile({ cookie: 'session-abc', refId: 4665501, fileUrl: `${base}/file` });
    assert.equal(file.contentType, 'application/pdf');
    assert.equal(file.filename, 'Regelübersicht.pdf');
    assert.deepEqual(file.bytes, bytes);
    await assert.rejects(
      () => fetchIliasFile({ cookie: 'session-abc', refId: 4665501, fileUrl: `${base}/login` }),
      (error) => error.status === 401 && error.message === 'ilias_session_expired',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('cookie helpers never double-prefix and mask secrets', () => {
  assert.equal(normalizeIliasCookie('abc'), 'ilClientId=Uni_Stuttgart; PHPSESSID=abc');
  assert.equal(normalizeIliasCookie('ilClientId=Uni_Stuttgart; PHPSESSID=abc'), 'ilClientId=Uni_Stuttgart; PHPSESSID=abc');
  assert.equal(mask('secret-value').includes('secret'), false);
  assert.equal(looksLikeIliasLogin(LOGIN_FORM), true);
  assert.equal(looksLikeIliasLogin(DASHBOARD), false);
});

test('the ILIAS login name is the mail address before the @', () => {
  assert.equal(iliasLoginName('st206509@stud.uni-stuttgart.de'), 'st206509');
  assert.equal(iliasLoginName('  st206509  '), 'st206509');
  assert.equal(iliasLoginName('OliverMolnar'), 'OliverMolnar');
  assert.equal(iliasLoginName(''), '');
  assert.equal(iliasLoginName(null), '');
});

test('the standard login follows the redirect and parses the dashboard', async () => {
  const running = await startIlias();
  const result = await loginIlias({ account: 'st206509@stud.uni-stuttgart.de', password: 'correct', loginUrl: `${running.base}/start` });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.reason, 'signed-in');
  assert.equal(result.cookie, 'session-abc');
  assert.equal(result.account, 'st206509');
  assert.equal(result.dashboard.account, 'OliverMolnar');
  assert.equal(result.dashboard.counts.memberships, 3);
  assert.deepEqual(result.steps, ['login-form', 'post-302', 'redirected', 'dashboard']);
  const post = running.requests.find((request) => request.url === '/login' && request.method === 'POST');
  assert.match(post.body, /st206509/);
  assert.doesNotMatch(post.body, /@stud\.uni-stuttgart\.de/);
  assert.match(post.body, /correct/);
  assert.equal(post.cookie.includes('PHPSESSID=pre-login'), true);
  assert.equal(JSON.stringify(result).includes('correct'), false);
});

test('a rejected password re-renders the form with an error', async () => {
  const running = await startIlias();
  const result = await loginIlias({ account: 'st206509', password: 'wrong', loginUrl: `${running.base}/start` });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'rejected');
  assert.match(result.rejection, /ungültig/i);
  assert.equal(JSON.stringify(result).includes('wrong'), false);
});

test('dashboard reads need a live PHPSESSID and map an expired session to 401', async () => {
  const running = await startIlias();
  const dashboard = await fetchIliasDashboard({ cookie: 'session-abc', fetchImpl: fetch, dashboardUrl: `${running.base}/ilias.php?baseClass=ilDashboardGUI&cmd=jumpToSelectedItems` });
  assert.equal(dashboard.counts.courses, 2);
  await assert.rejects(
    () => fetchIliasDashboard({ cookie: 'expired', dashboardUrl: `${running.base}/ilias.php?baseClass=ilDashboardGUI&cmd=jumpToSelectedItems` }),
    (error) => error.status === 401 && error.message === 'ilias_session_expired',
  );
});

test('stored source and snapshot survive without the cookie', () => {
  resetDbForTests();
  saveIliasSource('usr_1', 'browser', 'st206509');
  saveIliasSnapshot('usr_1', parseIliasDashboard(DASHBOARD, '2026-10-20T20:00:00.000Z'));
  assert.deepEqual(loadIliasSource('usr_1'), { source: 'browser', account: 'st206509', updatedAt: loadIliasSource('usr_1').updatedAt });
  const snapshot = loadIliasSnapshot('usr_1');
  assert.equal(snapshot.dashboard.counts.courses, 2);
  assert.equal(snapshot.fetchedAt !== null, true);

  setUserIliasSession('usr_1', { cookie: 'session-abc', account: 'st206509', source: 'browser' });
  assert.equal(publicIliasStatus('usr_1').sessionActive, true);
  assert.equal(JSON.stringify(publicIliasStatus('usr_1')).includes('session-abc'), false);
  disconnectIlias('usr_1');
  assert.equal(publicIliasStatus('usr_1').sessionActive, false);
  assert.equal(loadIliasSource('usr_1'), null);
  clearUserIliasSession('usr_1');
  const silent = new CookieJar();
  assert.equal(silent.header(), '');
});

test('the admin layer sees the connection, counts, and a disconnect action', async () => {
  resetDbForTests();
  const auth = await import('./auth.mjs');
  const admin = await import('./admin/index.mjs');
  const created = auth.createUserSession({ account: 'st778899', name: 'ILIAS Admin', mode: 'local' });
  auth.linkPlatform(created.user.id, { platform: 'ilias', account: 'st778899', status: 'connected', source: 'browser' });
  saveIliasSource(created.user.id, 'browser', 'st778899');
  saveIliasSnapshot(created.user.id, parseIliasDashboard(DASHBOARD, '2026-10-20T20:00:00.000Z'));
  setUserIliasSession(created.user.id, { cookie: 'session-abc', account: 'st778899', source: 'browser' });

  const list = admin.adminIlias();
  assert.equal(list.activeSessions, 1);
  assert.equal(list.totals.memberships, 3);
  assert.equal(list.users[0].account, 'st778899');
  assert.equal(list.users[0].active, true);
  assert.equal(JSON.stringify(list).includes('session-abc'), false);

  const detail = admin.adminUserDetail(created.user.id);
  assert.equal(detail.ilias.active, true);
  assert.equal(detail.ilias.counts.courses, 2);
  assert.equal(detail.ilias.dashboard.mails[0].mailId, 47225318);

  admin.disconnectAdminIlias(created.user.id);
  const after = admin.adminIlias();
  assert.equal(after.activeSessions, 0);
  assert.equal(after.totals.memberships, 3, 'the stored snapshot stays readable');
  assert.equal(auth.getUser(created.user.id).platforms.find((item) => item.id === 'ilias').status, 'linked');
  assert.equal(admin.listAdminAudit({ action: 'ilias.disconnect' }).entries.length, 1);
});

test('the admin layer browses course content and downloads files for an active session', async () => {
  resetDbForTests();
  const auth = await import('./auth.mjs');
  const admin = await import('./admin/index.mjs');
  const created = auth.createUserSession({ account: 'st445566', name: 'ILIAS Content Admin', mode: 'local' });
  setUserIliasSession(created.user.id, { cookie: 'session-abc', account: 'st445566', source: 'browser' });
  saveIliasSource(created.user.id, 'browser', 'st445566');

  const bytes = Buffer.from('%PDF-1.4 admin');
  const server = createServer((request, response) => {
    if (request.url === '/file') {
      response.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Syllabus.pdf"',
      });
      response.end(bytes);
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(CONTENT_PAGE);
  });
  const base = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
  try {
    const content = await admin.readAdminUserIliasContent(
      created.user.id,
      { refId: 4590579, kind: 'crs', contentUrl: `${base}/course` },
    );
    assert.equal(content.title, 'Einführung in die formale Logik');
    assert.equal(content.items.length, 3);
    assert.equal(content.items[0].kind, 'file');

    const file = await admin.readAdminUserIliasFile(created.user.id, { refId: 4665501, fileUrl: `${base}/file` });
    assert.equal(file.contentType, 'application/pdf');
    assert.equal(file.filename, 'Syllabus.pdf');
    assert.deepEqual(file.bytes, bytes);

    const detail = admin.adminUserDetail(created.user.id);
    assert.equal(detail.ilias.canRead, true);
    assert.equal(detail.ilias.active, true);
    const list = admin.adminIlias();
    assert.equal(list.users.find((entry) => entry.id === created.user.id).canRead, true);
    assert.equal(JSON.stringify(content).includes('session-abc'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('the admin layer lists course and group members for an active session', async () => {
  resetDbForTests();
  const auth = await import('./auth.mjs');
  const admin = await import('./admin/index.mjs');
  const created = auth.createUserSession({ account: 'st445566', name: 'ILIAS Members Admin', mode: 'local' });
  setUserIliasSession(created.user.id, { cookie: 'session-abc', account: 'st445566', source: 'browser' });

  const fetchImpl = async () => ({ status: 200, ok: true, headers: { get: () => null }, text: async () => MEMBERS_PAGE });
  const members = await admin.readAdminUserIliasMembers(
    created.user.id,
    {
      refId: 4642950,
      kind: 'grp',
      membersUrl: 'https://ilias3.uni-stuttgart.de/ilias.php?baseClass=ilrepositorygui&cmdClass=ilusersgallerygui&cmd=view&ref_id=4642950',
    },
    fetchImpl,
  );
  assert.equal(members.members.length, 3);
  assert.equal(members.members[0].roleKind, 'tutor');
  assert.equal(members.members[1].hidden, true);
  assert.equal(JSON.stringify(members).includes('session-abc'), false);
});

test('client-harvested pages are stored and served without a server-side ILIAS read', async () => {
  resetDbForTests();
  const auth = await import('./auth.mjs');
  const created = auth.createUserSession({ account: 'st112233', name: 'Cache User', mode: 'local' });
  setUserIliasSession(created.user.id, { cookie: 'session-abc', account: 'st112233', source: 'browser' });

  // A dashboard harvested by the app is parsed and kept.
  const ingested = ingestIliasPage(created.user.id, {
    page: 'dashboard',
    html: DASHBOARD,
    url: 'https://ilias3.uni-stuttgart.de/ilias.php?baseClass=ilDashboardGUI',
    fetchedAt: new Date().toISOString(),
  });
  assert.equal(ingested.page, 'dashboard');
  assert.equal(ingested.dashboard.counts.courses, 2);

  const cached = cachedIliasDashboard(created.user.id);
  assert.equal(cached.cached, true);
  assert.equal(cached.stale, false);
  assert.equal(cached.dashboard.counts.memberships, 3);
  assert.equal(JSON.stringify(cached).includes('session-abc'), false);

  // A page that was never harvested is a miss, not a live read.
  assert.throws(
    () => cachedIliasContent(created.user.id, { refId: 4590579, kind: 'crs' }),
    (error) => error.status === 404 && error.message === 'ilias_cache_miss',
  );

  const content = ingestIliasPage(created.user.id, {
    page: 'content',
    refId: 4590579,
    kind: 'crs',
    html: CONTENT_PAGE,
    url: 'https://ilias3.uni-stuttgart.de/go/crs/4590579',
    fetchedAt: new Date().toISOString(),
  });
  assert.equal(content.page, 'content');
  assert.equal(content.content.items.length, 3);
  const storedContent = cachedIliasContent(created.user.id, { refId: 4590579, kind: 'crs' });
  assert.equal(storedContent.content.title, 'Einführung in die formale Logik');
  assert.equal(storedContent.content.membersUrl, content.content.membersUrl);
  assert.equal(storedContent.stale, false);

  assert.throws(
    () => cachedIliasMembers(created.user.id, { refId: 4590579, kind: 'crs' }),
    (error) => error.status === 404 && error.message === 'ilias_cache_miss',
  );
  const members = ingestIliasPage(created.user.id, {
    page: 'members',
    refId: 4590579,
    kind: 'crs',
    html: MEMBERS_PAGE,
    url: 'https://ilias3.uni-stuttgart.de/ilias.php?baseClass=ilrepositorygui&ref_id=4590579',
    fetchedAt: new Date().toISOString(),
  });
  assert.equal(members.page, 'members');
  assert.equal(members.members.members.length, 3);
  assert.equal(members.members.members[0].roleKind, 'tutor');
  assert.equal(cachedIliasMembers(created.user.id, { refId: 4590579, kind: 'crs' }).members.members.length, 3);

  ingestIliasPage(created.user.id, {
    page: 'content',
    refId: 4643172,
    kind: 'grp',
    html: CONTENT_PAGE,
    fetchedAt: '2020-01-01T00:00:00.000Z',
  });
  assert.equal(cachedIliasContent(created.user.id, { refId: 4643172, kind: 'grp' }).stale, true);

  // A login page means the WebView session is gone and must not be cached.
  assert.throws(
    () => ingestIliasPage(created.user.id, { page: 'dashboard', html: LOGIN_FORM }),
    (error) => error.status === 401 && error.message === 'ilias_session_expired',
  );
});

test('the HTTP layer ingests, caches, and hands back the WebView cookie', async () => {
  resetDbForTests();
  const auth = await import('./auth.mjs');
  const created = auth.createUserSession({ account: 'st445577', name: 'Route Cache', mode: 'local' });
  setUserIliasSession(created.user.id, { cookie: 'session-abc', account: 'st445577', source: 'browser' });
  saveIliasSource(created.user.id, 'browser', 'st445577');
  const headers = { Authorization: `Bearer ${created.token}`, 'Content-Type': 'application/json' };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (!(await handleIlias(request, response, url))) {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
    }
  });
  const base = await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
  try {
    const session = await fetch(`${base}/v1/ilias/session`, { headers });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).cookies, 'ilClientId=Uni_Stuttgart; PHPSESSID=session-abc');

    const before = await fetch(`${base}/v1/ilias/dashboard`, { headers });
    assert.equal(before.status, 404);
    assert.equal((await before.json()).error, 'ilias_cache_miss');

    const post = await fetch(`${base}/v1/ilias/ingest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page: 'dashboard', html: DASHBOARD, url: 'https://ilias3.uni-stuttgart.de/' }),
    });
    assert.equal(post.status, 200);
    const posted = await post.json();
    assert.equal(posted.counts.courses, 2);
    assert.equal(posted.cached, false);

    const dashboard = await fetch(`${base}/v1/ilias/dashboard`, { headers });
    assert.equal(dashboard.status, 200);
    const body = await dashboard.json();
    assert.equal(body.counts.memberships, 3);
    assert.equal(body.cached, true);
    assert.equal(body.stale, false);
    assert.equal(JSON.stringify(body).includes('session-abc'), false);

    const contentIngest = await fetch(`${base}/v1/ilias/ingest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page: 'content', refId: 4590579, kind: 'crs', html: CONTENT_PAGE }),
    });
    assert.equal(contentIngest.status, 200);
    assert.equal((await contentIngest.json()).items.length, 3);

    const content = await fetch(`${base}/v1/ilias/content?refId=4590579&kind=crs`, { headers });
    assert.equal(content.status, 200);
    const contentBody = await content.json();
    assert.equal(contentBody.items.length, 3);
    assert.equal(contentBody.cached, true);
    assert.equal(contentBody.stale, false);
    assert.match(contentBody.membersUrl, /ilusersgallerygui/);

    const membersIngest = await fetch(`${base}/v1/ilias/ingest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page: 'members', refId: 4590579, kind: 'crs', html: MEMBERS_PAGE }),
    });
    assert.equal(membersIngest.status, 200);
    assert.equal((await membersIngest.json()).members.length, 3);

    const members = await fetch(`${base}/v1/ilias/members?refId=4590579&kind=crs`, { headers });
    assert.equal(members.status, 200);
    const membersBody = await members.json();
    assert.equal(membersBody.members.length, 3);
    assert.equal(membersBody.members[0].roleKind, 'tutor');
    assert.equal(membersBody.cached, true);

    // A harvested login page tells the app to report the dead session; the
    // stored rows stay readable and the source marker survives for reconnect.
    const expired = await fetch(`${base}/v1/ilias/session/expired`, { method: 'POST', headers });
    assert.equal(expired.status, 200);
    const expiredBody = await expired.json();
    assert.equal(expiredBody.status.sessionActive, false);
    assert.equal(expiredBody.status.account, 'st445577');
    assert.equal((await fetch(`${base}/v1/ilias/dashboard`, { headers })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
