const { createAccessToken } = require('../../controllers/connection-token');
const {
  createConnection,
  getConnection,
  deleteConnection,
  getConnections,
  updateConnection,
} = require('../../controllers/connections');
const { requireMTLSAuth } = require('../../middleware/auth');

module.exports = (app) => {
  app.post(
    '/v1/tenants/:tenantId/connections',
    // requireMTLSAuth,
    createConnection,
  );

  app.patch(
    '/v1/tenants/:tenantId/connections/:connectionId',
    // requireMTLSAuth,
    updateConnection,
  );

  app.get(
    '/v1/tenants/:tenantId/connections/:connectionId',
    // requireMTLSAuth,
    getConnection,
  );

  app.get(
    '/v1/tenants/:tenantId/connections',
    // requireMTLSAuth,
    getConnections,
  );

  app.delete(
    '/v1/tenants/:tenantId/connections/:connectionId',
    // requireMTLSAuth,
    deleteConnection,
  );

  app.post(
    '/v1/tenants/:tenantId/connections/:connectionId/access-tokens',
    // requireMTLSAuth,
    createAccessToken,
  );
};
