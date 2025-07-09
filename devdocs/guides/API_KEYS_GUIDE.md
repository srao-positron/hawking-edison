# Hawking Edison API Keys Guide

## Overview

Hawking Edison supports two authentication methods:
1. **Session-based authentication** - For web applications (using Supabase Auth)
2. **API key authentication** - For programmatic access (CLI tools, CI/CD, third-party apps)

## Getting Started

### 1. Generate an API Key

1. Log in to your Hawking Edison account
2. Navigate to Settings → API Keys
3. Click "Create New API Key"
4. Enter a descriptive name (e.g., "Production App", "CI/CD Pipeline")
5. Select environment: `live` or `test`
6. Set expiration (optional, max 365 days)
7. Click "Create Key"

**Important**: Copy your API key immediately! You won't be able to see it again.

### 2. API Key Format

API keys follow this format:
```
hke_{environment}_{random_string}
```

Example:
```
hke_live_Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90
```

### 3. Using Your API Key

You can authenticate using any of these methods:

#### Authorization Header (Recommended)
```bash
curl -X POST https://your-instance.supabase.co/functions/v1/interact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hke_live_xxx" \
  -d '{"input": "Hello, Hawking Edison!"}'
```

#### X-API-Key Header
```bash
curl -X POST https://your-instance.supabase.co/functions/v1/interact \
  -H "Content-Type: application/json" \
  -H "X-API-Key: hke_live_xxx" \
  -d '{"input": "Hello, Hawking Edison!"}'
```

#### Query Parameter
```bash
curl -X POST "https://your-instance.supabase.co/functions/v1/interact?api_key=hke_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello, Hawking Edison!"}'
```

## API Endpoints

All endpoints support API key authentication:

### Main Orchestrator
```
POST /functions/v1/interact
{
  "input": "Your request here",
  "provider": "anthropic" // optional, defaults to Claude Opus 4
}
```

### Knowledge Management
```
POST /functions/v1/databank/add
{
  "content": "Knowledge content",
  "url": "https://source.url",
  "metadata": {} // optional
}

POST /functions/v1/databank/search
{
  "query": "search query",
  "limit": 10 // optional
}

GET /functions/v1/databank/list
```

### Memory Management
```
POST /functions/v1/memories/save
{
  "streamName": "agent-123",
  "content": {},
  "interactionId": "uuid" // optional
}

POST /functions/v1/memories/search
{
  "query": "search query",
  "streamName": "agent-123", // optional
  "limit": 10 // optional
}

POST /functions/v1/memories/get
{
  "streamName": "agent-123",
  "limit": 50 // optional
}

GET /functions/v1/memories/streams
```

### API Key Management
```
GET /api/keys
POST /api/keys
{
  "name": "Key name",
  "expiresInDays": 90, // optional
  "environment": "live" // or "test"
}

PATCH /api/keys/{id}
{
  "action": "revoke"
}

DELETE /api/keys/{id}
```

## Code Examples

### Node.js/TypeScript
```typescript
import { HawkingEdisonClient } from './hawking-edison-client'

const client = new HawkingEdisonClient('hke_live_xxx')

// Make a request
const response = await client.interact('What is quantum computing?')
console.log(response.response)

// Add knowledge
await client.addKnowledge(
  'Quantum computing uses quantum mechanics...',
  'https://example.com/quantum-article'
)

// Search knowledge
const results = await client.searchKnowledge('quantum', 5)
```

### Python
```python
import requests

API_KEY = "hke_live_xxx"
BASE_URL = "https://your-instance.supabase.co"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

# Make a request
response = requests.post(
    f"{BASE_URL}/functions/v1/interact",
    headers=headers,
    json={"input": "What is quantum computing?"}
)

data = response.json()
print(data["data"]["response"])
```

### cURL
```bash
# Set your API key
export HAWKING_EDISON_API_KEY="hke_live_xxx"

# Make a request
curl -X POST https://your-instance.supabase.co/functions/v1/interact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HAWKING_EDISON_API_KEY" \
  -d '{"input": "Explain machine learning"}'
```

## Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Use appropriate environments**
   - Use `test` keys for development
   - Use `live` keys only in production

3. **Set expiration dates**
   - Rotate keys regularly
   - Set reasonable expiration (30-90 days)

4. **Limit key permissions**
   - Create separate keys for different applications
   - Revoke unused keys promptly

5. **Monitor usage**
   - Check `last_used_at` timestamps
   - Review active keys regularly

## Rate Limits

- 60 requests per minute per API key
- Automatic retry with exponential backoff
- 429 status code when rate limited

## Troubleshooting

### Common Errors

**401 Unauthorized**
- Check API key format
- Ensure key hasn't expired
- Verify key hasn't been revoked

**429 Too Many Requests**
- Implement rate limiting in your client
- Add delays between requests

**500 Internal Server Error**
- Check API status
- Verify request format
- Contact support if persistent

### Testing Your API Key
```bash
# Run the test script
npm run test:api-keys

# Or use the example client
API_KEY=hke_live_xxx tsx utils/example-api-client.ts "Test message"
```

## CLI Example

Save this as `hawking`:
```bash
#!/bin/bash
API_KEY=${HAWKING_EDISON_API_KEY:-$1}
INPUT=$2

if [ -z "$API_KEY" ] || [ -z "$INPUT" ]; then
  echo "Usage: hawking <api_key> <input>"
  echo "Or set HAWKING_EDISON_API_KEY environment variable"
  exit 1
fi

curl -s -X POST https://your-instance.supabase.co/functions/v1/interact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{\"input\": \"$INPUT\"}" | jq -r '.data.response'
```

Then use it:
```bash
chmod +x hawking
./hawking "What is the weather like?"
```

## Support

For API key issues or questions:
1. Check the troubleshooting guide above
2. Review API logs in your dashboard
3. Contact support with your key prefix (never share full keys)