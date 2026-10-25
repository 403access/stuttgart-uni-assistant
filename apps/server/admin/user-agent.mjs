/**
 * Small User-Agent reader for the admin device list.
 *
 * The QR flow stores the raw header. This module turns it into the few fields
 * an operator actually needs: form factor, operating system, browser, device
 * model, and rendering engine. It intentionally covers the common browsers and
 * falls back to `unknown` instead of guessing.
 */

const BOT = /(?:bot|crawler|spider|crawling|slurp|facebookexternalhit|embedly|quora link preview|pinterest|slackbot|twitterbot|discordbot|telegrambot|headlesschrome|lighthouse|curl\/|wget\/|python-requests|go-http-client|axios\/|node-fetch|undici)/i;
const TABLET = /iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i;
const MOBILE = /iPhone|iPod|Windows Phone|IEMobile|BlackBerry|BB10|webOS|Opera Mini|Android.*Mobile/i;

function matchVersion(value, pattern) {
  const match = pattern.exec(value);
  return match ? match[1].replace(/_/g, '.') : '';
}

function readOs(ua) {
  if (/Windows Phone/i.test(ua)) {
    return { os: 'Windows Phone', osVersion: matchVersion(ua, /Windows Phone (?:OS )?([\d.]+)/i) };
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { os: 'iOS', osVersion: matchVersion(ua, /OS (\d+(?:[_.]\d+)*)/) };
  }
  if (/Android/i.test(ua)) {
    return { os: 'Android', osVersion: matchVersion(ua, /Android ([\d.]+)/i) };
  }
  if (/CrOS/i.test(ua)) {
    return { os: 'ChromeOS', osVersion: matchVersion(ua, /CrOS \w+ ([\d.]+)/i) };
  }
  if (/Mac OS X|Macintosh/i.test(ua)) {
    return { os: 'macOS', osVersion: matchVersion(ua, /Mac OS X (\d+(?:[_.]\d+)*)/i) };
  }
  if (/Windows NT/i.test(ua)) {
    const nt = matchVersion(ua, /Windows NT ([\d.]+)/i);
    const names = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.1': 'XP' };
    return { os: 'Windows', osVersion: names[nt] || nt };
  }
  if (/FreeBSD/i.test(ua)) return { os: 'FreeBSD', osVersion: '' };
  if (/OpenBSD/i.test(ua)) return { os: 'OpenBSD', osVersion: '' };
  if (/Ubuntu/i.test(ua)) return { os: 'Linux', osVersion: 'Ubuntu' };
  if (/Linux/i.test(ua)) return { os: 'Linux', osVersion: '' };
  return { os: '', osVersion: '' };
}

function readBrowser(ua) {
  if (/Edg(?:A|iOS)?\//i.test(ua)) return { browser: 'Edge', browserVersion: matchVersion(ua, /Edg(?:A|iOS)?\/([\d.]+)/i) };
  if (/OPR\/|Opera[ /]/i.test(ua)) return { browser: 'Opera', browserVersion: matchVersion(ua, /(?:OPR|Opera)[ /]([\d.]+)/i) };
  if (/SamsungBrowser\//i.test(ua)) return { browser: 'Samsung Internet', browserVersion: matchVersion(ua, /SamsungBrowser\/([\d.]+)/i) };
  if (/Firefox\/|FxiOS\//i.test(ua)) return { browser: 'Firefox', browserVersion: matchVersion(ua, /(?:Firefox|FxiOS)\/([\d.]+)/i) };
  if (/; wv\)/i.test(ua)) return { browser: 'Android WebView', browserVersion: matchVersion(ua, /Chrome\/([\d.]+)/i) };
  if (/CriOS\//i.test(ua)) return { browser: 'Chrome', browserVersion: matchVersion(ua, /CriOS\/([\d.]+)/i) };
  if (/Chrome\/|Chromium\//i.test(ua)) return { browser: 'Chrome', browserVersion: matchVersion(ua, /(?:Chrome|Chromium)\/([\d.]+)/i) };
  if (/Version\/[\d.]+.*Safari\//i.test(ua)) return { browser: 'Safari', browserVersion: matchVersion(ua, /Version\/([\d.]+)/i) };
  if (/MSIE |Trident\//i.test(ua)) return { browser: 'Internet Explorer', browserVersion: matchVersion(ua, /(?:MSIE |rv:)([\d.]+)/i) };
  if (/curl\//i.test(ua)) return { browser: 'curl', browserVersion: matchVersion(ua, /curl\/([\d.]+)/i) };
  if (/Wget\//i.test(ua)) return { browser: 'Wget', browserVersion: matchVersion(ua, /Wget\/([\d.]+)/i) };
  if (/python-requests\//i.test(ua)) return { browser: 'python-requests', browserVersion: matchVersion(ua, /python-requests\/([\d.]+)/i) };
  return { browser: '', browserVersion: '' };
}

function readDeviceModel(ua, type) {
  if (/iPad/i.test(ua)) return 'iPad';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPod/i.test(ua)) return 'iPod';
  if (/Windows Phone/i.test(ua)) return 'Windows Phone';
  if (/Android/i.test(ua)) {
    const match = /Android [^;]+;\s*(?:[a-z]{2}[-_][A-Z]{2};\s*)?([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/i.exec(ua);
    const model = match ? match[1].trim() : '';
    return model && !/^(?:wv|Mobile|Tablet)$/i.test(model) ? model : 'Android';
  }
  if (/CrOS/i.test(ua)) return 'Chromebook';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows NT/i.test(ua)) return 'PC';
  if (/Linux/i.test(ua)) return 'Linux-PC';
  return type === 'bot' ? '' : '';
}

function readType(ua) {
  if (!ua) return 'unknown';
  if (BOT.test(ua)) return 'bot';
  if (TABLET.test(ua)) return 'tablet';
  if (MOBILE.test(ua)) return 'mobile';
  return 'desktop';
}

function readEngine(ua, browser) {
  if (browser === 'Firefox') return 'Gecko';
  if (browser === 'Safari' || /iPhone|iPad|iPod/i.test(ua)) return 'WebKit';
  if (browser === 'Internet Explorer') return 'Trident';
  if (browser === 'Edge' || browser === 'Chrome' || browser === 'Opera' || browser === 'Samsung Internet' || browser === 'Android WebView') return 'Blink';
  return '';
}

/** Parse one User-Agent header into stable, display-ready fields. */
export function parseUserAgent(value) {
  const ua = String(value ?? '').trim();
  let type = readType(ua);
  const { os, osVersion } = readOs(ua);
  const { browser, browserVersion } = readBrowser(ua);
  if (type === 'desktop' && !os && !browser) type = 'unknown';
  return {
    type,
    os,
    osVersion,
    browser,
    browserVersion,
    device: readDeviceModel(ua, type),
    engine: readEngine(ua, browser),
  };
}
