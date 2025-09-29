const { Nango } = require('@nangohq/node');
const { DEFAULT_PROVIDERS } = require('../utils/constant');

/**
 * Nango Service - handles all interactions with Nango token vault using the official SDK
 */
class NangoService {
  constructor() {
    this.secretKey = process.env.NANGO_SECRET_KEY;
    this.api_url = process.env.NANGO_API_URL || 'https://api.nango.dev';
    this.auth_url =
      process.env.NANGO_AUTH_URL || 'https://api.nango.dev/oauth/connect';
    if (!this.secretKey) {
      throw new Error('NANGO_SECRET_KEY is required');
    }

    this.client = new Nango({
      secretKey: this.secretKey,
    });
  }

  /**
   * Enhanced error handling for Nango SDK operations
   */
  handleNangoError(error, operation) {
    const errorInfo = {
      operation,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    // Categorize common error types
    if (error.message.includes('404')) {
      errorInfo.type = 'NOT_FOUND';
      errorInfo.userMessage = 'Resource not found';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorInfo.type = 'AUTHENTICATION_ERROR';
      errorInfo.userMessage = 'Authentication failed';
    } else if (error.message.includes('400')) {
      errorInfo.type = 'BAD_REQUEST';
      errorInfo.userMessage = 'Invalid request';
    } else if (error.message.includes('429')) {
      errorInfo.type = 'RATE_LIMITED';
      errorInfo.userMessage = 'Rate limit exceeded';
    } else if (error.message.includes('500')) {
      errorInfo.type = 'SERVER_ERROR';
      errorInfo.userMessage = 'Server error';
    } else {
      errorInfo.type = 'UNKNOWN_ERROR';
      errorInfo.userMessage = 'An unexpected error occurred';
    }

    console.error(`Nango ${operation} error:`, errorInfo);
    return errorInfo;
  }

  /**
   * Initialize a Nango connection session
   *
   * @param {Object} options - Options for creating the connect session
   * @param {string} options.provider - The provider for the connection
   * @param {Object} options.connectionConfig - Connection configuration associated with the connection
   * @param {Object} options.tags - Tags for the connection
   * @param {Array} options.scopes - Scopes allowed for the connection
   */
  async createConnectSession(options) {
    const {
      provider,
      connectionConfig = {},
      scopes = [],
      userId,
      organizationId,
      tags = {},
      // organizationName,
    } = options;

    try {
      const { data } = await this.client.createConnectSession({
        end_user: {
          id: userId,
          tags,
        },
        allowed_integrations: [provider],
        organization: {
          id: organizationId,
          // display_name: organizationName,
        },
        integrations_config_defaults: {
          [integrationKey]: {
            user_scopes: scopes.join(' '),
            connection_config: connectionConfig,
          },
        },
      });

      // Return format expected by sequence diagram
      return {
        token: data.token,
        expiresAt: data.expires_at,
      };
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'createConnectSession');
      throw new Error(
        `Failed to create connect session: ${errorInfo.userMessage}`,
      );
    }
  }

