import type { DropdownOption } from '@ua/ui';

/** Filter options carry the chosen sender; the choices themselves are inferred from the loaded rows. */
export type InboxFilter = { kind: 'all' } | { kind: 'unread' } | { kind: 'sender'; sender: string };

export type InboxSort = 'newest' | 'oldest' | 'sender' | 'unread-first';

export type { DropdownOption };
