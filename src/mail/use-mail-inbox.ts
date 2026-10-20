import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutAnimation } from 'react-native';

import {
  fetchMailFolders,
  fetchMailStatus,
  folderLabel,
  getMailSnapshot,
  hydrateMailSnapshot,
  loadMailMessages,
  mailDetail,
  mailMessage,
  submitMailCredentials,
  subscribeMailSnapshot,
} from '@/src/auth/mail';
import { showToast } from '@/src/components/toast';
import { useApp } from '@/src/state/AppState';
import { tx } from '@/src/text';
import type { MailFolder, MailMessage, MailStatus } from '@/src/types';

import { sameMessageOrder, sameMessageRows } from './format';

/** Deliberate fetching interval: one quiet inbox read per minute while connected. */
const REFRESH_INTERVAL_MS = 60_000;

/**
 * Owns the inbox data of the mail tab: snapshot mirror, status, folders, the
 * one-at-a-time mailbox reads, polling and the credential handoff. Everything
 * visual lives in the components; this hook only exposes state and actions.
 */
export function useMailInbox() {
  const { locale, sessionAccount, mailAccount, setMailAccount, authToken, refreshUser } = useApp();
  const [status, setStatus] = useState<MailStatus | null>(() => getMailSnapshot().status);
  const [messages, setMessages] = useState<MailMessage[]>(() => getMailSnapshot().messages ?? []);
  const [account, setAccount] = useState(mailAccount ?? sessionAccount ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  /** First status + mailbox read of this mount; without cached rows the skeleton waits for it. */
  const [bootSettled, setBootSettled] = useState(false);
  /** The on-device cache has been read, so an empty list is real rather than not-yet-hydrated. */
  const [cacheReady, setCacheReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  /** Guards so neither auto-load nor the poll interval stacks duplicate server calls. */
  const inFlight = useRef(false);
  const autoLoaded = useRef(false);
  /** Mirror of the rows for change detection inside async callbacks. */
  const messagesRef = useRef(messages);

  const connected = status?.configured ?? false;

  /** The mailbox shown: IMAP folder name, default INBOX; the list comes from the server. */
  const [folder, setFolder] = useState(() => getMailSnapshot().folder ?? 'INBOX');
  const [folders, setFolders] = useState<MailFolder[]>(() => getMailSnapshot().folders ?? []);
  /** Mirror for the refresh callbacks so a folder switch does not re-create them (and rerun the load effects). */
  const folderRef = useRef(folder);

  /**
   * Apply a fetched list without ever remounting unchanged rows. Only a changed
   * set or order schedules a layout animation, so newly arriving mail fades and
   * pushes the rows below it down smoothly; read-flag updates stay still.
   */
  const applyMessages = useCallback((next: MailMessage[]) => {
    const current = messagesRef.current;
    if (sameMessageRows(current, next)) return;
    if (!sameMessageOrder(current, next)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    messagesRef.current = next;
    setMessages(next);
  }, []);

  /** Read the on-device copy once; the app provider normally has done this already. */
  useEffect(() => {
    let active = true;
    hydrateMailSnapshot()
      .catch(() => undefined)
      .finally(() => {
        if (active) setCacheReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  /**
   * One mailbox read through the assistant server (one IMAP session each). `quiet` runs are
   * the auto-load and the polling interval: they must not flash the refresh button and
   * not overwrite the visible note, only their own errors surface via `mailMessage`.
   * `pull` runs come from pull-to-refresh: their spinner lives in the list, so they skip
   * the loading copy and the success note as well.
   */
  const refreshMessages = useCallback(
    async (options: { quiet?: boolean; folder?: string; pull?: boolean } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      const quiet = options.quiet ?? false;
      const pull = options.pull ?? false;
      const target = options.folder ?? folderRef.current;
      if (!quiet) {
        setError('');
        setNote('');
        if (!pull) setLoading(true);
      }
      try {
        const loaded = await loadMailMessages(25, target);
        applyMessages(loaded);
        const display = getMailSnapshot().folders?.find((candidate) => candidate.name === target)?.display ?? target;
        if (!quiet && !pull) setNote(tx(locale, 'tabsMail.geladen', [folderLabel(display, locale)]));
      } catch (caught) {
        const code = caught instanceof Error ? caught.message : 'mail_failed';
        if (!quiet) setError(mailMessage(locale, code, mailDetail(caught)));
        if (code === 'mail_not_configured') {
          // The server restarted and forgot the credentials: resync once, the poll interval stops because connected becomes false.
          await fetchMailStatus();
        }
      } finally {
        inFlight.current = false;
        if (!quiet) setLoading(false);
      }
    },
    [applyMessages, locale],
  );

  /** Pull-to-refresh keeps the rows on screen; the spinner is the only feedback while it runs. */
  const pullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMessages({ pull: true });
    } finally {
      setRefreshing(false);
    }
  }, [refreshMessages]);

  /** The pushed connection screen publishes server-side changes; apply them here directly. */
  useEffect(
    () =>
      subscribeMailSnapshot(() => {
        const snap = getMailSnapshot();
        setStatus(snap.status);
        if (snap.messages) applyMessages(snap.messages);
        else {
          messagesRef.current = [];
          setMessages([]);
        }
        setFolders(snap.folders ?? []);
        if (snap.status && !snap.status.configured) {
          messagesRef.current = [];
          setMessages([]);
          setFolders([]);
          folderRef.current = 'INBOX';
          setFolder('INBOX');
          setNote('');
          setError('');
        }
      }),
    [applyMessages],
  );

  /** Auto-load exactly once per mount — the same attempt must never repeat by effect reruns. */
  useEffect(() => {
    let active = true;
    fetchMailStatus()
      .then((next) => {
        if (!active) return;
        if (next?.configured) {
          if (next.account) setMailAccount(next.account);
          fetchMailFolders()
            .catch(() => undefined)
            .finally(() => {
              if (!autoLoaded.current) {
                autoLoaded.current = true;
                refreshMessages({ quiet: true })
                  .catch(() => undefined)
                  .finally(() => {
                    if (active) setBootSettled(true);
                  });
              } else if (active) {
                setBootSettled(true);
              }
            });
        } else {
          setBootSettled(true);
        }
      })
      .catch(() => {
        if (active) setBootSettled(true);
      });
    return () => {
      active = false;
    };
  }, [setMailAccount, refreshMessages]);

  /** Deliberate fetching interval: one quiet refresh per minute while connected. */
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      refreshMessages({ quiet: true }).catch(() => undefined);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [connected, refreshMessages]);

  async function connect() {
    if (busy) return;
    setError('');
    setNote('');
    setBusy(true);
    setBootSettled(false);
    try {
      const result = await submitMailCredentials({ account, password }, authToken);
      setPassword('');
      setMailAccount(result.account);
      void refreshUser();
      showToast({
        tone: 'success',
        title: tx(locale, 'tabsMail.verbunden_2', [result.account]),
        message: result.address || tx(locale, 'tabsMail.uni'),
      });
      fetchMailFolders().catch(() => undefined);
      await refreshMessages({ quiet: true });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'mail_failed';
      setError(mailMessage(locale, code, mailDetail(caught)));
    } finally {
      setBusy(false);
      setBootSettled(true);
    }
  }

  /** Switch mailboxes through the same loading path as a manual refresh. */
  const selectFolder = useCallback(
    (key: string) => {
      if (key === folderRef.current) return;
      folderRef.current = key;
      setFolder(key);
      messagesRef.current = [];
      setMessages([]);
      refreshMessages({ quiet: false, folder: key }).catch(() => undefined);
    },
    [refreshMessages],
  );

  /** Skeleton and entrance animation: a smooth minimum wait regardless of cached rows. */
  const revealPending = loading || !cacheReady || (!bootSettled && messages.length === 0);

  return {
    connected,
    status,
    sessionAccount,
    messages,
    folders,
    folder,
    account,
    password,
    busy,
    refreshing,
    error,
    note,
    revealPending,
    setAccount,
    setPassword,
    connect,
    selectFolder,
    pullToRefresh,
  };
}