  async update({
    provider,
    connectionId,
    scopes = [],
    userId,
    organizationId,
  }) {
    try {
      const { data } = await this.client.createReconnectSession({
        connection_id: connectionId,
        end_user: {
          id: userId,
          tags: {
            scopes: scopes.join(' '),
          },
        },
        organization: {
          id: organizationId,
        },
        integration_id: provider,
        integrations_config_defaults: {
          [provider]: {
            user_scopes: scopes.join(' '),
          },
        },
      });

      return data;
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'update');
      throw new Error(`Failed to reconnect: ${errorInfo.userMessage}`);
    }
  }

  /**
   * Get connection status from Nango
   */
  async getConnection(connectionId, integrationKey) {
    try {
      // Use Nango SDK to get connection
      const connection = await this.client.getConnection(
        integrationKey,
        connectionId,
      );
      return connection;
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'getConnection');
      if (errorInfo.type === 'NOT_FOUND') {
        return null; // Connection not found
      }
      throw new Error(`Failed to get connection: ${errorInfo.userMessage}`);
    }
  }

  /**
   * Delete a connection from Nango
   */
  async deleteConnection(integrationKey, connectionId) {
    try {
      console.log('Deleting connection:', integrationKey, connectionId);

      // Use Nango SDK to delete connection
      const response = await this.client.deleteConnection(
        integrationKey,
        connectionId,
      );

      return response.status === 200;
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'deleteConnection');
      throw new Error(`Failed to delete connection: ${errorInfo.userMessage}`);
    }
  }

  /**
   * Get access token for a connection
   * This method uses the SDK to retrieve access tokens
   */
  async getAccessToken(integrationKey, connectionId) {
    try {
      const token = await this.client.getToken(integrationKey, connectionId);
      return token;
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'getAccessToken');
      throw new Error(`Failed to get access token: ${errorInfo.userMessage}`);
    }
  }

  /**
   * List all connections for a given integration
   */
  async listConnections(integrationKey) {
    try {
      const connections = await this.client.listConnections(integrationKey);
      return connections;
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'listConnections');
      throw new Error(`Failed to list connections: ${errorInfo.userMessage}`);
    }
  }

  /**
   * Trigger a sync for a connection
   */
  async triggerSync(integrationKey, connectionId, syncName) {
    try {
      const result = await this.client.triggerSync(
        integrationKey,
        connectionId,
        syncName,
      );
      return result;
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'triggerSync');
      throw new Error(`Failed to trigger sync: ${errorInfo.userMessage}`);
    }
  }

  /**
   * Get sync status for a connection
   */
  async getSyncStatus(integrationKey, connectionId, syncName) {
    try {
      const status = await this.client.getSyncStatus(
        integrationKey,
        connectionId,
        syncName,
      );
      return status;
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'getSyncStatus');
      throw new Error(`Failed to get sync status: ${errorInfo.userMessage}`);
    }
  }

  /**
   * Update connection metadata
   */
  async updateConnectionMetadata(integrationKey, connectionId, metadata) {
    try {
      const result = await this.client.updateConnection(
        integrationKey,
        connectionId,
        {
          connection_config: {
            metadata,
          },
        },
      );
      return result;
    } catch (error) {
      const errorInfo = this.handleNangoError(
        error,
        'updateConnectionMetadata',
      );
      throw new Error(
        `Failed to update connection metadata: ${errorInfo.userMessage}`,
      );
    }
  }

  async getConnectionMetadata(providerConfigKey, connectionId) {
    const metadata = await this.client.getMetadata(
      providerConfigKey,
      connectionId,
    );
    return metadata;
  }

  buildAuthUrl({ provider, connectSessionToken }) {
    const url = new URL(`${this.auth_url}/${provider}`);
    url.searchParams.append('connect_session_token', connectSessionToken);

    return url.toString();
  }

  /**
   * Test the Nango connection
   * This method verifies that the SDK is properly configured and can communicate with Nango
   */
  async testConnection() {
    try {
      // Try to list integrations to test the connection
      const integrations = await this.client.listProviders();
      return {
        success: true,
        message: 'Nango SDK connection successful',
        integrations: integrations?.length || 0,
      };
    } catch (error) {
      const errorInfo = this.handleNangoError(error, 'testConnection');
      return {
        success: false,
        message: `Nango SDK connection failed: ${errorInfo.userMessage}`,
        error: errorInfo,
      };
    }
  }

  /**
   * Verify Nango webhook signature using the SDK
   * This method uses the official Nango SDK to verify webhook signatures
   */
  verifyWebhookSignature(signature, body) {
    try {
      // Use the Nango SDK's built-in webhook verification
      return this.client.verifyWebhookSignature(signature, body);
    } catch (error) {
      console.error('Nango webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Validate basic webhook payload structure
   * This performs minimal validation - signature verification is the primary security measure
   */
  validateWebhookPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid webhook payload: must be an object');
    }

    if (!payload.type) {
      throw new Error('Missing required webhook field: type');
    }

    // For most webhook types, connectionId is required
    if (payload.type !== 'forward' && !payload.connectionId) {
      throw new Error('Missing required webhook field: connectionId');
    }

    return true;
  }
}

// Export singleton instance
module.exports = new NangoService();
