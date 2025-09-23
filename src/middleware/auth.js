const crypto = require('crypto');
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const nangoService = require('../services/nango-service');
const { UnauthorizedError } = require('../utils/errors');

const requireMTLSAuth = (req, res, next) => {
  try {
    // In development, skip mTLS verification
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - skipping mTLS verification');
      return next();
    }

    // Check for client certificate
    const cert = req.connection.getPeerCertificate();

    if (!cert || !cert.subject) {
      return res.status(401).json({
        error: 'mTLS certificate required',
      });
    }

    // Verify certificate is from Wuwei API
    const expectedCN = 'wuwei-api';
    if (cert.subject.CN !== expectedCN) {
      return res.status(401).json({
        error: 'Invalid mTLS certificate',
      });
    }

    req.clientCert = cert;
    next();
  } catch (error) {
    console.error('mTLS verification error:', error);
    return res.status(500).json({
      error: 'mTLS verification failed',
    });
  }
};

const verifyNangoWebhook = (req, res, next) => {
  try {
    const signature = req.headers['x-nango-signature'];

    if (!signature) {
      throw new UnauthorizedError('Missing X-Nango-Signature header');
    }

    // In development mode, optionally skip verification for testing
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.SKIP_WEBHOOK_VERIFICATION === 'true'
    ) {
      console.log(
        'WARNING: Development mode - skipping webhook signature verification',
      );
      req.webhookVerified = true;
      return next();
    }

    // Use Nango SDK for verification - this handles the signature logic internally
    const isValid = nangoService.verifyWebhookSignature(signature, req.body);

    if (!isValid) {
      throw new UnauthorizedError('Invalid Nango webhook signature');
    }

    console.log('Nango webhook signature verified successfully');
    req.webhookVerified = true;
    next();
  } catch (error) {
    console.error('Nango webhook verification error:', error.message);

    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      error: 'Webhook verification failed',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Verify OIDC JWT from Wuwei (for debugging/admin endpoints)
 */
const verifyOIDCToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Bearer token required',
      });
    }

    const token = authHeader.substring(7);

    // Initialize JWKS client
    const client = jwksClient({
      jwksUri: process.env.OIDC_JWKS_URL,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
    });

    // Decode token to get key ID
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid token format',
      });
    }

    // Get signing key
    const key = await new Promise((resolve, reject) => {
      client.getSigningKey(decoded.header.kid, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    const signingKey = key.getPublicKey();

    // Verify token
    const payload = jwt.verify(token, signingKey, {
      issuer: process.env.OIDC_ISSUER,
      algorithms: ['RS256'],
    });

    req.oidcPayload = payload;
    next();
  } catch (error) {
    console.error('OIDC token verification error:', error);
    return res.status(401).json({
      error: 'Invalid OIDC token',
    });
  }
};

module.exports = {
  requireMTLSAuth,
  verifyNangoWebhook,
  verifyOIDCToken,
};
