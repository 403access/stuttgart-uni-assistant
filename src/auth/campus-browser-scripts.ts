/**
 * Page scripts injected into the C@MPUS WebViews. Pure strings and builders:
 * no React Native import, so the logic is unit-testable against a DOM in Node.
 *
 * The harvest scripts run in the visible "adopt sign-in" browser. The autofill
 * script runs in the automated one and has to cope with two real login pages:
 * the CAMPUSonline Keycloak form (`#username`, `#password`, `#kc-login`) and a
 * Shibboleth form (`j_username`, `j_password`, `_eventId_proceed`).
 */

/** Harvest `document.cookie` plus both web storages; the seam the visible flow posts back. */
export const HARVEST_JS =
  "(function(){var out={cookies:'',storage:{}};" +
  "try{out.cookies=document.cookie||'';}catch(e){}" +
  'try{var i,k;' +
  "for(i=0;i<localStorage.length;i++){k=localStorage.key(i);out.storage['local:'+k]=String(localStorage.getItem(k)).slice(0,4000);}" +
  "for(i=0;i<sessionStorage.length;i++){k=sessionStorage.key(i);out.storage['session:'+k]=String(sessionStorage.getItem(k)).slice(0,4000);}" +
  '}catch(e){out.error=String(e);}' +
  'window.ReactNativeWebView.postMessage(JSON.stringify(out));' +
  'return true;})();';

export const DIAGNOSE_JS =
  '(function(){var out={diagnostic:true,url:location.href,cookies:[],local:[],session:[]};' +
  'try{out.cookies=document.cookie.split(";").map(function(c){return c.split("=")[0].trim();}).filter(Boolean);}catch(e){}' +
  'function keys(s){var r=[];try{for(var i=0;i<s.length;i++){var k=s.key(i);var v=String(s.getItem(k));r.push(k+"="+(v.length>200?v.slice(0,200)+"…(+"+(v.length-200)+")":v));}}catch(e){}return r;}' +
  'out.local=keys(localStorage);out.session=keys(sessionStorage);' +
  'window.ReactNativeWebView.postMessage(JSON.stringify(out));' +
  'return true;})();';

/** Max submits per page, and per run across all pages, so a wrong password cannot loop. */
export const HEADLESS_MAX_SUBMITS_PER_PAGE = 3;
export const HEADLESS_MAX_SUBMITS_PER_RUN = 6;
/** Milliseconds between two submits on the same page. */
export const HEADLESS_SUBMIT_COOLDOWN_MS = 5000;

/**
 * Fill the university sign-in form with the vaulted credential and submit it.
 * Runs after every navigation and on a short poll, so a form the SPA renders
 * late is still reached. It only touches a password field, prefers the named
 * Keycloak/Shibboleth username fields, clicks a "sign in" call to action when
 * the login sits behind one, waits between submits, and reports every step so a
 * stall is diagnosable from the log.
 */
