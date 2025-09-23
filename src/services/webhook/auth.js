const { AUTH_OPERATIONS } = require('../../utils/nango');
const databaseService = require('../connections');
const {
  DEFAULT_RESPONSE_EVENT,
  generateEventId,
} = require('../../utils/constant');

class WebhookAuthService {
  async process(payload) {
    const { operation, endUser, connectionId, provider } = payload;
    const { endUserId, organizationId, tags } = endUser;

    if (operation !== AUTH_OPERATIONS.CREATION) {
      return;
    }

    const where = tags?.connectId
      ? { id: tags.connectId }
      : {
          sub: endUserId,
          provider,
          tenantId: organizationId,
        };

    const connection = await databaseService.updateConnection({
      where,
      updateData: {
        status: 'active',
        connectionId,
      },
    });

    return {
      type: DEFAULT_RESPONSE_EVENT.auth.creation,
      eventId: generateEventId(),
      connectionId: connection.id,
      tenantId: organizationId,
      userSub: connection.sub,
      provider,
      authorizedScopes: connection.authorizedScopes || [],
    };
  }
}

module.exports = new WebhookAuthService();
