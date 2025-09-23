const webhookService = require('../../services/webhook');
const { WebhookError } = require('../../utils/errors');

const handleNangoWebhook = async (req, res) => {
  try {
    const payload = req.body;

    if (!payload || !payload.type) {
      return res.status(400).json({
        received: true,
        processed: false,
        error: 'Invalid payload - missing type field',
        timestamp: new Date().toISOString(),
      });
    }

    await webhookService.processWebhook(payload);

    res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error('Error processing Nango webhook:', error.message);

    // Handle different error types appropriately
    if (error instanceof WebhookError) {
      return res.status(400).json({
        received: true,
        processed: false,
        error: error.message,
        webhookType: error.webhookType,
        connectionId: error.connectionId,
        timestamp: new Date().toISOString(),
      });
    }

    // For other errors, return 200 to prevent webhook retries
    res.status(200).json({
      received: true,
      processed: false,
      error: 'Internal server error processing webhook',
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  handleNangoWebhook,
};
