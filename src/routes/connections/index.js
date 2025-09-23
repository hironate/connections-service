const {
  createConnection,
  getConnection,
  deleteConnection,
  getConnections,
} = require('../../controllers/connections');
const { requireMTLSAuth } = require('../../middleware/auth');

module.exports = (app) => {
  app.post(
    '/v1/tenants/:tenantId/connections',
    // requireMTLSAuth,
    createConnection,
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
};
