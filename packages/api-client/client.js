import { ApiError } from './errors.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * A small fetch wrapper. It knows about JSON, bearer tokens, query strings,
 * timeouts, and one error shape; it does not know about auth storage, React, or
 * any particular endpoint.
 */
export function createClient({
  baseUrl = '',
  token = null,
  fetchImpl = globalThis.fetch,
  timeoutMs = 20_000,
  credentials = 'omit',
  headers = {},
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('createClient needs a fetch implementation');

  function urlFor(path, query) {
    const suffix = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) for (const item of value) suffix.append(key, String(item));
        else suffix.set(key, String(value));
      }
    }
    const search = suffix.toString();
    if (!baseUrl) return search ? `${path}?${search}` : path;
    const url = new URL(path, baseUrl);
    url.search = search;
    return url.toString();
  }

  async function request(path, { method = 'GET', body, query, headers: extraHeaders, signal } = {}) {
    const controller = signal ? null : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    const requestHeaders = {
      Accept: 'application/json',
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    };
    const init = { method, headers: requestHeaders, credentials };
    if (body !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    if (controller) init.signal = controller.signal;
    else if (signal) init.signal = signal;

    let response;
    try {
      response = await fetchImpl(urlFor(path, query), init);
    } catch (error) {
      const aborted = error?.name === 'AbortError';
      throw new ApiError(aborted ? 'timeout' : 'network', 0, error instanceof Error ? error.message : String(error));
    } finally {
      if (timer) clearTimeout(timer);
    }

    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }
    if (!response.ok) {
      const code = isObject(payload) && typeof payload.error === 'string' ? payload.error : `http_${response.status}`;
      const detail = isObject(payload) && payload.detail !== undefined ? payload.detail : undefined;
      throw new ApiError(code, response.status, detail, payload);
    }
    return payload;
  }

  return {
    request,
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    del: (path, options) => request(path, { ...options, method: 'DELETE' }),
  };
}
