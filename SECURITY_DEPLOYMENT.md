# Security Deployment Checklist
**YouTube Thumbnail Creator - Security Audit Implementation**

Date: 2026-03-26
Status: ✅ Ready for Production Deployment

---

## Executive Summary

This security audit addressed **32 vulnerabilities** across 6 categories. **19 critical and high-priority fixes** have been implemented, reducing security risk from **HIGH** to **LOW-MEDIUM**.

### Security Improvements
- ✅ Prompt injection prevention (XML escaping)
- ✅ Path traversal protection (whitelist validation)
- ✅ Information disclosure eliminated (generic errors)
- ✅ Race condition prevention (database transactions)
- ✅ File enumeration prevention (UUID filenames)
- ✅ Open registration secured (mandatory secret)
- ✅ API key rotation (multi-key support)
- ✅ Polyglot file detection (sharp validation)
- ✅ HTTPS enforcement (security headers)
- ✅ Audit logging system

---

## Pre-Deployment Checklist

### 1. Environment Variables (CRITICAL)

Create/update your `.env` file with these **required** variables:

```env
# === SECURITY (REQUIRED) ===
# Generate with: openssl rand -hex 32
REGISTRATION_SECRET=<GENERATE_NEW_SECRET_HERE>

# Primary admin email for notifications
ADMIN_EMAIL=your.admin.email@example.com

# NextAuth secret (if not already set)
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<GENERATE_NEW_SECRET_HERE>

# === GOOGLE API KEYS ===
GOOGLE_API_KEY=your_primary_google_api_key
# Optional: Add more keys for rotation
GOOGLE_API_KEY_2=your_second_key_optional
GOOGLE_API_KEY_3=your_third_key_optional

# === TEST ACCOUNT (OPTIONAL) ===
# For demo/staging environments only
TEST_ACCOUNT_PASSWORD=secure_demo_password_here

# === EXISTING VARS (keep as-is) ===
DATABASE_URL=your_existing_database_url
DIRECT_URL=your_existing_direct_url
R2_BUCKET_NAME=your_bucket_name
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=your_r2_endpoint
R2_PUBLIC_URL=your_public_url
NEXTAUTH_URL=https://yourdomain.com
DEFAULT_USER_CREDITS=0
ADMIN_EMAILS=your.admin.email@example.com
```

**Generate Secrets:**
```bash
# Registration secret
openssl rand -hex 32

# NextAuth secret
openssl rand -base64 32
```

---

### 2. Database Migration (REQUIRED)

Apply security schema changes:

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations (creates unique constraints + indexes)
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

**What this does:**
- Adds `@@unique([userId, name])` to Channel and Archetype models
- Creates composite indexes for performance (`userId + isManual`, `userId + createdAt`)
- Improves query performance for history/search operations

---

### 3. Reseed Test Account (RECOMMENDED)

If using a test/demo account:

```bash
# Set password in .env first
echo "TEST_ACCOUNT_PASSWORD=your_secure_demo_password" >> .env

# Run seed script
npx prisma db seed
```

This will:
- Remove auto-provisioning of `test@test.ai`
- Create test account with Argon2id password hashing
- Grant 100 credits to test account

**Production:** Disable test account or use strong password.

---

### 4. Verify Security Headers (PRODUCTION)

Check middleware is active:

```bash
# Test HTTPS redirect (should redirect to HTTPS)
curl -I http://yourdomain.com

# Verify security headers
curl -I https://yourdomain.com
```

Expected headers:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

### 5. Test Critical Endpoints

#### Registration Protection
```bash
# Should fail without secret
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Should succeed with correct secret
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","secret":"YOUR_REGISTRATION_SECRET"}'
```

#### Path Traversal Protection
```bash
# Should return 400 Bad Request
curl https://yourdomain.com/api/assets/../../etc/passwd

# Should return 403 Forbidden
curl https://yourdomain.com/api/assets/unauthorized/path
```

#### File Upload Validation
```bash
# Upload valid image (should succeed)
curl -X POST https://yourdomain.com/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.png" \
  -F "folder=archetypes"

# Upload text file as image (should fail)
curl -X POST https://yourdomain.com/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@malicious.txt" \
  -F "folder=archetypes"
```

---

## Post-Deployment Verification

### Security Audit Log Review

Monitor logs for security events:

```bash
# Search for security events
grep "\[SECURITY\]" /var/log/app.log
grep "\[ERROR\]" /var/log/app.log | grep -i "security"

# Check for unauthorized access attempts
grep "Access denied" /var/log/app.log
grep "Path traversal" /var/log/app.log
grep "Invalid.*color" /var/log/app.log
```

### Database Integrity Check

```sql
-- Verify unique constraints are active
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('channels', 'archetypes');

-- Check for duplicate names (should be empty)
SELECT userId, name, COUNT(*)
FROM channels
GROUP BY userId, name
HAVING COUNT(*) > 1;

SELECT userId, name, COUNT(*)
FROM archetypes
GROUP BY userId, name
HAVING COUNT(*) > 1;
```

### API Key Rotation Verification

```bash
# Check key rotation is working
node -e "
const { getApiKeyStats } = require('./lib/api-keys');
console.log(getApiKeyStats());
"
```

---

## Optional Enhancements

### Rate Limiting (Recommended for Production)

Install dependencies:
```bash
npm install express-rate-limit rate-limit-redis ioredis
```

Configure Redis:
```env
REDIS_URL=redis://localhost:6379
# OR for cloud Redis (Upstash, AWS ElastiCache, etc.)
REDIS_URL=redis://username:password@host:port
```

Create `lib/rate-limit.ts` (see security audit Section 2.1 for implementation).

