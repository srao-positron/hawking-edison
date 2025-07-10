# Security Improvements for AWS Credential Storage

## Immediate Actions Required:

### 1. Remove Hardcoded Service Key
```typescript
// ❌ NEVER DO THIS
const expectedServiceKey = process.env.VAULT_STORE_SERVICE_KEY || 'EY2LySQVi9ZOHzvKmkkMCR6sGCdc25G3KIO0oVzBbYM'

// ✅ DO THIS
const expectedServiceKey = process.env.VAULT_STORE_SERVICE_KEY
if (!expectedServiceKey) {
  return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
}
```

### 2. Use AWS Secrets Manager Instead
Instead of storing in database, use AWS Secrets Manager:
- Lambda can access it via IAM role (no keys needed)
- Edge Functions can retrieve via API with temporary credentials
- Automatic rotation support

### 3. Implement IP Whitelisting
Restrict the vault-store endpoint to only Lambda IPs:
```typescript
const allowedIPs = process.env.LAMBDA_IP_RANGES?.split(',') || []
const clientIP = request.headers.get('x-forwarded-for')
if (!allowedIPs.includes(clientIP)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 4. Use Asymmetric Encryption
Instead of a shared service key:
- Lambda has a private key
- Vercel has the public key
- Lambda signs requests, Vercel verifies

### 5. Implement Request Signing
```typescript
// Lambda side
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(JSON.stringify(payload) + timestamp)
  .digest('hex')

// Vercel side - verify signature
const expectedSignature = crypto
  .createHmac('sha256', secretKey)
  .update(JSON.stringify(body) + timestamp)
  .digest('hex')

if (signature !== expectedSignature) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
}
```

### 6. Add Request Expiry
```typescript
const timestamp = request.headers.get('x-timestamp')
const now = Date.now()
if (Math.abs(now - parseInt(timestamp)) > 60000) { // 1 minute
  return NextResponse.json({ error: 'Request expired' }, { status: 401 })
}
```

### 7. Encrypt Credentials in Database
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Encrypt before storing
const iv = randomBytes(16)
const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv)
const encrypted = cipher.update(secretAccessKey, 'utf8', 'hex') + cipher.final('hex')

// Store: encrypted value + iv + auth tag
```

### 8. Use Different Keys for Different Environments
- Development: Different service key
- Staging: Different service key  
- Production: Different service key + additional security

### 9. Implement Audit Logging
```sql
CREATE TABLE credential_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_by TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN
);
```

### 10. Regular Key Rotation
- Rotate service keys monthly
- Rotate AWS credentials quarterly
- Automate via GitHub Actions

## Architecture Improvements:

### Option 1: Direct Lambda → Supabase (Remove Vercel Proxy)
- Configure Lambda with Supabase credentials via environment variables
- Use VPC endpoints for secure communication
- No public endpoint needed

### Option 2: Use AWS Systems Manager Parameter Store
- Lambda writes to Parameter Store
- Edge Functions read from Parameter Store using temporary credentials
- Built-in encryption and access control

### Option 3: Mutual TLS (mTLS)
- Lambda and Vercel exchange certificates
- Only authenticated clients can connect
- Strongest security but more complex

## Immediate Fix:

At minimum, remove the hardcoded key immediately:

```bash
# Remove from code
# Regenerate a new key
# Update all environments
# Audit access logs
```

Remember: **Never commit secrets to code**, even as fallbacks!