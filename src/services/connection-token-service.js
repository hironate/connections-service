const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const databaseService = require('./connections');

class ConnectionTokenService {
  constructor() {
    this.jwtSecret =
      process.env.CONNECTION_TOKEN_SECRET || this.generateSecret();
    this.defaultTTL = process.env.CONNECTION_TOKEN_TTL || '15m';

    if (
      !process.env.CONNECTION_TOKEN_SECRET &&
      process.env.NODE_ENV === 'production'
    ) {
      console.warn(
        'WARNING: CONNECTION_TOKEN_SECRET not set in production. Using generated secret.',
      );
    }
  }

  generateSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  async generateConnectionToken(payload, ttl = this.defaultTTL) {
    try {
      const now = Math.floor(Date.now() / 1000);

      const tokenPayload = {
        ...payload,
        iat: now,
        type: 'connection_token',
        jti: crypto.randomUUID(),
      };

      const token = jwt.sign(tokenPayload, this.jwtSecret, {
        expiresIn: ttl,
        issuer: 'connections-service',
        audience: 'provider-access',
      });

      const decoded = jwt.decode(token);

      return {
        token,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        expiresIn: decoded.exp - now,
      };
    } catch (error) {
      console.error('Error generating connection token:', error);
      throw new Error('Failed to generate connection token');
    }
  }

  async verifyConnectionToken(token) {
    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: 'connections-service',
        audience: 'provider-access',
      });

      if (payload.type !== 'connection_token') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Connection token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid connection token');
      }
      throw error;
    }
  }

  async validateConnection(connectionId, tenantId) {
    try {
      const connection = await databaseService.getConnectionById(connectionId);

      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.tenantId !== tenantId) {
        throw new Error('Connection does not belong to tenant');
      }

      if (connection.status !== 'active') {
        throw new Error('Connection is not active');
      }

      return connection;
    } catch (error) {
      console.error('Connection validation error:', error);
      throw error;
    }
  }

  async createTokenForConnection(connectionId, ttl = this.defaultTTL) {
    try {
      const connection = await databaseService.getConnectionById(connectionId);

      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.status !== 'active') {
        throw new Error('Connection is not active');
      }

      const tokenPayload = {
        connectionId: connection.id,
        tenantId: connection.tenantId,
        sub: connection.sub,
        provider: connection.provider,
        scopes: connection.authorizedScopes || [],
      };

      return await this.generateConnectionToken(tokenPayload, ttl);
    } catch (error) {
      console.error('Error creating token for connection:', error);
      throw error;
    }
  }
}

module.exports = new ConnectionTokenService();
