const databaseService = require('../services/connections');
const nangoService = require('../services/nango-service');
const db = require('../../database/models');
const {
  normalizeScopes,
  filterConnectionData,
} = require('../utils/connections');

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

    // Filter connection data to only include non-confidential fields
    const filteredConnections = connections.map(filterConnectionData);

    res.json({
      connections: filteredConnections,
      count: filteredConnections.length,
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

    // Filter connection data to only include non-confidential fields
    const filteredConnection = filterConnectionData(connection);

    res.json({
      connection: filteredConnection,
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
  const transaction = await db.sequelize.transaction();
  try {
    const { tenantId } = req.params;
    const { sub, provider, scopes = [] } = req.body;

    const normalizedScopes = normalizeScopes(scopes);

    const userConnection = await databaseService.getConnectionsByUser({
      sub,
      filters: { tenantId, provider },
    });

    if (userConnection.length > 0 && userConnection[0]?.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'User already has a connection with this provider',
        timestamp: new Date().toISOString(),
      });
    }

    let connection = userConnection[0];

    if (!connection) {
      connection = await databaseService.createConnection({
        tenantId,
        sub,
        provider,
        authorizedScopes: normalizedScopes,
        transaction,
        authMode: 'oauth',
      });
    }

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
    await transaction.rollback();
    console.error('Error creating connection:', error);
    res.status(500).json({
      message: 'Failed to create connection',
      timestamp: new Date().toISOString(),
    });
  }
};

const updateConnection = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { tenantId, connectionId } = req.params;
    const { sub, provider, scopes = [] } = req.body;

    const connection = await databaseService.getConnectionById(connectionId);

    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        timestamp: new Date().toISOString(),
      });
    }

    const { token } = await nangoService.update({
      userId: sub,
      provider,
      scopes,
      connectionId: connection.connectionId,
      organizationId: tenantId,
    });

    const authorizationUrl = nangoService.buildAuthUrl({
      provider,
      connectSessionToken: token,
    });

    res.json({ authorizationUrl });
  } catch (error) {
    await transaction.rollback();
    console.error('Error reconnecting connection:', error);
    res.status(500).json({
      message: 'Failed to reconnect connection',
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
      message: 'Failed to delete connection',
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getConnections,
  getConnection,
  createConnection,
  deleteConnection,
  updateConnection,
};
