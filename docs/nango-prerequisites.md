# Nango Integration Setup Guide

This guide explains how to set up Nango integrations to work with the Connections Service. Nango acts as the OAuth token vault, handling the OAuth flow and securely storing access tokens.

## Overview

The Connections Service integrates with Nango to provide secure OAuth connections. Here's how it works:

1. **Create Integration in Nango** → Configure OAuth provider settings
2. **Connections Service** → Uses Nango integration to create connections
3. **OAuth Flow** → Nango handles the OAuth flow with the provider
4. **Token Storage** → Nango securely stores and manages access tokens

## Prerequisites

- Nango account and dashboard access
- GitHub App credentials from GitHub
- Connections Service deployed and accessible

## GitHub App Integration Example

### Step 1: Create GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Fill in the details:
   - **GitHub App name**: `Your App Name`
   - **Homepage URL**: `https://your-app.com`
   - **User authorization callback URL**: `https://connections-service/oauth/callback`
4. Click "Create GitHub App"
5. Note down the **App ID** and **Client Secret**

### Step 2: Create Nango Integration

1. **Login to Nango Dashboard**

   - Go to your Nango dashboard
   - Navigate to "Integrations" section

2. **Create New Integration**

   - Click "Add Integration"
   - Choose "GitHub (Oauth App)" from the provider list
   - Or select "Custom" if GitHub isn't in the list

3. **Configure Integration Settings**

   ```json
   {
     "provider": "github-oauth-app",
     "provider_config_key": "github-oauth-app",
     "oauth_client_id": "your_github_app_id",
     "oauth_client_secret": "your_github_client_secret",
     "oauth_scopes": "repo,user:email,read:user",
     "oauth_redirect_uri": "https://your-connections-service.com/oauth/callback"
   }
   ```

4. **Set Webhook URL** (in nango environments)

   - Webhook URL: `https://your-connections-service.com/webhooks/nango`
   - This is where Nango will send connection status updates

5. **Save Integration**
   - Click "Save" to create the integration
   - Note the **Integration Key** (e.g., `github-oauth-app`)

### Step 3: Test the Integration

#### Create a Connection

```http
POST /v1/tenants/my-tenant/connections
Content-Type: application/json

{
  "sub": "user-123",
  "provider": "github-oauth-app",
  "scopes": ["repo", "user:email"]
}
```

**Response:**

```json
{
  "connectionId": "conn-abc123",
  "authorizationUrl": "https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...&scope=repo,user:email&state=..."
}
```

#### Complete OAuth Flow

1. **User Authorization**: Redirect user to `authorizationUrl`
2. **OAuth Callback**: GitHub redirects to `/oauth/callback`
3. **Nango Processing**: Nango exchanges code for tokens
4. **Webhook Notification**: Nango sends webhook to Connections Service
5. **Connection Active**: Connection is now ready to use

#### Get Access Token

```http
POST /v1/tenants/my-tenant/connections/conn-abc123/access-tokens
Content-Type: application/json

{
  "delegationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "minTtlSeconds": 300
}
```

**Response:**

```json
{
  "access_token": "ghp_xxxxxxxxxxxxxxxxxxxx",
  "expires_in": 3600,
  "scopes": ["repo", "user:email"],
  "vendor": {
    "accountId": "12345678",
    "displayName": "John Doe"
  }
}
```

## Integration Configuration Details

### Required Fields

- **provider**: The OAuth provider name (github-oauth-app for GitHub App)
- **provider_config_key**: Unique identifier for this integration
- **oauth_client_id**: GitHub App ID from the provider
- **oauth_client_secret**: GitHub App client secret from the provider
- **oauth_scopes**: Space-separated list of OAuth scopes
- **oauth_redirect_uri**: Callback URL (must match Connections Service callback)

### Optional Fields

- **oauth_authorization_url**: Custom authorization URL (if different from default)
- **oauth_token_url**: Custom token URL (if different from default)
- **oauth_user_info_url**: Custom user info URL (if different from default)

## Webhook Configuration

### Nango Webhook Settings

1. **Webhook URL**: `https://your-connections-service.com/webhooks/nango`
2. **Webhook Secret**: Generate a secret and add to Connections Service environment
3. **Events to Subscribe**:
   - `connection.activated`
   - `connection.deleted`
   - `connection.updated`

## Testing Your Integration

### 1. Test Connection Creation

```bash
curl -X POST https://your-connections-service.com/v1/tenants/test-tenant/connections \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "test-user-123",
    "provider": "github-oauth-app",
    "scopes": ["repo", "user:email"]
  }'
```

### 2. Test OAuth Flow

1. Open the `authorizationUrl` from the response
2. Complete OAuth authorization
3. Check webhook delivery in Nango dashboard
4. Verify connection status in Connections Service

### 3. Test Access Token Retrieval

```bash
curl -X POST https://your-connections-service.com/v1/tenants/test-tenant/connections/conn-abc123/access-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "delegationToken": "your_delegation_token_here",
    "minTtlSeconds": 300
  }'
```
