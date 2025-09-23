const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3003',
      'http://localhost:3002',
    ],
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'connections-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    nango: {
      configured: !!process.env.NANGO_SECRET_KEY,
      url: process.env.NANGO_API_URL,
    },
  });
});

// API Routes
require('./routes')(app);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(isDevelopment && { stack: err.stack }),
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      path: req.originalUrl,
    },
  });
});

// Start server with optional mTLS
const startServer = () => {
  const useMTLS = process.env.MTLS_CERT_PATH && process.env.MTLS_KEY_PATH;

  if (useMTLS) {
    // HTTPS server with mTLS
    const httpsOptions = {
      cert: fs.readFileSync(process.env.MTLS_CERT_PATH),
      key: fs.readFileSync(process.env.MTLS_KEY_PATH),
      ca: process.env.MTLS_CA_PATH
        ? fs.readFileSync(process.env.MTLS_CA_PATH)
        : undefined,
      requestCert: true,
      rejectUnauthorized: true,
    };

    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(
        `HTTPS Connections Service with mTLS running on port ${PORT}`,
      );
      console.log(`Health check: https://localhost:${PORT}/health`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Nango integration: ${process.env.NANGO_API_URL}`);
    });
  } else {
    // HTTP server for development
    app.listen(PORT, () => {
      console.log(`HTTP Connections Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(
        `WARNING: mTLS disabled - add MTLS_CERT_PATH and MTLS_KEY_PATH for production`,
      );
    });
  }
};

startServer();

module.exports = app;
