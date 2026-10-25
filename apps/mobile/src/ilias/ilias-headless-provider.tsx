import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  ILIAS_DASHBOARD_URL,
  iliasFetchScript,
  registerIliasPageFetcher,
  type IliasPageResult,
} from '@/src/ilias/headless';

const PAGE_TIMEOUT_MS = 30_000;
const BASE_LOAD_TIMEOUT_MS = 20_000;

interface PendingPage {
  resolve: (page: IliasPageResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface LoadWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface PageAssembly {
  chunks: (string | null)[];
  received: number;
  total: number;
  chars: number;
  status: number;
  url: string;
}

/** A page above this is rejected rather than kept in memory twice. */
const MAX_PAGE_CHARS = 4_500_000;

/**
 * One hidden WebView on the ILIAS origin for the whole app. Screens never mount
 * their own: a course page, the dashboard refresh, and the onboarding import
 * share this page, so they also share the session cookies and the request
 * queue.
 */
export function IliasHeadlessProvider({ children }: { children: ReactNode }) {
  const webview = useRef<WebView | null>(null);
  const [mounted, setMounted] = useState(false);
  const [generation, setGeneration] = useState(0);
  const generationRef = useRef(0);
  const ready = useRef(false);
  const waiters = useRef<LoadWaiter[]>([]);
  const pending = useRef(new Map<string, PendingPage>());
  const assemblies = useRef(new Map<string, PageAssembly>());
  const sequence = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const settleWaiters = useCallback((ok: boolean) => {
    ready.current = ok;
    const list = waiters.current;
    waiters.current = [];
    for (const waiter of list) {
      clearTimeout(waiter.timer);
      if (ok) waiter.resolve();
      else waiter.reject(new Error('ilias_webview_unavailable'));
    }
  }, []);

  const rejectPending = useCallback((error: Error) => {
    const list = [...pending.current.values()];
    pending.current.clear();
    assemblies.current.clear();
    for (const waiter of list) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }, []);

  const waitForLoad = useCallback(() => {
    if (ready.current) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.current = waiters.current.filter((waiter) => waiter.timer !== timer);
        reject(new Error('ilias_webview_timeout'));
      }, BASE_LOAD_TIMEOUT_MS);
      waiters.current.push({ resolve, reject, timer });
    });
  }, []);

  const run = useCallback(
    async (url: string): Promise<IliasPageResult> => {
      await waitForLoad();
      const id = `p${(sequence.current += 1)}`;
      return new Promise<IliasPageResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.current.delete(id);
          assemblies.current.delete(id);
          reject(new Error('ilias_page_timeout'));
        }, PAGE_TIMEOUT_MS);
        pending.current.set(id, { resolve, reject, timer });
        webview.current?.injectJavaScript(iliasFetchScript(url, id));
      });
    },
    [waitForLoad],
  );

  /** Serialize page reads: one hidden page, one fetch at a time. */
  const fetchPage = useCallback(
    (url: string) => {
      setMounted(true);
      const next = queue.current.then(() => run(url));
      queue.current = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
    [run],
  );

  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  }, [fetchPage]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    registerIliasPageFetcher((url) => fetchRef.current(url));
    return () => registerIliasPageFetcher(null);
  }, []);

  useEffect(
    () => () => {
      settleWaiters(false);
      rejectPending(new Error('ilias_webview_closed'));
    },
    [rejectPending, settleWaiters],
  );

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let message: {
      ilias?: unknown;
      id?: unknown;
      ok?: unknown;
      status?: unknown;
      url?: unknown;
      chunk?: unknown;
      index?: unknown;
      total?: unknown;
      error?: unknown;
    };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!message || message.ilias !== 'page' || typeof message.id !== 'string') return;
    const id = message.id;
    const waiter = pending.current.get(id);
    if (!waiter) return;

    const finish = (error?: Error) => {
      pending.current.delete(id);
      assemblies.current.delete(id);
      clearTimeout(waiter.timer);
      if (error) waiter.reject(error);
    };

    if (typeof message.error === 'string') {
      finish(new Error(message.error));
      return;
    }
    if (typeof message.chunk !== 'string') {
      finish(new Error('ilias_page_failed'));
      return;
    }

    const total = typeof message.total === 'number' ? message.total : 1;
    const index = typeof message.index === 'number' ? message.index : 0;
    if (!Number.isInteger(total) || total < 1 || total > 64 || !Number.isInteger(index) || index < 0 || index >= total) {
      finish(new Error('ilias_page_invalid'));
      return;
    }

    let assembly = assemblies.current.get(id);
    if (!assembly || assembly.total !== total) {
      assembly = {
        chunks: new Array<string | null>(total).fill(null),
        received: 0,
        total,
        chars: 0,
        status: typeof message.status === 'number' ? message.status : 200,
        url: typeof message.url === 'string' ? message.url : '',
      };
      assemblies.current.set(id, assembly);
    }
    if (assembly.chunks[index] !== null) return; // duplicate chunk
    assembly.chunks[index] = message.chunk;
    assembly.received += 1;
    assembly.chars += message.chunk.length;
    if (assembly.chars > MAX_PAGE_CHARS) {
      finish(new Error('ilias_page_too_large'));
      return;
    }
    if (assembly.received < total) return;

    const html = assembly.chunks.map((chunk) => chunk ?? '').join('');
    const url = assembly.url;
    const status = assembly.status;
    finish();
    if (message.ok) waiter.resolve({ html, url, status });
    else waiter.reject(new Error(`ilias_http_${status}`));
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {mounted && Platform.OS !== 'web' ? (
        <WebView
          key={generation}
          ref={webview}
          source={{ uri: ILIAS_DASHBOARD_URL }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['https://*']}
          onLoadEnd={() => {
            // A late event from a replaced instance must not mark the new page
            // ready; the key changes on every remount.
            if (generationRef.current === generation) settleWaiters(true);
          }}
          onError={() => {
            // Drop the dead page. The next request remounts it with a fresh key
            // and waits for the new load instead of retrying in a loop.
            setMounted(false);
            ready.current = false;
            settleWaiters(false);
            rejectPending(new Error('ilias_webview_unavailable'));
            generationRef.current += 1;
            setGeneration(generationRef.current);
          }}
          onMessage={onMessage}
          style={styles.hidden}
          containerStyle={styles.hidden}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

const styles = {
  hidden: { position: 'absolute' as const, left: 0, top: 0, right: 0, bottom: 0, opacity: 0 },
};
