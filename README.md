# Connections Service

A secure OAuth connections service that integrates with Nango token vault for managing third-party integrations.

## Architecture Overview

This service acts as a secure proxy between your application and OAuth providers, using Nango as the token vault. It follows this sequence:

1. **Client Application** → **Connections Service** → **Nango** → **OAuth Provider**
2. **OAuth Provider** → **Connections Service** → **Nango** (token storage)
3. **Nango** → **Connections Service** → **Client Application** (webhook notification)

## Key Features

- **mTLS Security**: Secure service-to-service communication
- **Nango Integration**: Uses Nango as secure token vault
- **Webhook Flow**: Asynchronous OAuth completion notifications
- **Multi-Tenant**: Supports multiple tenants/workspaces
- **Zero Token Exposure**: Client applications never see OAuth tokens
- **Database Storage**: PostgreSQL with Sequelize ORM for connection management
- **Audit Logging**: Comprehensive audit trail for all operations

## API Endpoints

### OAuth Flow

- `POST /tenants/{tenantId}/connections` - Initiate OAuth flow
- `GET /oauth/callback` - Handle OAuth redirects (redirects to Nango)

### Webhooks

- `POST /webhooks/nango` - Receive Nango webhook notifications

### Management

- `GET /tenants/{tenantId}/connections/{connectionId}` - Get connection status
- `DELETE /tenants/{tenantId}/connections/{connectionId}` - Delete connection

### Health & Monitoring

- `GET /health` - Service health check

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create your environment configuration file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3004
NODE_ENV=development
LOG_LEVEL=info

# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=connections_service
DB_HOST=localhost
DB_PORT=5432

# Nango Configuration
NANGO_SECRET_KEY=your_nango_secret_key
NANGO_WEBHOOK_SECRET=your_nango_webhook_secret
NANGO_API_URL=https://api.nango.dev

# Provider Integration Keys (from Nango dashboard)
GITHUB_INTEGRATION_KEY=github
GOOGLE_INTEGRATION_KEY=google
SLACK_INTEGRATION_KEY=slack
NOTION_INTEGRATION_KEY=notion

# mTLS Certificates (production)
MTLS_CERT_PATH=/path/to/connections-service.crt
MTLS_KEY_PATH=/path/to/connections-service.key
MTLS_CA_PATH=/path/to/ca.crt

# Client Application API
CLIENT_API_URL=https://your-app.com
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002,http://localhost:3003
```

### 3. Database Setup

Set up your PostgreSQL database:

```bash
# Create database
createdb connections_service

# Run migrations
npm run migrate
```

For detailed database setup instructions, see [DATABASE_SETUP.md](DATABASE_SETUP.md).

### 4. Configure Nango

1. Create integrations in your Nango dashboard for each provider
2. Set OAuth redirect URI to: `https://your-connections-service.com/oauth/callback`
3. Configure webhook endpoint: `https://your-connections-service.com/webhooks/nango`

### 5. Start Service

```bash
# Development
npm run dev

# Production
npm start
```

## OAuth Flow Example

### 1. Initiate Connection

```http
POST /tenants/my-tenant/connections
Content-Type: application/json

{
  "sub": "user-oidc-subject",
  "provider": "github",
  "scopes": ["repo", "user:email"]
}
```

**Response:**

```json
{
  "connectionId": "uuid-generated-by-nango",
  "authorizationUrl": "https://github.com/login/oauth/authorize?...",
  "state": "nango-state-parameter",
  "provider": "github",
  "tenantId": "my-tenant"
}
```

### 2. User Authorizes

User is redirected to `authorizationUrl` and completes OAuth with GitHub.

### 3. OAuth Callback

GitHub redirects to `/oauth/callback?code=...&state=...` which then redirects to Nango.

### 4. Nango Webhook

Nango processes tokens and sends webhook to `/webhooks/nango`:

```json
{
  "type": "connection.activated",
  "connectionId": "uuid",
  "providerConfigKey": "github",
  "connectionMetadata": {
    "tenantId": "my-tenant",
    "sub": "user-oidc-subject"
  },
  "authorizedScopes": ["repo", "user:email"],
  "vendor": {
    "account_id": "github-user-id",
    "display_name": "John Doe",
    "username": "johndoe"
  }
}
```

### 5. Client Application Notification

Connections Service forwards to Client Application API:

```http
POST https://your-app.com/webhooks/connections
Content-Type: application/json

{
  "type": "connection.activated",
  "connectionId": "uuid",
  "tenantId": "my-tenant",
  "oidcSub": "user-oidc-subject",
  "provider": "github",
  "authorizedScopes": ["repo", "user:email"],
  "providerAccountId": "github-user-id",
  "displayName": "John Doe",
  "metadata": {
    "username": "johndoe",
    "avatar": "https://github.com/avatar.jpg"
  }
}
```

## Security

### mTLS Configuration

For production, configure mutual TLS:

1. Generate certificates for service-to-service communication
2. Set certificate paths in environment variables
3. Configure Wuwei API with corresponding client certificates

### Webhook Verification

- Nango webhooks are verified using HMAC signatures
- Wuwei webhooks use mTLS client certificates

## Supported Providers

- **GitHub**: Repository access, user information
- **Google**: Drive, Calendar, user profile
- **Slack**: Bot tokens, user tokens
- **Notion**: Database access, page management

Add new providers by:

1. Configuring integration in Nango dashboard
2. Adding integration key to environment variables
3. Updating provider mapping in `nangoService.js`

## Monitoring

### Health Check

```http
GET /health
```

### Logs

- Connection creation and completion
- Webhook processing
- Error handling and retries

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Debug Mode

Set `LOG_LEVEL=debug` for verbose logging.

## Production Deployment

1. **Enable mTLS**: Configure client certificates
2. **Secure Environment**: Use proper secrets management
3. **Monitoring**: Set up health checks and alerting
4. **Scaling**: Service is stateless and can be horizontally scaled

## Troubleshooting

### Common Issues

1. **"Nango webhook signature invalid"**
   - Check `NANGO_WEBHOOK_SECRET` matches Nango dashboard
2. **"mTLS certificate required"**

   - Ensure certificates are properly configured
   - Check certificate paths and permissions

3. **"Connection not found"**
   - Verify connectionId is correct
   - Check Nango dashboard for connection status

### Debug Steps

1. Check service logs for detailed error messages
2. Verify Nango webhook delivery in dashboard
3. Test mTLS connection with curl
4. Validate environment configuration

## License

MIT
