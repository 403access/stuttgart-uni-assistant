import { findPlatform, initialsFor } from '@ua/core/auth/user';
import { useActiveStudy } from '@/src/campus/use-active-study';
import { program, student } from '@ua/core/data';
import { platformName } from '@ua/core/labels';
import { PROFILE_FIELDS, isProfileFieldPublic, publicProfileFieldCount } from '@ua/core/profile/privacy';
import { useAppSelector } from '@/src/state/AppState';
import { pick, tx } from '@ua/core/format';
import type { Locale, ProfileFieldId, ProfilePrivacy, SessionMode, UserAccount } from '@ua/core/domain/types';

export interface ProfileData {
  locale: Locale;
  user: UserAccount | null;
  displayName: string;
  initials: string;
  account: string;
  email: string;
  matriculation: string;
  studyTitle: string;
  platformsText: string;
  mailAccount: string | null;
  mode: SessionMode;
  createdAt: string | null;
  lastLoginAt: string | null;
  online: boolean;
  privacy: ProfilePrivacy;
  publicFields: typeof PROFILE_FIELDS;
  publicCount: number;
  values: Record<ProfileFieldId, string>;
}

/**
 * One source for every profile view: identity, study context, linked
 * platforms, and the privacy record. Screens pick the slice they render.
 */
export function useProfileData(): ProfileData {
  const locale = useAppSelector((state) => state.locale);
  const user = useAppSelector((state) => state.user);
  const sessionAccount = useAppSelector((state) => state.sessionAccount);
  const sessionName = useAppSelector((state) => state.sessionName);
  const sessionEmail = useAppSelector((state) => state.sessionEmail);
  const sessionMode = useAppSelector((state) => state.sessionMode);
  const authToken = useAppSelector((state) => state.authToken);
  const privacy = useAppSelector((state) => state.profilePrivacy);
  const { study } = useActiveStudy();

  const displayName = sessionName ?? user?.name ?? student.name;
  const account = sessionAccount ?? user?.account ?? student.account;
  const email = sessionEmail ?? user?.email ?? student.email;
  const matriculation = user?.matriculation ?? student.matriculation;
  const studyTitle = study
    ? `${study.intendedDegree ? `${study.intendedDegree} ` : ''}${study.name}`
    : `${pick(program.degree, locale)} ${pick(program.title, locale)}`;
  const linkedPlatforms = user?.platforms ?? [];
  const platformsText = linkedPlatforms.length
    ? linkedPlatforms.map((link) => (link.id === 'mail' ? 'UniMail' : platformName(link.id))).join(' · ')
    : tx(locale, 'konto.nicht_verknuepft');

  return {
    locale,
    user,
    displayName,
    initials: initialsFor(user),
    account,
    email,
    matriculation,
    studyTitle,
    platformsText,
    mailAccount: findPlatform(user, 'mail')?.account ?? null,
    mode: user?.mode ?? sessionMode ?? 'local',
    createdAt: user?.createdAt ?? null,
    lastLoginAt: user?.lastLoginAt ?? null,
    online: authToken !== null,
    privacy,
    publicFields: PROFILE_FIELDS.filter((field) => isProfileFieldPublic(privacy, field.id)),
    publicCount: publicProfileFieldCount(privacy),
    values: {
      name: displayName,
      account,
      email,
      matriculation,
      study: studyTitle,
      platforms: platformsText,
    },
  };
}

/** `E-Mail: name@uni-stuttgart.de` for one shareable field. */
export function profileLine(data: ProfileData, field: ProfileFieldId): string {
  const label = PROFILE_FIELDS.find((item) => item.id === field)?.label ?? 'konto.name';
  return `${tx(data.locale, label)}: ${data.values[field]}`;
}
