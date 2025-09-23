const { handleNangoWebhook } = require('../../controllers/webhooks');
const { verifyNangoWebhook } = require('../../middleware/auth');

module.exports = (app) => {
  app.post('/webhooks/nango', verifyNangoWebhook, handleNangoWebhook);
};
