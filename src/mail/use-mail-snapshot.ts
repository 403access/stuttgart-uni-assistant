import { useSelector } from '@tanstack/react-store';

import { mailStore } from '@/src/auth/mail';

/**
 * The live mail snapshot: status, last loaded rows, folders and active folder.
 * The mail module publishes into the store after every server read, so this is
 * the single subscription point — screens no longer copy fields by hand.
 */
export function useMailSnapshot() {
  return useSelector(mailStore);
}
