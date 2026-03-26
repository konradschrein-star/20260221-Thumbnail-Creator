# Deployment Steps - Credit System

## ✅ What's Done

- ✅ All code committed and pushed to GitHub
- ✅ Vercel will auto-deploy the changes
- ✅ Refund functionality removed (no exploitation risk)
- ✅ Admin email set to: konrad.schrein@gmail.com
- ✅ Password: testva1234

---

## 🚀 Next Steps on Vercel

### 1. Environment Variables (Already Set)

You showed me these are already in Vercel:
- ✅ DATABASE_URL
- ✅ DIRECT_URL
- ✅ NEXTAUTH_SECRET
- ✅ All R2 credentials
- ✅ GOOGLE_API_KEY

**Add these new ones:**
```bash
DEFAULT_USER_CREDITS=0
ADMIN_EMAILS=konrad.schrein@gmail.com
```

### 2. Run Database Migration

After Vercel deploys, you need to run the migration once:

**Option A: Via Vercel CLI (Recommended)**
```bash
# Install Vercel CLI if you don't have it
npm i -g vercel

# Run migration on production
vercel env pull .env.production
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

**Option B: Via Vercel Dashboard**
1. Go to your project settings
2. Navigate to "Settings" → "Functions"
3. Add a one-time deployment hook that runs:
   ```bash
   npx prisma migrate deploy
   ```

**Option C: Manually via Database Client**
Copy the SQL from `prisma/migrations/20260325224038_add_credit_system/migration.sql` and run it directly in your Supabase SQL editor.

### 3. Create Admin Account

After the migration is complete, run this script via Vercel CLI:

```bash
# Connect to production
vercel env pull .env.production

# Run admin creation script
npx tsx scripts/create-admin.ts
```

This will:
- Create konrad.schrein@gmail.com with password "testva1234"
- Set role to ADMIN
- Use Argon2id password hashing
- Remove old dualaryan@gmail.com account if it exists

**Or do it manually in Supabase:**
```sql
-- Create admin user (if doesn't exist)
INSERT INTO users (id, email, password, name, role, credits, password_hash_algorithm, created_at, updated_at)
VALUES (
  'admin_id_here',
  'konrad.schrein@gmail.com',
  '-- Run hashPassword("testva1234") from password-service.ts --',
  'Admin',
  'ADMIN',
  0,
  'argon2id',
  NOW(),
  NOW()
);

-- Or update existing user
UPDATE users
SET role = 'ADMIN',
    password_hash_algorithm = 'argon2id'
WHERE email = 'konrad.schrein@gmail.com';

-- Delete old admin if exists
DELETE FROM users WHERE email = 'dualaryan@gmail.com';
```

---

## 🎯 Testing After Deployment

1. **Test Login**
   - Go to https://your-app.vercel.app/auth/signin
   - Login with: konrad.schrein@gmail.com / testva1234
   - Should work ✅

2. **Test Admin Panel**
   - Visit https://your-app.vercel.app/admin
   - Should see statistics dashboard
   - Should see "Grant Credits" form
   - Should see user management table

3. **Test Credit System**
   - Create a test user (or use existing user)
   - Try to generate thumbnail without credits → Should get 402 error
   - Grant credits via admin panel (e.g., 10 credits)
   - Generate thumbnail → Should work, credits deducted
   - Check transaction log in admin panel → Should see deduction logged

4. **Test Admin Unlimited Access**
   - As admin (konrad.schrein@gmail.com), generate thumbnails
   - Should work without credit deduction
   - Credits should remain at 0 (admins bypass)

---

## 📊 What Changed

### No Refunds Policy
- Credits are **NOT** refunded on generation failures
- This prevents exploitation (users could intentionally cause failures)
- Cost per generation is low enough that failed attempts are acceptable losses
- All failures are still logged for debugging

### Credit Flow
1. User requests N thumbnails
2. System checks: Does user have N credits? (admins skip this)
3. If yes: Deduct N credits **immediately**
4. Generate thumbnails (success or failure doesn't matter)
5. Credits are gone regardless of outcome
6. Transaction logged with reason + timestamp

### Security
- Atomic transactions prevent race conditions
- Argon2id password hashing (GPU-resistant)
- Admin-only API endpoints (403 for non-admins)
- Immutable audit log (transactions never deleted)

---

## 🔑 Admin Credentials

**Email:** konrad.schrein@gmail.com
**Password:** testva1234
**Role:** ADMIN

**Replaces:** dualaryan@gmail.com (will be deleted when admin script runs)

---

## 🐛 If Something Goes Wrong

### Migration Fails
**Error:** "Column already exists"
**Fix:** The migration was already run. Skip it.

**Error:** "Can't connect to database"
**Fix:** Check DATABASE_URL in Vercel env vars.

### Admin Login Fails
**Fix 1:** Manually set role to ADMIN in database:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'konrad.schrein@gmail.com';
```

**Fix 2:** Check that ADMIN_EMAILS env var is set in Vercel.

### Credit System Not Working
**Check 1:** Did migration run? Check if credit_transactions table exists.
**Check 2:** Is user role ADMIN? Admins bypass credits.
**Check 3:** Redeploy to ensure latest code is running.

---

## 🎉 Success Criteria

- ✅ Can login as konrad.schrein@gmail.com
- ✅ Can access /admin panel
- ✅ Can grant credits to users
- ✅ Non-admin users need credits to generate
- ✅ Admins can generate without credits
- ✅ Transaction log shows all credit operations
- ✅ No refunds on failures (simple, unexploitable)

---

## 💰 Ready to Rent!

Once deployed, you can:
1. Give friends your app URL
2. They sign up (get 0 credits)
3. They pay you (PayPal, Venmo, etc.)
4. You grant them credits via admin panel
5. They generate thumbnails (1 credit each)
6. Full transparency via transaction log

**No more API abuse!** 🎉
