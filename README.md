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
- **Audit Logging**: Comprehensive audit trail with automatic data sanitization for security

## API Endpoints

### OAuth Flow

- `POST /v1/tenants/{tenantId}/connections` - Initiate OAuth flow
- `GET /oauth/callback` - Handle OAuth redirects (redirects to Nango)

### Connection Management

- `GET /v1/tenants/{tenantId}/connections` - List all connections for a tenant
- `GET /v1/tenants/{tenantId}/connections/{connectionId}` - Get specific connection status
- `PATCH /v1/tenants/{tenantId}/connections/{connectionId}` - Update connection details
- `DELETE /v1/tenants/{tenantId}/connections/{connectionId}` - Delete connection

### Connection Tokens (TaoFlow)

- `GET /v1/connection-tokens/connections` - List user connections (requires delegated token)
- `POST /v1/connection-tokens/{connectionId}/access-token` - Get provider access token (delegation token in body)
- `GET /v1/connection-tokens/provider-data` - Get provider data using connection token

### Webhooks

- `POST /webhooks/nango` - Receive Nango webhook notifications

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

# Central Service (Wuwei) API
CENTRAL_SERVICE_URL=https://your-wuwei-api.com
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

The database will be automatically configured using Sequelize migrations.

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
POST /v1/tenants/my-tenant/connections
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

### 5. Central Service Notification

Connections Service forwards to Wuwei Central Service:

```http
POST https://your-wuwei-api.com/webhooks/connections
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

## Connection Token Flow (TaoFlow Specification)

The TaoFlow connection system allows external clients to get provider access tokens using delegation tokens:

### 1. List User Connections

```http
GET /v1/connection-tokens/connections
Authorization: Bearer <delegated-token>
```

Returns active connections for the authenticated user.

### 2. Get Provider Access Token

```http
POST /v1/connection-tokens/{connectionId}/access-token
Content-Type: application/json

{
  "delegationToken": "JWT from WA",
  "minTtlSeconds": 300,
  "requestedScopes": ["repo", "user:email"]
}
```

**TaoFlow Security Validation:**

1. **JWT**: Decode and validate claims: `aud=connections-service`, `azp=taoflow-backend`, `iss=wuwei-backend`, `exp`, `jti` (single‑use cache)
2. **Tuple match**: `tenantId` (path) == `tid` (token), `connectionId` (path) == `cid` (token)
3. **Ownership**: Look up `cid` in SoR; ensure `{tenant, sub}` owns it and `status=active`
4. **Version check**: `cver` (token) == stored `connectionVersion`
5. **Scope check**: `requestedScopes` (body) ⊆ `scp` (token) ⊆ `authorizedScopes` (stored)
6. **TTL policy**: If cached vendor access token has `expiresIn >= minTtlSeconds`, return it; else refresh
7. **Audit**: Log access token request

Returns the actual provider access token:

```json
{
  "accessToken": "opaque vendor token",
  "expiresIn": 900,
  "authorizedScopes": ["repo", "user:email"],
  "vendor": {
    "accountId": "github-user-123"
  }
}
```

### 3. Access Provider Data (Legacy)

```http
GET /v1/connection-tokens/provider-data
Authorization: Bearer <connection-token>
```

Returns provider connection metadata and status (no actual tokens exposed):

```json
{
  "success": true,
  "data": {
    "connection": {
      "id": "conn-123",
      "provider": "github",
      "scopes": ["repo", "user:email"],
      "status": "active",
      "metadata": {}
    },
    "providerAccount": {
      "account_id": "github-user-id",
      "display_name": "John Doe"
    },
    "hasValidToken": true,
    "lastAccessedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## Security

### mTLS Configuration

For production, configure mutual TLS:

1. Generate certificates for service-to-service communication
2. Set certificate paths in environment variables (`MTLS_CERT_PATH`, `MTLS_KEY_PATH`, `MTLS_CA_PATH`)
3. Configure Central Service (Wuwei) with corresponding client certificates
4. Enable mTLS middleware in routes (currently disabled for development)

**Note**: In development mode, mTLS verification is automatically skipped. For production deployment, ensure mTLS middleware is enabled in the route definitions.

### Webhook Verification

- Nango webhooks are verified using HMAC signatures
- Central Service webhooks use mTLS client certificates

### Audit Logging

The service maintains comprehensive audit logs for all operations:

- **Automatic Logging**: All connection events are logged automatically
- **Data Sanitization**: Sensitive information (tokens, secrets, keys) is automatically redacted
- **Multi-Actor Support**: Tracks actions from `wuwei`, `taoflow`, and `connections-service`
- **Structured Data**: JSON-based details storage for flexible querying
- **Tenant Isolation**: Logs are associated with tenant and user identifiers

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

The service provides comprehensive logging at multiple levels:

- **Connection Lifecycle**: Creation, updates, and deletion events
- **Webhook Processing**: Nango webhook receipt and Central Service forwarding
- **Audit Trail**: All operations logged to database with sanitized details
- **Error Handling**: Detailed error logging with context
- **Security Events**: mTLS verification and authentication attempts

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

### Development Notes

- **mTLS Authentication**: Currently disabled in route definitions for development ease. Enable `requireMTLSAuth` middleware before production deployment.
- **Database Migrations**: Run `npm run migrate` after pulling latest code to ensure database schema is up to date.
- **Environment Variables**: Copy `.env.example` if available, or configure manually based on the environment section above.

## Production Deployment

1. **Enable mTLS**: Configure client certificates
2. **Secure Environment**: Use proper secrets management
3. **Monitoring**: Set up health checks and alerting
4. **Scaling**: Service is stateless and can be horizontally scaled

## Troubleshooting

### Common Issues

1. **"Nango webhook signature invalid"**
   - Check `NANGO_WEBHOOK_SECRET` matches Nango dashboard configuration
2. **"CENTRAL_SERVICE_URL not configured"**
   - Ensure `CENTRAL_SERVICE_URL` environment variable is set to your Wuwei API endpoint
3. **"mTLS certificate required"** (Production only)

   - Ensure certificates are properly configured
   - Check certificate paths and permissions
   - Verify mTLS middleware is enabled in routes

4. **"Connection not found"**
   - Verify connectionId is correct
   - Check Nango dashboard for connection status
   - Ensure connection exists in database

### Debug Steps

1. Check service logs for detailed error messages with `LOG_LEVEL=debug`
2. Verify Nango webhook delivery in dashboard
3. Test Central Service connectivity
4. Validate environment configuration
5. Check audit logs for operation history

## License

MIT