export function headlessAutofillScript(account: string, password: string, runId: string): string {
  return `(function(){
  function post(extra){
    try {
      var out = { headless: true, step: 'idle' };
      for (var key in extra) out[key] = extra[key];
      out.url = location.href;
      window.ReactNativeWebView.postMessage(JSON.stringify(out));
    } catch (e) {}
  }
  try {
    var account = ${JSON.stringify(account)};
    var password = ${JSON.stringify(password)};
    var runId = ${JSON.stringify(runId)};
    var MAX_PER_PAGE = ${HEADLESS_MAX_SUBMITS_PER_PAGE};
    var MAX_PER_RUN = ${HEADLESS_MAX_SUBMITS_PER_RUN};
    var COOLDOWN_MS = ${HEADLESS_SUBMIT_COOLDOWN_MS};

    function read(key){ try { return sessionStorage.getItem(key) || ''; } catch (e) { return ''; } }
    function write(key, value){ try { sessionStorage.setItem(key, value); } catch (e) {} }
    function drop(key){ try { sessionStorage.removeItem(key); } catch (e) {} }
    function count(key){ var value = Number(read(key)); return isFinite(value) ? value : 0; }

    // A control counts as fillable when it is rendered. A hidden WebView reports
    // zero-sized rectangles for every element, so size alone cannot decide.
    function visible(el){
      if (!el) return false;
      var style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }
    function setValue(el, value){
      try {
        var descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
        if (descriptor && descriptor.set) descriptor.set.call(el, value);
        else el.value = value;
      } catch (e) { el.value = value; }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }
    function bySelector(selectors){
      for (var i = 0; i < selectors.length; i++) {
        var found = document.querySelector(selectors[i]);
        if (found && visible(found)) return found;
      }
      return null;
    }
    function tokenPresent(){
      try { return Boolean(localStorage.getItem('cusonline_co.login.accessToken')); } catch (e) { return false; }
    }

    // A new attempt starts with clean counters.
    if (read('campus_autofill_run') !== runId) {
      write('campus_autofill_run', runId);
      drop('campus_autofill_submits');
      drop('campus_autofill_total');
      drop('campus_autofill_last');
      drop('campus_autofill_clicks');
      drop('campus_autofill_url');
    }
    // A navigation is a new page: fresh per-page budget, the run budget stays.
    if (read('campus_autofill_url') !== location.href) {
      write('campus_autofill_url', location.href);
      drop('campus_autofill_submits');
      drop('campus_autofill_last');
      drop('campus_autofill_clicks');
    }

    // Only the session token means signed in: /desktop/#/login also contains
    // '/desktop/', and harvesting there adopts an empty session.
    if (tokenPresent() && location.href.indexOf('#/login') < 0) { post({ step: 'signed-in' }); return true; }

    var passwords = document.querySelectorAll('input[type=password]');
    var passwordField = null;
    for (var i = 0; i < passwords.length; i++) {
      if (visible(passwords[i])) { passwordField = passwords[i]; break; }
    }
    if (!passwordField) passwordField = passwords.length ? passwords[0] : null;

    if (passwordField) {
      var perPage = count('campus_autofill_submits');
      var perRun = count('campus_autofill_total');
      if (perPage >= MAX_PER_PAGE || perRun >= MAX_PER_RUN) {
        post({ step: 'too-many-attempts', submits: perPage, total: perRun });
        return true;
      }
      var lastSubmit = Number(read('campus_autofill_last'));
      if (lastSubmit && Date.now() - lastSubmit < COOLDOWN_MS) { post({ step: 'waiting' }); return true; }

      var form = passwordField.form || passwordField.closest('form');
      var userField = bySelector([
        'input[name=j_username]',
        'input[name=username]',
        'input#username',
        'input[name=user]',
        'input[name=userid]',
        'input[name=login][type=text]',
        'input[type=email]'
      ]);
      if (!userField && form) {
        var texts = form.querySelectorAll('input[type=text],input:not([type])');
        for (var t = 0; t < texts.length; t++) {
          if (visible(texts[t])) { userField = texts[t]; break; }
        }
        if (!userField && texts.length) userField = texts[0];
      }
      if (userField && !userField.value) setValue(userField, account);
      setValue(passwordField, password);

      var submit = bySelector([
        '#kc-login',
        'input[name=login][type=submit]',
        'input[name=_eventId_proceed]',
        '#loginButton'
      ]);
      if (!submit && form) submit = form.querySelector('input[type=submit],button[type=submit],button:not([type])');
      if (!submit) submit = document.querySelector('input[type=submit],button[type=submit]');

      write('campus_autofill_submits', String(perPage + 1));
      write('campus_autofill_total', String(perRun + 1));
      write('campus_autofill_last', String(Date.now()));
      post({ step: 'filled', user: userField ? 'yes' : 'no', submit: submit ? 'yes' : 'no' });
      setTimeout(function(){
        try {
          if (submit && submit.click) submit.click();
          else if (form && form.requestSubmit) form.requestSubmit();
          else if (form) form.submit();
          else post({ step: 'submit-failed' });
        } catch (e) { post({ step: 'submit-failed', error: String(e) }); }
      }, 400);
      return true;
    }

    // No password field: a login chooser or the C@MPUS shell may need a click.
    if (count('campus_autofill_clicks') < 4) {
      var nodes = document.querySelectorAll('a,button,[role=button],input[type=button],input[type=submit]');
      for (var n = 0; n < nodes.length; n++) {
        var label = (nodes[n].textContent || nodes[n].getAttribute('value') || '').trim().toLowerCase();
        if (/^(anmelden|login|log in|sign in|sign-in|weiter|continue|sso|shibboleth)/.test(label) && visible(nodes[n])) {
          var target = nodes[n];
          write('campus_autofill_clicks', String(count('campus_autofill_clicks') + 1));
          post({ step: 'cta-click', label: label.slice(0, 40) });
          setTimeout(function(){ try { target.click(); } catch (e) {} }, 200);
          return true;
        }
      }
    }

    var first = passwords.length ? passwords[0] : null;
    post({
      step: 'no-form',
      passwordInputs: passwords.length,
      formCount: document.querySelectorAll('form').length,
      readyState: String(document.readyState),
      passwordDisplay: first ? String(getComputedStyle(first).display) : '-',
      passwordSize: first ? String(Math.round(first.getBoundingClientRect().width) + 'x' + Math.round(first.getBoundingClientRect().height)) : '-'
    });
    return true;
  } catch (error) {
    post({ step: 'error', error: String(error) });
    return true;
  }
})();`;
}

/**
 * Debug aid for the automated sign-in: post the page structure back so the
 * selectors can be corrected against the real identity-provider form. Values of
 * password and token fields are redacted; nothing else in the form is a secret
 * the flow has not already put in the page.
 */
export function headlessDumpScript(): string {
  return `(function(){
  function redact(root){
    try {
      var inputs = root.querySelectorAll('input');
      for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        var type = (el.getAttribute('type') || '').toLowerCase();
        var name = (el.getAttribute('name') || '').toLowerCase();
        if (type === 'password' || /pass|pwd|secret|token/.test(name)) el.setAttribute('value', 'REDACTED');
      }
    } catch (e) {}
    return root;
  }
  var out = { headless: true, step: 'dump', url: location.href, title: document.title, forms: [], controls: [] };
  try {
    var forms = document.querySelectorAll('form');
    for (var f = 0; f < forms.length; f++) {
      var clone = forms[f].cloneNode(true);
      redact(clone);
      out.forms.push({
        action: forms[f].getAttribute('action'),
        method: forms[f].getAttribute('method'),
        html: clone.outerHTML.slice(0, 6000)
      });
    }
    var nodes = document.querySelectorAll('input,button,select,a[role=button]');
    for (var c = 0; c < nodes.length && out.controls.length < 60; c++) {
      var node = nodes[c];
      out.controls.push([
        node.tagName.toLowerCase(),
        node.getAttribute('type') || '',
        node.getAttribute('name') || '',
        node.getAttribute('id') || '',
        (node.textContent || '').trim().slice(0, 40)
      ].join('|'));
    }
  } catch (e) { out.error = String(e); }
  window.ReactNativeWebView.postMessage(JSON.stringify(out));
  return true;})();`;
}
