/** Filter options carry the chosen sender; the choices themselves are inferred from the loaded rows. */
export type InboxFilter = { kind: 'all' } | { kind: 'unread' } | { kind: 'sender'; sender: string };

export type InboxSort = 'newest' | 'oldest' | 'sender' | 'unread-first';

export interface DropdownOption {
  key: string;
  label: string;
  meta?: string;
  selected: boolean;
  /** Section header this option sits under; consecutive options sharing it render one header. */
  group?: string;
}
