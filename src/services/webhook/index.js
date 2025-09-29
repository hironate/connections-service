const { WebhookError, ExternalServiceError } = require('../../utils/errors');
const { WEBHOOK_TYPES } = require('../../utils/nango');
const fetch = require('node-fetch');
const nangoService = require('../nango-service');
const databaseService = require('../connections');
const authService = require('./auth');

class WebhookService {
  constructor() {
    this.wuweiApiUrl = process.env.WUWEI_API_URL;
  }

  async processWebhook(payload) {
    const { type, connectionId, operation } = payload;
    this.validateWebhookPayload(payload);

    const formattedPayload = await this.createPayload(payload);

    // if (formattedPayload) {
    //   await this.sendWebhook(formattedPayload);
    // }

    return {
      processed: true,
      connectionId,
      operation,
      timestamp: new Date().toISOString(),
    };
  }

  validateWebhookPayload(payload) {
    const { type, connectionId } = payload;

    if (!type) {
      throw new WebhookError('Missing webhook type');
    }

    if (!connectionId && type !== WEBHOOK_TYPES.FORWARD) {
      throw new WebhookError('Missing connectionId', type, connectionId);
    }
  }

  /**
   * Create payload based on webhook type
   * @param {Object} payload - The original webhook payload
   * @returns {Object|null} Formatted payload
   */
  async createPayload(payload) {
    const { type, ...rest } = payload;

    switch (type) {
      case WEBHOOK_TYPES.AUTH:
        return await authService.process(rest);
      default:
        console.log(`Unknown webhook type: ${type}`);
        return null;
    }
  }

  // /**
  //  * Create sync payload
  //  * @param {Object} payload - Sync webhook data
  //  * @returns {Object} Formatted sync payload
  //  */
  // createSyncPayload({
  //   connectionId,
  //   success,
  //   providerConfigKey,
  //   syncName,
  //   model,
  //   syncType,
  //   modifiedAfter,
  //   responseResults = {},
  //   error,
  //   startedAt,
  //   failedAt,
  // }) {
  //   if (success) {
  //     const { added = 0, updated = 0, deleted = 0 } = responseResults;
  //     return {
  //       type: 'sync.completed',
  //       connectionId,
  //       provider: this.mapProviderConfigKey(providerConfigKey),
  //       syncName,
  //       model,
  //       syncType,
  //       modifiedAfter,
  //       changes: { added, updated, deleted },
  //       success: true,
  //     };
  //   } else {
  //     return {
  //       type: 'sync.failed',
  //       connectionId,
  //       provider: this.mapProviderConfigKey(providerConfigKey),
  //       syncName,
  //       model,
  //       syncType,
  //       error,
  //       startedAt,
  //       failedAt,
  //       success: false,
  //     };
  //   }
  // }

  // /**
  //  * Create forward payload
  //  * @param {Object} payload - Forward webhook data
  //  * @returns {Object} Formatted forward payload
  //  */
  // createForwardPayload({
  //   from,
  //   connectionId,
  //   providerConfigKey,
  //   payload: externalPayload,
  // }) {
  //   return {
  //     type: 'webhook.forwarded',
  //     connectionId,
  //     provider: from,
  //     providerConfigKey,
  //     externalPayload,
  //     receivedAt: new Date().toISOString(),
  //   };
  // }

  // /**
  //  * Create legacy payload
  //  * @param {Object} payload - Legacy webhook data
  //  * @returns {Object|null} Formatted legacy payload
  //  */
  // createLegacyPayload({
  //   connectionId,
  //   providerConfigKey,
  //   connectionMetadata = {},
  //   authorizedScopes = [],
  //   vendor = {},
  // }) {
  //   const { tenantId, sub } = connectionMetadata;

  //   if (!tenantId || !sub) return null;

  //   return {
  //     type: 'connection.activated',
  //     connectionId,
  //     tenantId,
  //     oidcSub: sub,
  //     provider: this.mapProviderConfigKey(providerConfigKey),
  //     authorizedScopes,
  //     providerAccountId: vendor.account_id || vendor.user_id || vendor.id,
  //     displayName: vendor.display_name || vendor.name || vendor.email,
  //     metadata: {
  //       avatar: vendor.avatar_url || vendor.picture,
  //       username: vendor.username || vendor.login,
  //       email: vendor.email,
  //       profileUrl: vendor.profile_url || vendor.html_url,
  //       ...vendor,
  //     },
  //   };
  // }

  /**
   * Send webhook
   * @param {Object} payload - The payload to send
   * @throws {ExternalServiceError} If sending fails
   */
  async sendWebhook(payload) {
    try {
      if (!this.wuweiApiUrl) {
        throw new ExternalServiceError(
          'Central Service',
          'CENTRAL_SERVICE_URL not configured',
        );
      }

      const webhookUrl = `${this.wuweiApiUrl}/webhooks/connections`;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };

      // Add mTLS client certificate
      if (process.env.MTLS_CERT_PATH && process.env.MTLS_KEY_PATH) {
        const fs = require('fs');
        options.cert = fs.readFileSync(process.env.MTLS_CERT_PATH);
        options.key = fs.readFileSync(process.env.MTLS_KEY_PATH);

        if (process.env.MTLS_CA_PATH) {
          options.ca = fs.readFileSync(process.env.MTLS_CA_PATH);
        }
      }

      const response = await fetch(webhookUrl, options);

      if (!response.ok) {
        throw new ExternalServiceError(
          'Central Service',
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('Central Service', error.message, error);
    }
  }
}

module.exports = new WebhookService();
