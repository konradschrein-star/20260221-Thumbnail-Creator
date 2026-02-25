# Security & Best Practices

This document outlines the security measures and best practices implemented in the YouTube Thumbnail Generator.

## ✅ Implemented Security Features

### 1. Environment Variables Protection

**Status**: ✅ Implemented

- `.env` file is gitignored and never committed
- `.env.example` provides a template with placeholder values
- All sensitive keys stored in environment variables
- No hardcoded API keys or credentials in codebase

**Files Protected**:
- `.env` - Contains `GOOGLE_API_KEY`
- Database file (`prisma/dev.db`) - gitignored

### 2. File Upload Security

**Status**: ✅ Implemented

**Location**: `app/api/upload/route.ts`

**Protections**:
- ✅ File type validation (only JPG, JPEG, PNG, WEBP)
- ✅ File size limit (5MB maximum)
- ✅ Sanitized filenames (removes special characters)
- ✅ Files stored in controlled directory (`public/archetypes/`)
- ✅ Unique filenames prevent collisions
- ✅ Server-side validation (not just client-side)

**Code Example**:
```typescript
// File type validation
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) {
  return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
}

// File size validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
}
```

### 3. Input Validation

**Status**: ✅ Implemented

**Protections**:
- All API routes validate required fields
- Channel IDs and Archetype IDs validated before database queries
- Prisma provides parameterized queries (prevents SQL injection)
- Error messages don't leak sensitive information

**Example**:
```typescript
// Channel ID validation
if (!channelId || !archetypeId) {
  return NextResponse.json(
    { error: 'channelId and archetypeId are required' },
    { status: 400 }
  );
}
```

### 4. Database Security

**Status**: ✅ Implemented

**Protections**:
- Database file (`prisma/dev.db`) is gitignored
- Cascade deletes configured properly (no orphaned records)
- Prisma ORM prevents SQL injection
- Database migrations tracked in version control
- No raw SQL queries (all through Prisma)

**Gitignored Files**:
```
/prisma/dev.db
/prisma/dev.db-journal
*.db
*.db-journal
*.db-shm
*.db-wal
```

### 5. Sensitive Assets Protection

**Status**: ✅ Implemented

**Gitignored Directories**:
- `/assets/test/` - Test reference images
- `/public/archetypes/` - Uploaded archetype images
- `/public/generated/` - Generated thumbnails
- `/.claude/` - Local plans and memory

**Rationale**: These directories may contain:
- Proprietary reference images
- User-uploaded content
- Generated thumbnails (potential copyright concerns)

### 6. Error Handling

**Status**: ✅ Implemented

**Protections**:
- Errors don't expose stack traces to clients
- API errors return generic messages
- Detailed errors logged server-side only
- Status codes used appropriately (400, 404, 500)

**Example**:
```typescript
try {
  // operation
} catch (error: any) {
  console.error('Server error:', error); // Server-side only
  return NextResponse.json(
    { error: 'Internal server error' }, // Generic client message
    { status: 500 }
  );
}
```

### 7. TypeScript Type Safety

**Status**: ✅ Implemented

**Benefits**:
- Compile-time type checking prevents runtime errors
- Strict mode enabled
- All API request/response types defined
- Reduces security vulnerabilities from type confusion

### 8. Dependency Security

**Status**: ✅ Implemented

**Practices**:
- Using official packages only
- Package versions locked in `package-lock.json`
- Regular updates recommended
- No deprecated packages

**Key Dependencies**:
- `next@^16.1.6` - Latest stable
- `@google/genai@^0.21.0` - Official Google SDK
- `@prisma/client@^5.22.0` - Stable ORM

## 🔜 Recommended for Production

The following security measures should be implemented before production deployment:

### 1. Authentication & Authorization

**Priority**: 🔴 Critical

**Recommended Solution**: NextAuth.js

```bash
npm install next-auth
```

