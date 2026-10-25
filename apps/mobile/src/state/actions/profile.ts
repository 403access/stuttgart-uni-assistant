import { updateApp } from '@ua/core/state/app-store';
import type { ProfileFieldId, ProfileVisibility } from '@ua/core/domain/types';

/**
 * Profile visibility lives on the device: there is no peer directory on the
 * server yet, so these flags define what the share sheet and the profile
 * preview expose. They never touch the session token.
 */
export function setProfileVisibility(field: ProfileFieldId, visibility: ProfileVisibility): void {
  updateApp((current) =>
    current.profilePrivacy.fields[field] === visibility
      ? current
      : {
          ...current,
          profilePrivacy: {
            ...current.profilePrivacy,
            fields: { ...current.profilePrivacy.fields, [field]: visibility },
          },
        },
  );
}

export function setProfileSearchable(searchable: boolean): void {
  updateApp((current) =>
    current.profilePrivacy.searchable === searchable
      ? current
      : { ...current, profilePrivacy: { ...current.profilePrivacy, searchable } },
  );
}
