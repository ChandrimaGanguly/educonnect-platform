# Security Guidelines

## Environment Variables & Secrets Management

### Quick Start

1. **Copy the template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Generate strong secrets**:
   ```bash
   # Generate JWT secret
   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

   # Generate Session secret
   node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Update `.env.local`** with the generated secrets

4. **NEVER commit `.env.local`** to version control (already in `.gitignore`)

### Security Features

#### ✅ Weak Secret Detection

The application **will refuse to start** if it detects weak or default secrets. This prevents:
- Accidental deployment with insecure defaults
- Use of common/guessable passwords
- Reuse of example secrets from documentation

**Blocked patterns**:
- `CHANGE_ME`, `INSECURE_DEFAULT`, `your-super-secret`
- `changeme`, `password`, `secret`, `default`
- Common passwords: `12345`, `admin`, `postgres`

#### ✅ Environment File Hierarchy

The application loads environment variables in this order:
1. **`.env.local`** (preferred) - Your local secrets, gitignored
2. **`.env`** (fallback) - Template with instructions, safe to commit

This allows:
- Safe template in version control (`.env`)
- Secure local secrets outside version control (`.env.local`)
- Clear separation between defaults and actual secrets

### Production Deployment

**CRITICAL**: Do NOT use environment files in production. Use a secrets manager:

#### AWS Deployment
```bash
# Use AWS Secrets Manager
aws secretsmanager create-secret \
  --name educonnect/jwt-secret \
  --secret-string "$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
```

#### Docker Deployment
```bash
# Use Docker secrets
echo "$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" | \
  docker secret create jwt_secret -
```

#### Kubernetes Deployment
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: educonnect-secrets
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  SESSION_SECRET: <base64-encoded-secret>
```

### Secrets Rotation

Rotate secrets periodically and immediately after:
- Security incident or suspected compromise
- Team member departure with secrets access
- Accidental commit of secrets (even if removed)

### Verification

Test your secrets are strong:
```bash
# Should succeed with .env.local
npm run dev

# Should fail with weak secrets
JWT_SECRET=changeme npm run dev
```

## Reporting Security Issues

If you discover a security vulnerability, please email security@educonnect.org with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

**Do NOT** create a public GitHub issue for security vulnerabilities.

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2026-01-16 | Internal Security Agent | Critical: Weak default secrets | ✅ Fixed |
| 2026-01-16 | Internal Security Agent | High: Session enumeration | 🔄 Pending |
| 2026-01-16 | Internal Security Agent | High: Timing attack in auth | 🔄 Pending |

---

**Last Updated**: 2026-01-16
**Next Review**: 2026-02-16
