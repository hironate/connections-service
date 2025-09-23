const databaseService = require('../services/connections');
const nangoService = require('../services/nango-service');
const db = require('../../database/models');
const { normalizeScopes } = require('../utils/connections');

const getConnections = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { user } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID is required',
        timestamp: new Date().toISOString(),
      });
    }

    let connections;
    if (user) {
      connections = await databaseService.getConnectionsByUser({
        sub: user,
        filters: { tenantId },
      });
    } else {
      connections = await databaseService.getConnectionsByTenant({
        tenantId,
      });
    }

    res.json({
      connections,
      count: connections.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting connections:', error);
    res.status(500).json({
      error: 'Failed to retrieve connections',
      timestamp: new Date().toISOString(),
    });
  }
};

const getConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;

    if (!connectionId) {
      return res.status(400).json({
        error: 'Connection ID is required',
        timestamp: new Date().toISOString(),
      });
    }

    const connection = await databaseService.getConnectionById({
      id: connectionId,
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        connectionId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      connection,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting connection:', error);
    res.status(500).json({
      error: 'Failed to retrieve connection',
      timestamp: new Date().toISOString(),
    });
  }
};

const createConnection = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { sub, provider, scopes = [] } = req.body;

    console.log({ tenantId, sub, provider, scopes });

    const transaction = await db.sequelize.transaction();

    const normalizedScopes = normalizeScopes(scopes);

    const connection = await databaseService.createConnection({
      tenantId,
      sub,
      provider,
      authorizedScopes: normalizedScopes,
      transaction,
      authMode: 'oauth',
    });

    const { token } = await nangoService.createConnectSession({
      userId: sub,
      provider,
      scopes: normalizedScopes,
      organizationId: tenantId,
      tags: { connectId: connection.id },
    });

    const authorizationUrl = nangoService.buildAuthUrl({
      provider,
      connectSessionToken: token,
    });

    await transaction.commit();

    return res
      .status(200)
      .json({ connectionId: connection.id, authorizationUrl });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({
      error: 'Failed to create connection',
      timestamp: new Date().toISOString(),
    });
  }
};

const deleteConnection = async (req, res) => {
  try {
    const { connectionId: id } = req.params;

    const connection = await databaseService.getConnectionById(id);

    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        timestamp: new Date().toISOString(),
      });
    }

    const deleted = await nangoService.deleteConnection(
      connection.provider,
      connection.connectionId,
    );

    if (!deleted) {
      return res.status(400).json({
        error: 'Failed to delete connection',
        timestamp: new Date().toISOString(),
      });
    }

    await databaseService.updateConnectionStatus({
      id,
      status: 'revoked',
    });

    res.json({
      deleted: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({
      error: 'Failed to delete connection',
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getConnections,
  getConnection,
  createConnection,
  deleteConnection,
};
