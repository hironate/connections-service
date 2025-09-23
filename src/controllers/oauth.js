const { NANGO_CALLBACK_URL } = require('../utils/constant');

/**
 * Handle OAuth callback and redirect to Nango
 * GET /oauth/callback
 */
const handleCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('OAuth error:', error, error_description);
      return res.status(400).json({
        error: 'OAuth authorization failed',
        details: error_description || error,
      });
    }

    console.log('code', code, 'state', state);
    console.log('req.query', req.query);

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing required OAuth parameters',
        details: 'code and state are required',
      });
    }

    const nangoUrl = new URL(NANGO_CALLBACK_URL);
    nangoUrl.searchParams.append(
      'callback_url',
      'http://localhost:3003/workspace',
    );
    nangoUrl.search = new URLSearchParams(req.query).toString();

    res.redirect(308, nangoUrl.toString());
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    next(error);
  }
};

module.exports = {
  handleCallback,
};
