const { handleCallback } = require('../../controllers/oauth');

module.exports = (app) => {
  app.get('/oauth/callback', handleCallback);
};
