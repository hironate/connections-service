const delegationTokenService = require('../services/delegation-token-service');
const databaseService = require('../services/connections');
const nangoService = require('../services/nango-service');
const db = require('../../database/models');

const createAccessToken = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { connectionId, tenantId } = req.params;
    const { delegationToken, minTtlSeconds = 300 } = req.body;

    const connection = await databaseService.getConnectionById(connectionId);

    if (!connection || connection.tenantId !== tenantId) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
        timestamp: new Date().toISOString(),
      });
    }

    const tokenPayload = await delegationTokenService.validateDelegationToken(
      delegationToken,
      tenantId,
      connectionId,
    );

    const { sub, tid, cid, scp, jti, cver } = tokenPayload;

    if (connection.sub !== sub) {
      return res.status(403).json({
        success: false,
        error: 'Connection does not belong to authenticated user',
        timestamp: new Date().toISOString(),
      });
    }

    if (connection.tenantId !== tid) {
      return res.status(403).json({
        success: false,
        error: 'Connection does not belong to tenant',
        timestamp: new Date().toISOString(),
      });
    }

    if (connection.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Connection is not active',
        status: connection.status,
        timestamp: new Date().toISOString(),
      });
    }

    if (cver && cver !== connection.connectionVersion) {
      return res.status(400).json({
        success: false,
        error: 'Connection version mismatch',
        timestamp: new Date().toISOString(),
      });
    }

    const authorizedScopes = connection.authorizedScopes || [];
    const effectiveScopes = delegationTokenService.validateScopes(
      scp,
      authorizedScopes,
    );

    delegationTokenService.checkJTI(jti);

    const accessTokenData = await nangoService.getAccessToken(
      connection.provider,
      connection.connectionId,
    );

    if (!accessTokenData) {
      return res.status(404).json({
        success: false,
        error: 'Access token not available',
        timestamp: new Date().toISOString(),
      });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiresIn = accessTokenData.expires_at
      ? Math.max(
          0,
          new Date(accessTokenData.expires_at).getTime() / 1000 - currentTime,
        )
      : 3600;

    if (tokenExpiresIn < minTtlSeconds) {
      try {
        console.log(`Token expires in ${tokenExpiresIn}s, refreshing...`);
      } catch (refreshError) {
        console.warn('Token refresh failed:', refreshError.message);
      }
    }

    await connection.updateLastAccessed(transaction);
    return res.status(200).json({
      access_token: accessTokenData.access_token,
      expires_in: Math.floor(tokenExpiresIn),
      scopes: effectiveScopes,
      vendor: {
        accountId: connection.providerAccount?.account_id || null,
        displayName: connection.providerAccount?.display_name || null,
        ...connection.providerAccount,
      },
    });
  } catch (error) {
    transaction.rollback();
    console.error('Error getting access token:', error);

    let statusCode = 500;
    let errorMessage = 'Failed to get access token';

    if (error.message.includes('expired')) {
      statusCode = 401;
      errorMessage = 'Delegation token has expired';
    } else if (error.message.includes('Invalid')) {
      statusCode = 401;
      errorMessage = error.message;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Connection not found';
    } else if (error.message.includes('not active')) {
      statusCode = 400;
      errorMessage = 'Connection is not active';
    } else if (error.message.includes('scopes')) {
      statusCode = 403;
      errorMessage = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  createAccessToken,
};
