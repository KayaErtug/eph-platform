export const SETTINGS_PREFIX = 'EPH_NOTIFICATION_SETTINGS_';
export const SETTINGS_DEFAULTS = {
  enabled: true,
  messages: true,
  forum: true,
  pool: true,
  announcements: true,
  lina: true,
};
export function notificationCategory(type: string, url: string) {
  if (type === 'NEW_MESSAGE' || url.startsWith('/messages')) return 'messages';
  if (
    type === 'REQUEST_MATCH' ||
    url.startsWith('/network') ||
    url.startsWith('/forum')
  )
    return 'forum';
  if (
    type === 'CONTACT_UNLOCKED' ||
    type === 'PROJECT_POOL_ACCEPTED' ||
    url.startsWith('/havuz') ||
    url.startsWith('/portfoy')
  )
    return 'pool';
  if (url.startsWith('/lina')) return 'lina';
  return 'announcements';
}
