# How to Create User Accounts

This guide explains how to create accounts for your friends and manage user access.

---

## Method 1: Self-Registration (Recommended)

Your friends can create their own accounts by visiting the registration page.

### Steps:

1. **Share your deployment URL** with your friend:
   ```
   https://your-app.vercel.app
   ```

2. **Friend goes to the registration page:**
   - Option A: Click "Sign Up" on the login page
   - Option B: Go directly to: `https://your-app.vercel.app/auth/register`

3. **Friend fills out the registration form:**
   - Email address (can be any email, no verification required)
   - Password (minimum 8 characters, must include letters and numbers)
   - Name (optional, for display purposes)

4. **Friend clicks "Create Account"**
   - Account is created immediately
   - Default credits: 0 (configurable via `DEFAULT_USER_CREDITS` environment variable)
   - Role: USER (standard access)

5. **You grant credits via Admin Panel:**
   - Log into your admin account
   - Go to `/admin` panel
   - Find the user by email
   - Click "Grant Credits"
   - Enter amount and reason
   - Click "Grant"

---

## Method 2: Registration Secret (Optional - For Private Systems)

If you want to control who can register, you can enable the registration secret feature.

### Setup:

1. **Generate a registration secret:**
   ```bash
   openssl rand -base64 16
   ```

2. **Add to environment variables:**
   - Local `.env`: `REGISTRATION_SECRET=your_generated_secret`
   - Vercel: Settings → Environment Variables → Add `REGISTRATION_SECRET`

3. **Share the secret** privately with approved friends (via text, email, etc.)

4. **Friends register** with the secret:
   - Go to registration page
   - Enter email and password
   - Enter the registration secret you shared
   - Click "Create Account"

### Note:
The UI for registration secret is currently **not implemented**. If you want this feature, let me know and I can add a "Registration Code" field to the signup page.

---

## Method 3: Direct Database Access (Advanced - Not Recommended)

For advanced users who have direct database access via Prisma Studio or SQL.

### Via Prisma Studio:

```bash
npm run db:studio
# Opens at http://localhost:5556
```

1. Navigate to the `User` model
2. Click "Add record"
3. Fill in:
   - email: `friend@example.com`
   - password: Use a hashed password (see Password Hashing below)
   - name: `Friend Name`
   - role: `USER`
   - credits: `0`
   - passwordHashAlgorithm: `argon2id`
4. Save

### Password Hashing:
To generate a hashed password, create a small script:

```typescript
// scripts/hash-password.ts
import { hashPassword } from '../lib/password-service';

const plainPassword = 'yourPasswordHere';
hashPassword(plainPassword).then(hash => {
  console.log('Hashed password:', hash);
  process.exit(0);
});
```

Run: `npx tsx scripts/hash-password.ts`

---

## After Account Creation

### As Admin, you should:

1. **Verify the account** in Admin Panel (`/admin`)
   - Check user appears in the user list
   - Verify email is correct
   - Check role is USER (not ADMIN)

2. **Grant initial credits:**
   - Find user in list
   - Click "Grant Credits"
   - Recommended starting amount: 50-100 credits
   - Add reason: "Welcome credits - [Date]"

3. **Share credentials** with your friend (if you created it for them):
   - Email: `friend@example.com`
   - Password: `the-password-you-set`
   - URL: `https://your-app.vercel.app`

### Friend should:

1. **Login** with provided credentials
2. **Go to dashboard** (automatic redirect after login)
3. **Check credit balance** in top-right corner
4. **Read the User Guide:**
   - Click "User Guide" in left sidebar
   - Learn how to create channels, archetypes, and generate thumbnails

---

## Managing User Access

### View All Users:
1. Log in as admin
2. Go to `/admin` panel
3. See complete user list with:
   - Email
   - Name
   - Role
   - Credits (current, granted, consumed)
   - Created date

### Search Users:
- Use the search box at top of Admin Panel
- Search by email (case-insensitive)

### Grant More Credits:
1. Find user in Admin Panel
2. Click "Grant Credits" button
3. Enter amount (max 10,000 per grant)
4. Add reason for audit trail
5. Click "Grant"

### View Transaction History:
1. Find user in Admin Panel
2. Expand their row (if available)
3. See all credit grants and deductions
4. View timestamps and reasons

---

## User Roles Explained

### USER (Standard)
- Can create channels and archetypes
- Can generate thumbnails (costs credits)
- Can translate thumbnails (costs credits)
- Rate limit: 10 manual generations per day
- Can only see their own channels and archetypes

### ADMIN (Administrator)
- All USER permissions
- Unlimited credits (no deductions)
- No rate limits
- Can see ALL channels and archetypes (all users)
- Access to `/admin` panel
- Can grant credits to users
- Can view all transaction history

---

## Troubleshooting

### "Email already exists"
- That email is already registered
- User can login with existing credentials
- Or use password reset (when implemented)

### Friend can't login
- Check they're using the correct email and password
- Verify account exists in Admin Panel
- Check for typos in email (spaces, capitalization)
- Try password reset (when implemented)

### Friend sees "Insufficient Credits"
- Grant them credits via Admin Panel
- Check their current balance in user list
- Verify credits were successfully granted (transaction log)

### Friend can see my channels
- **This is a bug!** Channels should be user-specific
- Run the fix script: `npm run fix:channels`
- See: FIXING_CHANNEL_OWNERSHIP.md

---

## Best Practices

### For Security:
- ✅ Use strong passwords (12+ characters, mixed case, numbers, symbols)
- ✅ Don't share the same password across accounts
- ✅ Keep admin credentials secure
- ✅ Use registration secret for private systems

### For Credits:
- ✅ Start with 50-100 credits for new users
- ✅ Monitor usage in Admin Panel
- ✅ Grant more when users run out
- ✅ Use the "reason" field for tracking

### For Onboarding:
- ✅ Send friend the User Guide link: `/dashboard?tab=help`
- ✅ Mention demo account for testing: `test@test.ai`
- ✅ Explain credit system upfront
- ✅ Show them example channel and archetype

---

## Quick Reference Commands

```bash
# View database in browser
npm run db:studio

# Fix channel ownership issues
npm run fix:channels

# Create admin account
npm run setup
```

---

## Need Help?

- Check the User Guide: Dashboard → User Guide (left sidebar)
- Check API Docs: Dashboard → API Docs (left sidebar)
- Check deployment docs: `DEPLOYMENT_STEPS.md`
- Check security docs: `SECURITY_FIXES_APPLIED.md`
