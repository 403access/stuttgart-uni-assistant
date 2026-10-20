import { useSyncExternalStore } from 'react';

import { getMailSnapshot, subscribeMailSnapshot, type MailSnapshot } from '@/src/auth/mail';

/**
 * The live mail snapshot: status, last loaded rows, folders and active folder.
 * The mail module publishes into this store after every server read, so this
 * is the single subscription point — screens no longer copy fields by hand.
 */
export function useMailSnapshot(): MailSnapshot {
  return useSyncExternalStore(subscribeMailSnapshot, getMailSnapshot, getMailSnapshot);
}
