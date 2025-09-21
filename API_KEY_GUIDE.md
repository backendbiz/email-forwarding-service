# API Key Authentication Guide

## Overview

The Email Forwarding Service now supports token-based authentication using API keys. This provides an additional security layer for protecting your endpoints while maintaining backward compatibility.

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# API Key Authentication
EFS_API_KEY_REQUIRED=false          # Set to true to enable authentication
EFS_API_KEYS=key1,key2,key3        # Comma-separated list of valid API keys
EFS_API_KEY_HEADER=x-api-key       # Header name for API key (default: x-api-key)
```

### Example Configuration

```bash
# Enable API key authentication
EFS_API_KEY_REQUIRED=true

# Multiple API keys for different clients/environments
EFS_API_KEYS=efs_prod_abc123,efs_staging_def456,efs_dev_xyz789

# Custom header name (optional)
EFS_API_KEY_HEADER=x-api-key
```

## Generating API Keys

### Using the Built-in Generator

```bash
# Generate a single API key
node scripts/generate-api-key.js

# Generate multiple API keys
node scripts/generate-api-key.js 5

# Generate keys with custom prefix
node scripts/generate-api-key.js 3 myapp
```

### Manual Generation

API keys should be:
- At least 32 characters long
- Cryptographically secure random strings
- URL-safe (base64url encoding recommended)
- Prefixed for easy identification (e.g., `efs_`, `prod_`, etc.)

Example secure API key format:
```
efs_FroVcwsII1XcKeNqH5g4_k8QfmueDhyFsteC_7CZdD0
```

## Usage

### Client Requests

Include the API key in the request header:

```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: efs_your-api-key-here" \
  -d '{"url": "https://mail-settings.google.com/..."}'
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3333/accept-forwarding', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'efs_your-api-key-here'
  },
  body: JSON.stringify({
    url: 'https://mail-settings.google.com/...'
  })
});
```

### Python

```python
import requests

headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'efs_your-api-key-here'
}

data = {
    'url': 'https://mail-settings.google.com/...'
}

response = requests.post(
    'http://localhost:3333/accept-forwarding',
    headers=headers,
    json=data
)
```

## Endpoint Protection

### Protected Endpoints

When `EFS_API_KEY_REQUIRED=true`, these endpoints require authentication:
- `POST /accept-forwarding` - Main email forwarding endpoint

### Public Endpoints

These endpoints are always accessible without authentication:
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics  
- `GET /api-docs` - API documentation

## Error Responses

### Missing API Key (401)

```json
{
  "error": "Authentication required",
  "message": "Missing x-api-key header",
  "requestId": "abc123def456",
  "timestamp": "2025-09-21T10:30:00.000Z"
}
```

### Invalid API Key (403)

```json
{
  "error": "Authentication failed", 
  "message": "Invalid API key",
  "requestId": "abc123def456",
  "timestamp": "2025-09-21T10:30:00.000Z"
}
```

## Security Best Practices

### Key Management

1. **Generate Secure Keys**: Use the provided generator or cryptographically secure methods
2. **Environment Separation**: Use different keys for dev/staging/production
3. **Regular Rotation**: Rotate API keys periodically
4. **Secure Storage**: Store keys in environment variables or secure vaults
5. **Never Commit Keys**: Add `.env` to `.gitignore`

### Access Control

1. **Principle of Least Privilege**: Give each client only the keys they need
2. **Key Prefixes**: Use prefixes to identify key purposes (`prod_`, `staging_`, `client_`)
3. **Monitoring**: Log authentication attempts for security monitoring
4. **Rate Limiting**: Combine with rate limiting for additional protection

### Deployment

```bash
# Production environment
EFS_API_KEY_REQUIRED=true
EFS_API_KEYS=efs_prod_secure_key_1,efs_prod_secure_key_2

# Development environment  
EFS_API_KEY_REQUIRED=false
EFS_API_KEYS=efs_dev_key_1
```

## Testing

### Manual Testing

```bash
# Test without API key (should fail if auth enabled)
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -d '{"url": "test"}'

# Test with invalid API key (should fail)
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: invalid-key" \
  -d '{"url": "test"}'

# Test with valid API key (should work)
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: efs_your-valid-key" \
  -d '{"url": "test"}'
```

### Automated Testing

Run the included test script:

```bash
# Start the server
npm run dev

# In another terminal, run tests
node test-api-key.js
```

## Monitoring & Logging

### Authentication Events

The service logs all authentication events:

```json
{
  "level": "warn",
  "message": "API key missing",
  "method": "POST",
  "url": "/accept-forwarding", 
  "ip": "127.0.0.1",
  "userAgent": "curl/7.68.0",
  "requestId": "abc123def456"
}
```

```json
{
  "level": "warn", 
  "message": "Invalid API key",
  "method": "POST",
  "url": "/accept-forwarding",
  "ip": "127.0.0.1", 
  "userAgent": "curl/7.68.0",
  "requestId": "abc123def456",
  "apiKeyPrefix": "invalid-k..."
}
```

### Metrics

Authentication metrics are available at `/metrics`:
- Request counts by authentication status
- Failed authentication attempts
- API key usage patterns

## Migration Guide

### Enabling Authentication

1. **Generate API Keys**:
   ```bash
   node scripts/generate-api-key.js 3
   ```

2. **Update Environment**:
   ```bash
   EFS_API_KEY_REQUIRED=true
   EFS_API_KEYS=generated-key-1,generated-key-2,generated-key-3
   ```

3. **Update Clients**: Add API key headers to all client requests

4. **Test**: Verify authentication works as expected

5. **Deploy**: Roll out changes with proper monitoring

### Backward Compatibility

- Set `EFS_API_KEY_REQUIRED=false` to disable authentication
- Existing clients continue to work without changes
- Public endpoints remain accessible
- Gradual migration supported

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Missing API key header
   - Solution: Add `x-api-key` header to request

2. **403 Forbidden**: Invalid API key
   - Solution: Check API key value and configuration

3. **Authentication Bypassed**: API key ignored
   - Solution: Ensure `EFS_API_KEY_REQUIRED=true` in environment

4. **Wrong Header Name**: Custom header not recognized
   - Solution: Check `EFS_API_KEY_HEADER` configuration

### Debug Mode

Enable debug logging to see authentication details:

```bash
LOG_LEVEL=debug
```

This will show successful authentication events and help diagnose issues.
