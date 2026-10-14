/** Cookie names observed on https://campus.uni-stuttgart.de while signed in. Values stay out of the repository. */

export const campusCookieNames = [
  'CO_LANG',
  'CO_PROFILE',
  'PROFILE_CHOOSER_ENABLED',
  'PSESSIONID',
  'SESSION_MODIFICATION_DEBUG',
] as const;

export type CampusCookieName = (typeof campusCookieNames)[number];

export type CampusCookies = Partial<Record<CampusCookieName, string>>;

/** The portal session. C@MPUS answers `missing_session_cookie` when this is absent. */
export const campusSessionCookieName = 'PSESSIONID' satisfies CampusCookieName;

export const campusCookieRole: Record<CampusCookieName, 'session' | 'preference' | 'debug'> = {
  CO_LANG: 'preference',
  CO_PROFILE: 'preference',
  PROFILE_CHOOSER_ENABLED: 'preference',
  PSESSIONID: 'session',
  SESSION_MODIFICATION_DEBUG: 'debug',
};
