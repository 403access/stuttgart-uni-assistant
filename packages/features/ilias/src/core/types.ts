/** ILIAS rows as the assistant server parses them from the dashboard. */

export interface IliasProperty {
  name: string;
  value: string;
}

export interface IliasItem {
  id: string;
  kind: string;
  type: string;
  refId: number | null;
  newsId: number | null;
  mailId: number | null;
  title: string;
  description: string;
  url: string;
  group: string;
  properties: IliasProperty[];
  date: string;
}

/** One material row inside a course, group, or folder page. */
export interface IliasContentItem {
  id: string;
  kind: string;
  type: string;
  refId: number | null;
  title: string;
  description: string;
  url: string;
  properties: IliasProperty[];
  date: string;
  size: string;
  pages: string;
  downloadable: boolean;
}

export interface IliasContent {
  refId: number;
  kind: string;
  title: string;
  description: string;
  /** Members tab of a course or group; empty for folders and files. */
  membersUrl: string;
  items: IliasContentItem[];
  fetchedAt: string;
}

/** One member of a course or group, from the ILIAS members tab. */
export interface IliasMember {
  id: string;
  /** Display name, or the login name when ILIAS hides the profile name. */
  name: string;
  username: string;
  /** Raw ILIAS role label, e.g. "Kontaktperson". */
  role: string;
  roleKind: 'tutor' | 'participant';
  /** True when only the login name is public. */
  hidden: boolean;
  /** Numeric ILIAS user id when the public profile is reachable. */
  userId: number | null;
  avatarUrl: string;
  profileUrl: string;
}

export interface IliasProfileLink {
  label: string;
  url: string;
}

export interface IliasProfileSection {
  title: string;
  text: string;
  links: IliasProfileLink[];
}

export interface IliasProfileCourse {
  refId: number;
  kind: string;
  title: string;
  url: string;
}

/** A public ILIAS profile opened from a member row. */
export interface IliasProfile {
  userId: number | null;
  name: string;
  /** The h1 form, e.g. "Bross, Fabian [FabianBross]". */
  title: string;
  /** Course context ILIAS prints below the header. */
  context: string;
  avatarUrl: string;
  email: string;
  mailUrl: string;
  vcardUrl: string;
  profileUrl: string;
  sections: IliasProfileSection[];
  /** Course or group links a published profile section carries. */
  courses: IliasProfileCourse[];
  fetchedAt: string;
}

export interface IliasMembers {
  refId: number;
  kind: string;
  title: string;
  members: IliasMember[];
  fetchedAt: string;
}

export interface IliasCounts {
  memberships: number;
  courses: number;
  groups: number;
  news: number;
  mails: number;
  unreadMails: number;
  tasks: number;
}

export interface IliasDashboard {
  pageTitle: string;
  name: string | null;
  account: string | null;
  memberships: IliasItem[];
  courses: IliasItem[];
  groups: IliasItem[];
  news: IliasItem[];
  mails: IliasItem[];
  tasks: IliasItem[];
  counts: IliasCounts;
  fetchedAt: string;
}

export interface IliasStatus {
  baseUrl: string;
  configured: boolean;
  sessionActive: boolean;
  account: string | null;
  source: 'browser' | 'env' | null;
  updatedAt: string | null;
}
