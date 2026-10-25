import type { TranslationKey } from '../i18n/index';
import type { ProfileFieldId, ProfilePrivacy, ProfileVisibility } from '../domain/types';

/**
 * Personal details the profile page can publish. The order is the order the
 * settings list reads in: identity first, then contact, then study context.
 */
export const PROFILE_FIELDS: readonly { id: ProfileFieldId; label: TranslationKey }[] = [
  { id: 'name', label: 'konto.name' },
  { id: 'account', label: 'konto.kennung' },
  { id: 'email', label: 'konto.email' },
  { id: 'matriculation', label: 'konto.matrikel' },
  { id: 'study', label: 'profil.studiengang' },
  { id: 'platforms', label: 'konto.plattformen' },
];

/**
 * Both name and study are visible by default: a profile without them would
 * tell peers nothing. Contact data and the matriculation number stay private
 * until the user opts in, and the profile is not discoverable at all.
 */
export const defaultProfileFields: Record<ProfileFieldId, ProfileVisibility> = {
  name: 'public',
  account: 'private',
  email: 'private',
  matriculation: 'private',
  study: 'public',
  platforms: 'private',
};

export function emptyProfilePrivacy(): ProfilePrivacy {
  return { searchable: false, fields: { ...defaultProfileFields } };
}

/** Turn an untrusted storage payload into a complete privacy record. */
export function sanitizeProfilePrivacy(value: unknown): ProfilePrivacy {
  if (!value || typeof value !== 'object') return emptyProfilePrivacy();
  const row = value as Partial<ProfilePrivacy>;
  const stored = row.fields && typeof row.fields === 'object' ? (row.fields as Record<string, unknown>) : {};
  const fields = {} as Record<ProfileFieldId, ProfileVisibility>;
  for (const field of PROFILE_FIELDS) {
    fields[field.id] = stored[field.id] === 'public' ? 'public' : 'private';
  }
  return { searchable: row.searchable === true, fields };
}

export function isProfileFieldPublic(privacy: ProfilePrivacy, field: ProfileFieldId): boolean {
  return privacy.fields[field] === 'public';
}

/** How many personal details peers can currently see. */
export function publicProfileFieldCount(privacy: ProfilePrivacy): number {
  return PROFILE_FIELDS.filter((field) => isProfileFieldPublic(privacy, field.id)).length;
}