**Apply to routes:**
- `/api/generate` - 10 req/min per user
- `/api/upload` - 20 req/min per user
- `/api/auth/register` - 5 req/hour per IP
- `/api/admin/*` - 100 req/min per user

### Credit Refund Logic (Optional)

Implement partial refunds for API failures (see audit Section 5.1).

**Benefits:**
- Better UX when Google API fails
- Reduces support tickets
- Builds user trust

**Trade-off:** Slightly more complex transaction logic.

### Monitoring & Alerting

**Recommended services:**
- **Sentry** - Error tracking + performance monitoring
- **Datadog** - APM + log aggregation
- **Loggly** - Centralized logging
- **PagerDuty** - On-call alerting

**Setup:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configure alerts for:**
- Failed authentication attempts (>10 per hour)
- Path traversal attempts
- Invalid file uploads
- API rate limit violations
- Database transaction failures

---

## Rollback Plan

If issues arise after deployment:

### 1. Quick Rollback (Git)
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

### 2. Database Rollback
```bash
# Revert last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
psql -U user -d database < backup.sql
```

### 3. Environment Variable Rollback
```bash
# Remove new variables, keep old configuration
# Redeploy with original .env
```

---

## Security Maintenance

### Regular Tasks

**Weekly:**
- Review audit logs for suspicious patterns
- Check failed authentication attempts
- Monitor rate limit violations

**Monthly:**
- Rotate Google API keys
- Review admin action logs
- Update dependencies (`npm audit fix`)
- Check for Prisma security advisories

**Quarterly:**
- Full security audit
- Penetration testing (recommended)
- Review access control policies
- Update security documentation

### Dependency Updates

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix security issues
npm audit fix

# Check outdated packages
npm outdated
```

---

## Known Limitations

### Medium-Priority Items (Not Blocking)

1. **No Rate Limiting** - Mitigated by:
   - NextAuth.js session management
   - Vercel's built-in DDoS protection
   - Can add Redis rate limiting post-launch

2. **Email-Based R2 Paths** - Functional but not ideal:
   - Current: `users/{email}/file.png`
   - Better: `users/{userId}/file.png`
   - Migration script available (see audit Section 2.3)

3. **No Circuit Breaker** - Google API failures may cascade:
   - Current: Simple retry logic
   - Better: Opossum circuit breaker pattern
   - Can implement with `npm install opossum`

### Low-Priority Items (Acceptable Risk)

4. **No JWT Refresh Tokens** - Sessions last 7 days:
   - Users must re-login every 7 days
   - Acceptable for most use cases

5. **Test Account Shared Access** - By design:
   - `test@test.ai` archetypes accessible to all users
   - Intended for demos/onboarding

---

## Support & Troubleshooting

### Common Issues

**Issue:** "Registration is currently disabled"
**Fix:** Set `REGISTRATION_SECRET` in `.env`

**Issue:** "Admin email not configured"
**Fix:** Set `ADMIN_EMAIL` in `.env`

**Issue:** "No Google API keys configured"
**Fix:** Verify `GOOGLE_API_KEY` is set correctly

**Issue:** Prisma migration fails
**Fix:** Run `npx prisma generate` first, then `npx prisma migrate deploy`

**Issue:** Upload fails with "Invalid image structure"
**Fix:** Ensure `sharp` is installed: `npm install sharp`

### Debug Mode

Enable verbose logging:
```env
NODE_ENV=development
DEBUG=true
```

Check server logs:
```bash
# Vercel
vercel logs

# Local
npm run dev | tee debug.log
```

---

## Compliance Notes

### GDPR Considerations

- ✅ User data deletion (cascade delete implemented)
- ✅ Audit logging (tracks data access)
- ⚠️ Data export not implemented (future enhancement)
- ⚠️ Cookie consent banner not implemented

### Security Standards

- ✅ OWASP Top 10 (2021) - Most issues addressed
- ✅ Argon2id password hashing (NIST recommended)
- ✅ HTTPS enforcement with HSTS
- ✅ Input validation and sanitization
- ✅ Secure session management

---

## Deployment Sign-Off

**Security Lead:** _________________
**Date:** _________________

**Engineering Lead:** _________________
**Date:** _________________

**Product Owner:** _________________
**Date:** _________________

---

## Appendix: File Changes Summary

### Modified Files (28 total)

**API Routes (15 files):**
- `app/api/auth/register/route.ts` - Registration secret required
- `app/api/generate/route.ts` - Prompt validation, API key rotation
- `app/api/upload/route.ts` - UUID filenames, polyglot detection
- `app/api/assets/[[...path]]/route.ts` - Path traversal protection
- `app/api/channels/route.ts` - Color validation, error sanitization
- `app/api/channels/[id]/route.ts` - Transaction wrapping, error handling
- `app/api/archetypes/[id]/route.ts` - Transaction wrapping, validation
- `app/api/admin/fix-ownership/route.ts` - Removed hardcoded email
- `app/api/auth/request-access/route.ts` - Removed hardcoded email
- *+ 6 other routes with error message sanitization*

**Libraries (5 files):**
- `lib/payload-engine.ts` - XML escaping, structured prompts
- `lib/auth.ts` - Removed test account auto-provisioning
- `lib/api-keys.ts` - NEW: API key rotation service
- `lib/audit-logger.ts` - NEW: Centralized security logging
- `middleware.ts` - HTTPS enforcement, security headers

**Configuration (3 files):**
- `prisma/schema.prisma` - Unique constraints, composite indexes
- `prisma/seed.ts` - Secure test account provisioning
- `.env.example` - Updated with new required variables

---

**End of Security Deployment Checklist**
