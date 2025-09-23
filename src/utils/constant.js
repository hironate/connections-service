const DEFAULT_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  GOOGLE_DRIVE: 'google-drive',
  SLACK: 'slack',
};

const NANGO_CALLBACK_URL = 'https://api.nango.dev/oauth/callback';

const DEFAULT_SCOPES = {
  [DEFAULT_PROVIDERS.GOOGLE_DRIVE]: [
    'https://www.googleapis.com/auth/drive.readonly',
  ],
  [DEFAULT_PROVIDERS.GITHUB]: ['repo'],
  [DEFAULT_PROVIDERS.SLACK]: ['channels:history', 'channels:read'],
};

const DEFAULT_RESPONSE_EVENT = {
  auth: {
    creation: 'connection.activated',
  },
};

/**
 * Generate a unique event ID for webhooks
 * @returns {string} Event ID in format evt_<random_string>
 */
function generateEventId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `evt_${timestamp}${randomStr}`;
}

module.exports = {
  DEFAULT_SCOPES,
  DEFAULT_PROVIDERS,
  NANGO_CALLBACK_URL,
  DEFAULT_RESPONSE_EVENT,
  generateEventId,
};
