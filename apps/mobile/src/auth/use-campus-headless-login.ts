import { useEffect, useRef, useState } from 'react';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';

import {
  HARVEST_JS,
  headlessAutofillScript,
  headlessDumpScript,
  NO_NATIVE_COOKIES,
  readNativeCampusCookies,
  type NativeCookies,
} from '@/src/auth/campus-browser';
import { buildHarvest, type BrowserHarvest } from '@/src/auth/campus-harvest';
import { isLoginFailureStep, phaseForStep, type CampusLoginPhase } from '@/src/auth/campus-progress';
import { formatDump, hostOf, parseHarvestMessage } from '@/src/auth/login-messages';
import { biometricUnlockAvailable, clearLogin, readLogin, saveLogin, storedLoginHint } from '@/src/auth/vault';
import { useOnboarding } from '@/src/onboarding/OnboardingState';
import { tx } from '@/src/text';
import type { Locale } from '@/src/types';

const POLL_MS = 3000;
const TIMEOUT_MS = 90_000;

interface RunOptions {
  /** Write the credential to the device vault before running. */
  save: boolean;
  biometrics: boolean;
}

interface SavedLogin {
  account: string;
  biometrics: boolean;
}

/**
 * The automated sign-in: the credential is typed on this screen, optionally
 * kept in the device vault, and used by a hidden WebView against the official
 * C@MPUS pages. For C@MPUS only the harvested session is handed over through
 * `onHarvest`; the same credential is then reused to connect UniMail (see
 * `use-login-flow.ts`).
 */
