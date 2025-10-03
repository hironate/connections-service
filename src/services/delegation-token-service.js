const jwt = require('jsonwebtoken');

class DelegationTokenService {
  constructor() {
    this.delegationTokenSecret = process.env.DELEGATION_TOKEN_SECRET;
  }

  /**
   * Validate delegation token from TaoFlow
   * @param {string} delegationToken - JWT delegation token
   * @param {string} tenantId - Tenant ID from path
   * @param {string} connectionId - Connection ID from path
   * @returns {Object} - Decoded and validated token payload
   */
  async validateDelegationToken(delegationToken, tenantId, connectionId) {
    try {
      if (!delegationToken) {
        throw new Error('Delegation token is required');
      }

      const payload = await this.verifyToken(delegationToken);

      this.validateJWTClaims(payload, tenantId, connectionId);

      return payload;
    } catch (error) {
      throw error;
    }
  }

  async verifyToken(token) {
    try {
      const payload = jwt.verify(token, this.delegationTokenSecret, {
        issuer: 'wuwei-backend',
        audience: 'connections-service',
        algorithms: ['HS256', 'HS512', 'RS256'],
      });
      console.log('Delegation token verified:', payload);
      return payload;
    } catch (error) {
      throw error;
    }
  }

  validateJWTClaims(payload, tenantId, connectionId) {
    const requiredClaims = [
      'aud',
      'azp',
      'iss',
      'exp',
      'jti',
      'tid',
      'cid',
      'sub',
      'scp',
    ];

    for (const claim of requiredClaims) {
      if (!payload[claim]) {
        throw new Error(`Missing required claim: ${claim}`);
      }
    }

    if (payload.aud !== 'connections-service') {
      throw new Error('Invalid audience: must be connections-service');
    }

    if (payload.azp !== 'taoflow-backend') {
      throw new Error('Invalid authorized party: must be taoflow-backend');
    }

    if (payload.iss !== 'wuwei-backend') {
      throw new Error('Invalid issuer: must be wuwei-backend');
    }

    if (payload.tid !== tenantId) {
      throw new Error(
        `Tenant ID mismatch: path=${tenantId}, token=${payload.tid}`,
      );
    }

    if (payload.cid !== connectionId) {
      throw new Error(
        `Connection ID mismatch: path=${connectionId}, token=${payload.cid}`,
      );
    }

    if (!Array.isArray(payload.scp)) {
      throw new Error('Scopes must be an array');
    }

    console.log('JWT claims validation passed:', {
      aud: payload.aud,
      azp: payload.azp,
      iss: payload.iss,
      tid: payload.tid,
      cid: payload.cid,
      sub: payload.sub,
      scp: payload.scp,
      jti: payload.jti,
    });

    return true;
  }

  validateScopes(tokenScopes, authorizedScopes) {
    const unauthorizedInConnection = tokenScopes.filter(
      (scope) => !authorizedScopes.includes(scope),
    );
    if (unauthorizedInConnection.length > 0) {
      throw new Error(
        `Token scopes not authorized for connection: ${unauthorizedInConnection.join(
          ', ',
        )}`,
      );
    }

    return tokenScopes.filter((scope) => authorizedScopes.includes(scope));
  }

  checkJTI(jti) {
    // TODO: Implement JTI cache/blacklist for single-use tokens
    // For now, we'll just log it
    console.log('JTI check:', jti);
    return true;
  }
}

module.exports = new DelegationTokenService();
