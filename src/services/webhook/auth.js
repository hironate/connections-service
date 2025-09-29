const { AUTH_OPERATIONS } = require('../../utils/nango');
const databaseService = require('../connections');
const {
  DEFAULT_RESPONSE_EVENT,
  generateEventId,
} = require('../../utils/constant');

class WebhookAuthService {
  async process(payload) {
    const { operation, endUser, provider } = payload;
    const { organizationId } = endUser;

    let connection = null;

    switch (operation) {
      case AUTH_OPERATIONS.CREATION:
        connection = await this.handleCreation(payload);
        break;
      case AUTH_OPERATIONS.OVERRIDE:
        connection = await this.handleOverride(payload);
        break;
      default:
        throw new Error('Invalid operation');
    }

    return {
      type: DEFAULT_RESPONSE_EVENT.auth.creation,
      eventId: generateEventId(),
      connectionId: connection.id,
      tenantId: organizationId,
      userSub: connection.sub,
      provider,
      scopes: connection.authorizedScopes || [], // Renamed from authorizedScopes to scopes
    };
  }

  async handleCreation(payload) {
    const { endUser, connectionId, provider } = payload;
    const { endUserId, organizationId, tags } = endUser;

    const where = tags?.connectId
      ? { id: tags.connectId }
      : {
          sub: endUserId,
          provider,
          tenantId: organizationId,
        };

    return await databaseService.updateConnection({
      where,
      updateData: {
        status: 'active',
        connectionId,
      },
    });
  }

  async handleOverride(payload) {
    const { endUser, connectionId } = payload;
    const { tags } = endUser;

    const where = { connectionId };

    return await databaseService.updateConnection({
      where,
      updateData: {
        ...(tags?.scopes ? { authorizedScopes: tags.scopes?.split(' ') } : {}),
      },
    });
  }
}

module.exports = new WebhookAuthService();
