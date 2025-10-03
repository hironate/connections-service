# Connections Service

A secure OAuth connections service that integrates with Nango token vault for managing third-party integrations.

## Architecture Overview

This service acts as a secure proxy between your application and OAuth providers, using Nango as the token vault. It follows this sequence:

1. **Client Application** → **Connections Service** → **Nango** → **OAuth Provider**
2. **OAuth Provider** → **Connections Service** → **Nango** (oauth callback)
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

#### List Connections

```http
GET /v1/tenants/my-tenant/connections?user=user-oidc-subject
```

**Response:**

```json
{
  "connections": [
    {
      "id": "conn-123",
      "provider": "github-oauth-app",
      "status": "active",
      "authorizedScopes": ["repo", "user:email"],
      "createdAt": "2024-01-01T12:00:00.000Z",
      "lastAccessedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Get Connection

```http
GET /v1/tenants/my-tenant/connections/conn-123
```

**Response:**

```json
{
  "connection": {
    "id": "conn-123",
    "provider": "github-oauth-app",
    "status": "active",
    "authorizedScopes": ["repo", "user:email"],
    "createdAt": "2024-01-01T12:00:00.000Z",
    "lastAccessedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Update Connection

```http
PATCH /v1/tenants/my-tenant/connections/conn-123
Content-Type: application/json

{
  "sub": "user-oidc-subject",
  "provider": "github-oauth-app",
  "scopes": ["repo", "user:email", "admin:org"]
}
```

**Response:**

```json
{
  "authorizationUrl": "https://github-oauth-app.com/login/oauth/authorize?..."
}
```

#### Delete Connection

```http
DELETE /v1/tenants/my-tenant/connections/conn-123
```

**Response:**

```json
{
  "deleted": true,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Connection Tokens (TaoFlow)

- `POST /v1/tenants/{tenantId}/connections/{connectionId}/access-tokens` - Get provider access token (delegation token in body)

### Webhooks

- `POST /webhooks/nango` - Receive Nango webhook notifications

### Health & Monitoring

- `GET /health` - Service health check

## OAuth Flow Example

### 1. Initiate Connection

```http
POST /v1/tenants/my-tenant/connections
Content-Type: application/json

{
  "sub": "user-oidc-subject",
  "provider": "github-oauth-app",
  "scopes": ["repo", "user:email"]
}
```

**Response:**

```json
{
  "connectionId": "uuid-generated-by-service",
  "authorizationUrl": "https://github-oauth-app.com/login/oauth/authorize?..."
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
  "providerConfigKey": "github-oauth-app",
  "connectionMetadata": {
    "tenantId": "my-tenant",
    "sub": "user-oidc-subject"
  },
  "authorizedScopes": ["repo", "user:email"],
  "vendor": {
    "account_id": "github-oauth-app-user-id",
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
  "provider": "github-oauth-app",
  "authorizedScopes": ["repo", "user:email"],
  "providerAccountId": "github-oauth-app-user-id",
  "displayName": "John Doe",
  "metadata": {
    "username": "johndoe",
    "avatar": "https://github-oauth-app.com/avatar.jpg"
  }
}
```

## Connection Token Flow (TaoFlow Specification)

The TaoFlow connection system allows external clients to get provider access tokens using delegation tokens:

### Get Provider Access Token

```http
POST /v1/tenants/{tenantId}/connections/{connectionId}/access-tokens
Content-Type: application/json

{
  "delegationToken": "JWT from WA",
  "minTtlSeconds": 300
}
```

**TaoFlow Security Validation:**

1. **JWT**: Verify signature and validate claims: `aud=connections-service`, `azp=taoflow-backend`, `iss=wuwei-backend`, `exp`, `jti` (single‑use cache)
2. **Tuple match**: `tenantId` (path) == `tid` (token), `connectionId` (path) == `cid` (token)
3. **Ownership**: Look up `cid` in SoR; ensure `{tenant, sub}` owns it and `status=active`
4. **Version check**: `cver` (token) == stored `connectionVersion`
5. **Scope check**: `scp` (token) ⊆ `authorizedScopes` (stored)
6. **TTL policy**: If cached vendor access token has `expiresIn >= minTtlSeconds`, return it; else refresh
7. **Audit**: Log access token request

Returns the actual provider access token:

```json
{
  "access_token": "opaque vendor token",
  "expires_in": 900,
  "scopes": ["repo", "user:email"],
  "vendor": {
    "accountId": "github-oauth-app-user-123",
    "displayName": "John Doe"
  }
}
```

## Security

### Webhook Verification

- Nango webhooks are verified using HMAC signatures
- Central Service webhooks use mTLS client certificates

### JWT Signature Verification

- Delegation tokens are verified using JWT signature validation
- Tokens must be signed with the configured `DELEGATION_TOKEN_SECRET`
- Supports HS256, HS512, and RS256 algorithms
- Validates issuer (`wuwei-backend`) and audience (`connections-service`) claims

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

## Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "connections-service",
  "version": "1.0.0",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "nango": {
    "configured": true,
    "url": "https://api.nango.dev"
  }
}
```

## License

MIT
