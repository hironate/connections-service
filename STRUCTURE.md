# Connections Service Structure

This service now follows the **exact same structure** as Wuwei backend.

## Directory Structure

```
connections-service/
├── src/
│   ├── controllers/
│   │   ├── connections-controller.js  ✅ Same naming as Wuwei
│   │   ├── oauth-controller.js        ✅ Same naming as Wuwei
│   │   └── webhooks-controller.js     ✅ Same naming as Wuwei
│   ├── services/
│   │   └── nango-service.js           ✅ Same naming as Wuwei
│   ├── middleware/
│   │   └── auth.js                    ✅ Same structure as Wuwei
│   └── routes/
│       ├── index.js                   ✅ Main routes file
│       ├── tenants/
│       │   └── index.js               ✅ Folder-based like Wuwei
│       ├── webhooks/
│       │   └── index.js               ✅ Folder-based like Wuwei
│       └── oauth/
│           └── index.js               ✅ Folder-based like Wuwei
├── package.json
├── env.example
└── README.md
```

## Route Organization (Same as Wuwei)

### `/routes/tenants/index.js`

```javascript
const {
  createConnection,
  getConnection,
  deleteConnection,
} = require('../../controllers/connections-controller');
const { requireMTLSAuth } = require('../../middleware/auth');

module.exports = (app) => {
  app.post('/tenants/:tenantId/connections', requireMTLSAuth, createConnection);
  app.get(
    '/tenants/:tenantId/connections/:connectionId',
    requireMTLSAuth,
    getConnection,
  );
  app.delete(
    '/tenants/:tenantId/connections/:connectionId',
    requireMTLSAuth,
    deleteConnection,
  );
};
```

### `/routes/webhooks/index.js`

```javascript
const { handleNangoWebhook } = require('../../controllers/webhooks-controller');
const { verifyNangoWebhook } = require('../../middleware/auth');

module.exports = (app) => {
  app.post('/webhooks/nango', verifyNangoWebhook, handleNangoWebhook);
};
```

### `/routes/oauth/index.js`

```javascript
const { handleCallback } = require('../../controllers/oauth-controller');

module.exports = (app) => {
  app.get('/oauth/callback', handleCallback);
};
```

## API Endpoints

Following the sequence diagram exactly:

- `POST /tenants/{tenantId}/connections` - Initiate OAuth via Nango
- `GET /oauth/callback` - Handle OAuth redirects
- `POST /webhooks/nango` - Receive Nango notifications
- `GET /tenants/{tenantId}/connections/{connectionId}` - Get connection status
- `DELETE /tenants/{tenantId}/connections/{connectionId}` - Delete connection

## Controller Patterns (Same as Wuwei)

```javascript
const createConnection = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { sub, provider, scopes = [] } = req.body;

    // Business logic...

    return res.status(200).json({
      connectionId,
      authorizationUrl,
      // ...
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    next(error);
  }
};
```

## Service Layer (Same as Wuwei)

```javascript
class NangoService {
  constructor() {
    // Configuration
  }

  async createConnectSession(options) {
    // Implementation
  }
}

module.exports = new NangoService();
```

Now the Connections Service is **100% consistent** with Wuwei backend architecture! 🎉