**Features Needed**:
- User login/logout
- Session management
- Role-based access control (admin, user)
- Protect all `/api/*` routes

### 2. Rate Limiting

**Priority**: 🔴 Critical

**Recommended Solution**: `next-rate-limit` or Vercel rate limiting

```typescript
// Example with next-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

**Apply To**:
- `/api/generate` (expensive operation)
- `/api/upload` (prevent spam)
- All POST/PATCH/DELETE endpoints

### 3. CORS Configuration

**Priority**: 🟡 Medium

**Recommended**: Configure allowed origins

```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'your-domain.com' },
        ],
      },
    ];
  },
};
```

### 4. Content Security Policy (CSP)

**Priority**: 🟡 Medium

**Recommended**: Add security headers

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
];
```

### 5. Error Tracking & Monitoring

**Priority**: 🟡 Medium

**Recommended Solution**: Sentry

```bash
npm install @sentry/nextjs
```

**Benefits**:
- Real-time error alerts
- Performance monitoring
- User impact tracking
- Stack trace analysis

### 6. Logging

**Priority**: 🟢 Low

**Recommended Solution**: Winston or Pino

```bash
npm install winston
```

**Log Categories**:
- API requests/responses
- Generation job status
- File uploads
- Errors and exceptions

### 7. Database Backups

**Priority**: 🔴 Critical (for production)

**Recommended**:
- Automated daily backups of SQLite database
- Store backups in separate location
- Test restore procedures regularly

```bash
# Example backup script
cp prisma/dev.db backups/db-$(date +%Y%m%d).db
```

### 8. API Key Rotation

**Priority**: 🟡 Medium

**Recommended**:
- Rotate Google API keys quarterly
- Use different keys for dev/staging/production
- Monitor API usage and quotas
- Implement key rotation without downtime

### 9. Input Sanitization

**Priority**: 🟡 Medium

**Recommended**: DOMPurify or similar

```bash
npm install dompurify
```

**Apply To**:
- User-provided persona descriptions
- Video topics and thumbnail text
- Any user input displayed in UI

### 10. HTTPS Only

**Priority**: 🔴 Critical (for production)

**Recommended**:
- Enforce HTTPS in production
- Redirect HTTP to HTTPS
- Use HSTS headers

```typescript
// Middleware to enforce HTTPS
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect(301, `https://${req.headers.host}${req.url}`);
}
```

## 🔒 Security Checklist

Use this checklist before production deployment:

### Environment
- [ ] `.env` not committed to Git
- [ ] Production API keys configured
- [ ] `NODE_ENV=production` set
- [ ] Database backed up
- [ ] HTTPS configured

### Authentication
- [ ] NextAuth.js or equivalent installed
- [ ] All routes protected
- [ ] Session management configured
- [ ] User roles implemented

### API Security
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Input validation on all endpoints
- [ ] Error messages sanitized
- [ ] API keys rotated

### File Handling
- [ ] File upload limits enforced
- [ ] File types validated
- [ ] Filenames sanitized
- [ ] Storage quotas configured

### Monitoring
- [ ] Error tracking enabled (Sentry)
- [ ] Logging configured
- [ ] Performance monitoring active
- [ ] Alerts configured

### Headers & Security
- [ ] CSP headers configured
- [ ] Security headers added
- [ ] HSTS enabled
- [ ] X-Frame-Options set

### Testing
- [ ] Security scan performed
- [ ] Penetration testing completed
- [ ] Load testing done
- [ ] Backup restore tested

## 🐛 Vulnerability Reporting

If you discover a security vulnerability, please:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: [your-email]
3. Include detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Prisma Security Guide](https://www.prisma.io/docs/guides/security)

## 📝 Security Updates

Document security-related updates here:

### [v1.0.0] - 2026-02-25
- Initial security implementation
- Environment variable protection
- File upload validation
- Input sanitization
- Database security configured
- Sensitive assets gitignored

---

**Last Updated**: 2026-02-25
**Next Review**: Quarterly
