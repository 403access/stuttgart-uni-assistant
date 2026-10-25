export type PlatformId = 'campus' | 'ilias' | 'sdg' | 'siam';
export type AccountPlatformId = PlatformId | 'mail';
export type PlatformLinkStatus = 'connected' | 'linked';
export type SignInMode = 'campus' | 'oidc' | 'demo' | 'local';

export const PLATFORMS: AccountPlatformId[];
export const PLATFORM_STATUS: PlatformLinkStatus[];
export const SIGN_IN_MODES: SignInMode[];
