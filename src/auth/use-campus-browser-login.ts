import { useRef, useState } from 'react';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';

import {
  DIAGNOSE_JS,
  HARVEST_JS,
  NO_NATIVE_COOKIES,
  readNativeCampusCookies,
  type NativeCookies,
} from '@/src/auth/campus-browser';
import { buildHarvest, diagnoseLines, type BrowserHarvest } from '@/src/auth/campus-harvest';
import { parseHarvestMessage } from '@/src/auth/login-messages';
import type { Locale } from '@/src/types';

/**
 * The visible "adopt sign-in" browser: the user drives the real C@MPUS page,
 * then the harvest is read from the page and from the native cookie store.
 *
 * State and refs only; the screen owns the mutation that submits the harvest.
 */
export function useCampusBrowserLogin({
  locale,
  busy,
  onHarvest,
}: {
  locale: Locale;
  /** The shared submit flag from the screen: a second harvest is ignored while one is in flight. */
  busy: boolean;
  onHarvest: (harvest: BrowserHarvest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [diag, setDiag] = useState('');
  const webview = useRef<WebView | null>(null);
  const nativeCookies = useRef<NativeCookies>(NO_NATIVE_COOKIES);

  function openBrowser() {
    setError('');
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  /** A diagnostic message updates the panel; anything else is a harvest. */
  async function onMessage(event: WebViewMessageEvent) {
    if (busy) return;
    const parsed = parseHarvestMessage(event.nativeEvent.data);
    if (!parsed) return;
    if (parsed.diagnostic) {
      const lines = diagnoseLines(locale, parsed, nativeCookies.current.names);
      console.info(`[campus-diagnose]\n${lines.join('\n')}`);
      setDiag(lines.join('\n'));
      return;
    }
    onHarvest(buildHarvest(parsed, nativeCookies.current.header));
  }

  // Read the WebView's HttpOnly cookies first, then run the in-page harvest.
  async function adopt() {
    setError('');
    nativeCookies.current = await readNativeCampusCookies();
    webview.current?.injectJavaScript(HARVEST_JS);
  }

  async function diagnose() {
    nativeCookies.current = await readNativeCampusCookies();
    webview.current?.injectJavaScript(DIAGNOSE_JS);
  }

  return {
    open,
    openBrowser,
    close,
    error,
    setError,
    url,
    setUrl,
    diag,
    webview,
    onMessage,
    adopt,
    diagnose,
  };
}
