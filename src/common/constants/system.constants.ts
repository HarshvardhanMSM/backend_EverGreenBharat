export const IS_PUBLIC_KEY = 'isPublic';
export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

export const AUTH_HEADER_NAME = 'Authorization';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const ONLINE_WINDOW_MINUTES = 5;
export const MIN_VIEWER_AGE = 13;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 14;
export const SUPPORTED_SOCIAL_PLATFORMS = [
  'youtube',
  'twitter',
  'x',
  'instagram',
  'tiktok',
  'facebook',
  'twitch',
] as const;