export function useCampusHeadlessLogin({
  locale,
  onHarvest,
}: {
  locale: Locale;
  onHarvest: (harvest: BrowserHarvest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<CampusLoginPhase>('connect');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [dump, setDump] = useState('');
  const [attempt, setAttempt] = useState(0);

  // The App Lock preference is the source of truth for "biometrics are on": the
  // stored credential is then gated by the same Face ID / fingerprint check.
  // Without it the checkbox is an explicit opt-in and the vault uses its
  // device-passcode-only fallback (no biometric/Secure Enclave gate).
  const { biometricsEnabled } = useOnboarding();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [biometrics, setBiometrics] = useState(false);
  const [biometricsReady, setBiometricsReady] = useState(false);
  const [savedLogin, setSavedLogin] = useState<SavedLogin | null>(null);

  // The legacy screen still exposes its own biometric chip; both that and the
  // App Lock preference protect the vault entry. `rememberLogin` is what the
  // checkbox renders: remembered either by choice or because biometrics already
  // protect the entry.
  const biometricGate = biometricsEnabled || (biometrics && biometricsReady);
  const rememberLogin = remember || biometricGate;

  const webview = useRef<WebView | null>(null);
  const nativeCookies = useRef<NativeCookies>(NO_NATIVE_COOKIES);
  const harvesting = useRef(false);
  const timers = useRef<{ timeout: ReturnType<typeof setTimeout> | null; poll: ReturnType<typeof setInterval> | null }>({
    timeout: null,
    poll: null,
  });
  // The modal renders the script from state; the poll must not read a stale
  // closure, so the interval captures the script of its own attempt instead.
  const [creds, setCreds] = useState({ account: '', password: '', runId: '' });

  useEffect(() => {
    let active = true;
    biometricUnlockAvailable()
      .then((available) => {
        if (active) setBiometricsReady(available);
      })
      .catch(() => undefined);
    storedLoginHint()
      .then((hint) => {
        if (active && hint) setSavedLogin(hint);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      stopTimers();
    },
    [],
  );

  function stopTimers() {
    if (timers.current.timeout) clearTimeout(timers.current.timeout);
    if (timers.current.poll) clearInterval(timers.current.poll);
    timers.current = { timeout: null, poll: null };
  }

  function close() {
    stopTimers();
    harvesting.current = false;
    setOpen(false);
    setDetail('');
  }

  function autofillScript(): string {
    return headlessAutofillScript(creds.account, creds.password, creds.runId);
  }

  /** Re-run after a load: a late-rendered single-page form may not exist yet. */
  function onLoadEnd() {
    webview.current?.injectJavaScript(autofillScript());
  }

  function dumpPage() {
    webview.current?.injectJavaScript(headlessDumpScript());
  }

  /** Messages from the automated WebView: autofill progress, then the harvest. */
  async function onMessage(event: WebViewMessageEvent) {
    const parsed = parseHarvestMessage(event.nativeEvent.data);
    if (!parsed) return;
    if (!parsed.headless) {
      onHarvest(buildHarvest(parsed, nativeCookies.current.header));
      return;
    }
    const step = typeof parsed.step === 'string' ? parsed.step : '';
    console.info('[campus-headless]', step, typeof parsed.url === 'string' ? parsed.url.slice(0, 140) : '');
    if (!isLoginFailureStep(step) && step !== 'dump') {
      setPhase(phaseForStep(step));
      setDetail(hostOf(parsed.url));
    }
    if (step === 'no-form') {
      console.info(
        '[campus-headless]',
        `passwordInputs=${String(parsed.passwordInputs ?? '?')} forms=${String(parsed.formCount ?? '?')} display=${String(parsed.passwordDisplay ?? '?')} size=${String(parsed.passwordSize ?? '?')} readyState=${String(parsed.readyState ?? '?')}`,
      );
    }
    if (step === 'filled') {
      console.info(
        '[campus-headless]',
        `user=${String(parsed.user ?? '?')} submit=${String(parsed.submit ?? '?')} lengths=${String(parsed.userLength ?? '?')}/${String(parsed.passwordLength ?? '?')}`,
      );
    }
    if (step === 'cta-click') {
      console.info('[campus-headless]', `label=${String(parsed.label ?? '?')}`);
    }
    if (step === 'sso-click') {
      console.info('[campus-headless]', `try=${String(parsed.attempt ?? '?')} href=${String(parsed.href ?? '?')}`);
    }
    if (step === 'broker-exhausted') {
      console.info('[campus-headless]', `href=${String(parsed.href ?? '?')} clicks=${String(parsed.clicks ?? '?')}`);
    }
    if (step === 'rejected') {
      console.info('[campus-headless]', `reason=${String(parsed.reason ?? '?')}`);
    }
    if (step === 'dump') {
      const text = formatDump(parsed);
      setDump(text);
      console.info(`[campus-headless-dump]\n${text}`);
      return;
    }
    if (step === 'signed-in') {
      if (harvesting.current) return;
      harvesting.current = true;
      setPhase('adopt');
      nativeCookies.current = await readNativeCampusCookies();
      webview.current?.injectJavaScript(HARVEST_JS);
      return;
    }
    if (step === 'filled' || step === 'cta-click') {
      setPhase('identify');
      return;
    }
    if (step === 'too-many-attempts' || step === 'submit-failed' || step === 'error') {
      setError(
        tx(locale, 'useCampusHeadlessLogin.automatische'),
      );
      return;
    }
    if (step === 'rejected') {
      stopTimers();
      setError(
        tx(locale, 'useCampusHeadlessLogin.c_mpus', [typeof parsed.reason === 'string' && parsed.reason !== 'aria-invalid' ? `: ${parsed.reason}` : '']),
      );
      return;
    }
    if (step === 'broker-exhausted') {
      stopTimers();
      setError(
        tx(locale, 'useCampusHeadlessLogin.anmeldung'),
      );
    }
  }

  /**
   * Run the credential sign-in: the hidden WebView opens C@MPUS, takes the
   * brokered st-account entry, fills the university form, and the harvest above
   * adopts the session. The credential stays on this device.
   */
  async function run(accountValue: string, passwordValue: string, options: RunOptions) {
    setError('');
    harvesting.current = false;
    // Built once here and captured by the poll below: reading `creds` from the
    // interval closure would inject the credential of the previous attempt (an
    // empty password on the first run) and the portal would refuse it.
    const runId = String(Date.now());
    const script = headlessAutofillScript(accountValue, passwordValue, runId);
    setCreds({ account: accountValue, password: passwordValue, runId });
    setPhase('connect');
    setDetail('');
    if (options.save) {
      const ok = await saveLogin(
        { account: accountValue, password: passwordValue, biometrics: options.biometrics },
        tx(locale, 'useCampusHeadlessLogin.c'),
      ).catch(() => false);
      if (ok) setSavedLogin({ account: accountValue.trim(), biometrics: options.biometrics });
      else setError(tx(locale, 'useCampusHeadlessLogin.geraetespeicher'));
    }
    setOpen(true);
    setAttempt((value) => value + 1);
    stopTimers();
    timers.current.poll = setInterval(() => {
      webview.current?.injectJavaScript(script);
    }, POLL_MS);
    timers.current.timeout = setTimeout(() => {
      stopTimers();
      setError(tx(locale, 'useCampusHeadlessLogin.zeitueberschreitung'));
    }, TIMEOUT_MS);
  }

  function start() {
    const trimmed = account.trim();
    if (trimmed.length < 3 || !password) {
      setError(tx(locale, 'useCampusHeadlessLogin.bitte'));
      return;
    }
    return run(trimmed, password, { save: rememberLogin, biometrics: biometricGate });
  }

  /** Unlock the vault and run with the stored credential. Never re-saves it. */
  async function startStoredLogin() {
    setError('');
    const stored = await readLogin(
      tx(locale, 'useCampusHeadlessLogin.c'),
      savedLogin?.biometrics ?? false,
    );
    if (!stored) {
      setSavedLogin(null);
      setError(tx(locale, 'useCampusHeadlessLogin.gespeicherte'));
      return;
    }
    setAccount(stored.account);
    setPassword(stored.password);
    setBiometrics(stored.biometrics);
    await run(stored.account, stored.password, { save: false, biometrics: false });
  }

  async function forgetStoredLogin() {
    await clearLogin();
    setSavedLogin(null);
    setPassword('');
  }

  return {
    open,
    phase,
    setPhase,
    detail,
    error,
    dump,
    attempt,
    webview,
    creds,
    autofillScript,
    onMessage,
    onLoadEnd,
    dumpPage,
    close,
    start,
    startStoredLogin,
    forgetStoredLogin,
    savedLogin,
    biometricsReady,
    biometricGate,
    rememberLogin,
    account,
    setAccount,
    password,
    setPassword,
    remember,
    setRemember,
    biometrics,
    setBiometrics,
  };
}
