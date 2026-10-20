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
