import { Platform } from 'react-native';

/**
 * Page scripts and cookie reads shared by the two browser sign-in paths: the
 * visible "adopt sign-in" beta modal and the automated credential sign-in.
 */

export const CAMPUS_START_URL = 'https://campus.uni-stuttgart.de/cusonline/';
export const CAMPUS_COOKIE_URL = 'https://campus.uni-stuttgart.de/cusonline/';

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

/**
 * Fill the university sign-in form with the vaulted credential and submit it.
 * Runs after every navigation of the automated WebView and on a short poll, so
 * a form the SPA renders late is still reached. It only ever touches a password
 * field, prefers the named Shibboleth/CAMPUSonline fields, clicks a "sign in"
 * call to action on the C@MPUS host when the login sits behind one, waits
 * between submits, and gives up after a few so a wrong password cannot loop.
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
    function visible(el){
      if (!el) return false;
      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      var style = getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
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
    function signedIn(){
      try { if (localStorage.getItem('cusonline_co.login.accessToken')) return true; } catch (e) {}
      return location.href.indexOf('/desktop/') >= 0;
    }
    function counter(key){ try { return Number(sessionStorage.getItem(key) || '0'); } catch (e) { return 0; } }
    function bump(key){ try { sessionStorage.setItem(key, String(counter(key) + 1)); } catch (e) {} }
    function stamp(key){ try { sessionStorage.setItem(key, String(Date.now())); } catch (e) {} }

    // A new attempt starts with clean counters for this origin.
    try {
      if (sessionStorage.getItem('campus_autofill_run') !== runId) {
        sessionStorage.setItem('campus_autofill_run', runId);
        sessionStorage.removeItem('campus_autofill_submits');
        sessionStorage.removeItem('campus_autofill_clicks');
        sessionStorage.removeItem('campus_autofill_last');
      }
    } catch (e) {}

    if (signedIn()) { post({ step: 'signed-in' }); return true; }

    var passwordField = null;
    var passwords = document.querySelectorAll('input[type=password]');
    for (var i = 0; i < passwords.length; i++) {
      if (visible(passwords[i])) { passwordField = passwords[i]; break; }
    }

    if (passwordField) {
      if (counter('campus_autofill_submits') >= 3) { post({ step: 'too-many-attempts' }); return true; }
      var lastSubmit = counter('campus_autofill_last');
      if (lastSubmit && Date.now() - lastSubmit < 5000) { post({ step: 'waiting' }); return true; }
      var form = passwordField.form || passwordField.closest('form');
      var named = document.querySelector('input[name=j_username],input[name=username],input[name=user],input[name=userid],input[name=login],input[type=email]');
      var userField = (named && visible(named)) ? named : null;
      if (!userField && form) {
        var texts = form.querySelectorAll('input[type=text],input:not([type])');
        for (var t = 0; t < texts.length; t++) { if (visible(texts[t])) { userField = texts[t]; break; } }
      }
      if (userField) setValue(userField, account);
      setValue(passwordField, password);
      var submit = null;
      if (form) submit = form.querySelector('input[type=submit],button[type=submit],button:not([type])');
      if (!submit) submit = document.querySelector('[name=_eventId_proceed],#loginButton,button[type=submit],input[type=submit]');
      bump('campus_autofill_submits');
      stamp('campus_autofill_last');
      post({ step: 'filled' });
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

    // No password field yet. On the C@MPUS host the login may sit behind a
    // "sign in" control that starts the SSO redirect.
    if (location.hostname.indexOf('campus.uni-stuttgart.de') >= 0) {
      if (counter('campus_autofill_clicks') < 4) {
        var nodes = document.querySelectorAll('a,button,[role=button]');
        for (var n = 0; n < nodes.length; n++) {
          var text = (nodes[n].textContent || '').trim().toLowerCase();
          if (/^(anmelden|login|log in|sign in|sign-in|sso|shibboleth)( |$)/.test(text) && visible(nodes[n])) {
            var target = nodes[n];
            bump('campus_autofill_clicks');
            post({ step: 'cta-click' });
            setTimeout(function(){ try { target.click(); } catch (e) {} }, 200);
            return true;
          }
        }
      }
    }

    var visiblePasswords = 0;
    for (var v = 0; v < passwords.length; v++) { if (visible(passwords[v])) visiblePasswords += 1; }
    post({
      step: 'no-form',
      passwordInputs: passwords.length,
      visiblePasswordInputs: visiblePasswords,
      formCount: document.querySelectorAll('form').length,
      readyState: String(document.readyState)
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

export interface NativeCookies {
  header: string;
  names: string[];
}

export const NO_NATIVE_COOKIES: NativeCookies = { header: '', names: [] };

/**
 * Read the cookie store of the WebView natively. `document.cookie` never shows
 * `HttpOnly` cookies, and C@MPUS needs `PSESSIONID` (HttpOnly) next to the
 * bearer token. On iOS that store is the WebKit one the WebView itself uses.
 */
export async function readNativeCampusCookies(): Promise<NativeCookies> {
  if (Platform.OS === 'web') return NO_NATIVE_COOKIES;
  try {
    const { default: CookieManager } = await import('@preeternal/react-native-cookie-manager');
    const cookies = await CookieManager.getAsArray(
      CAMPUS_COOKIE_URL,
      Platform.OS === 'ios' ? { iosCookieStore: 'webKit' } : undefined,
    );
    return {
      header: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
      names: cookies.map((cookie) => cookie.name),
    };
  } catch (caught) {
    console.info('[campus-cookies] native read failed', caught instanceof Error ? caught.message : String(caught));
    return NO_NATIVE_COOKIES;
  }
}

/** Join cookie strings; the first value per name wins, so the native store fills the HttpOnly gaps. */
export function mergeCookieStrings(...parts: string[]): string {
  const seen = new Set<string>();
  const pairs: string[] = [];
  for (const part of parts) {
    for (const pair of part.split(';')) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const separator = trimmed.indexOf('=');
      const name = (separator > 0 ? trimmed.slice(0, separator) : trimmed).trim().toLowerCase();
      if (seen.has(name)) continue;
      seen.add(name);
      pairs.push(trimmed);
    }
  }
  return pairs.join('; ');
}
