# 🚀 Next Steps for Production Deployment

## ✅ What's Been Fixed (Automatic)

I've applied the following security fixes to your codebase:

1. **Fixed `.gitignore`** - Now properly excludes `.env.prod`, `.env.production`, and `backend/.env`
2. **Removed `.env.prod`** - Deleted the file containing exposed secrets
3. **Added CRON_SECRET validation** - Both cron endpoints now fail closed if secret is undefined

**Files Modified:**
- `.gitignore` - Added proper environment file exclusions
- `app/api/cron/cleanup/route.ts` - Added CRON_SECRET validation
- `app/api/cron/cleanup-translate/route.ts` - Added CRON_SECRET validation

---

## 🔴 What YOU Must Do (Manual - 30 minutes)

### 1. Rotate Your Google API Key (CRITICAL)

**Your exposed key:** `AIzaSyC47HFD6qox-noQLg634RjNk6If8Ln_Yvs`

**Quick Steps:**
```bash
# 1. Go to Google Cloud Console
open https://console.cloud.google.com/apis/credentials

# 2. Delete or regenerate the exposed key (ends in ...If8Ln_Yvs)

# 3. Create a new API key

# 4. Update local .env
# Edit .env and replace GOOGLE_API_KEY with new value

# 5. Update Vercel
# Go to Vercel Dashboard → Project Settings → Environment Variables
# Update GOOGLE_API_KEY for Production environment
```

---

### 2. Generate Strong Secrets (HIGH PRIORITY)

**Run these commands:**

```bash
# Generate NEXTAUTH_SECRET
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"

# Generate CRON_SECRET
echo "CRON_SECRET=$(openssl rand -base64 32)"

# Generate REGISTRATION_SECRET (optional but recommended)
echo "REGISTRATION_SECRET=$(openssl rand -base64 16)"
```

**Then:**
1. Copy each generated value
2. Add to your local `.env` file
3. Add to Vercel Environment Variables (Production)

---

### 3. Quick Test Before Deployment

```bash
# 1. Start local server
npm run dev

# 2. Test login
# Go to http://localhost:3000/dashboard
# Log in with your admin account

# 3. Test generation
# Generate a test thumbnail to verify GOOGLE_API_KEY works

# 4. Test cron protection
curl -X POST http://localhost:3000/api/cron/cleanup
# ^ Should return 401 Unauthorized (good!)

# 5. Test admin panel
# Go to http://localhost:3000/admin
# Verify you can see users and grant credits
```

---

## 📋 Deployment Checklist

Copy this checklist and check off as you go:

```
BEFORE DEPLOYMENT:
☐ Rotated Google API key in Cloud Console
☐ Updated GOOGLE_API_KEY in Vercel
☐ Generated NEXTAUTH_SECRET with openssl
☐ Generated CRON_SECRET with openssl
☐ Updated all secrets in local .env
☐ Updated all secrets in Vercel (Production)
☐ Tested local development works
☐ Tested authentication flow
☐ Tested credit system
☐ Verified .env.prod is deleted and ignored

AFTER DEPLOYMENT:
☐ Monitor first 24 hours for errors
☐ Test production authentication
☐ Test production thumbnail generation
☐ Verify cron jobs run (check next day)
☐ Grant credits to first friend user
☐ Monitor API quota usage

OPTIONAL (RECOMMENDED):
☐ Set up Sentry error tracking
☐ Set up Google Cloud billing alerts
☐ Document your admin account credentials securely
```

---

## ⚡ Quick Commands Reference

### Local Development
```bash
npm run dev                    # Start dev server
npx prisma studio              # Open database UI
npm run test:generate          # Test generation locally
```

### Security Verification
```bash
git status                     # .env.prod should NOT appear
git log --all -- .env.prod     # Should be empty (never committed)
```

### Deployment
```bash
# Push changes
git add .gitignore
git add app/api/cron/cleanup/route.ts
git add app/api/cron/cleanup-translate/route.ts
git add SECURITY_FIXES_APPLIED.md
git add NEXT_STEPS.md
git commit -m "fix: apply critical security fixes for production deployment"
git push origin main

# Vercel will auto-deploy
```

---

## 🎯 Your Production-Ready Status

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Account System | ✅ READY | None |
| Credit Budget System | ✅ READY | None |
| Code Security | ✅ FIXED | None |
| API Key Rotation | ⏳ PENDING | Rotate in Google Cloud |
| Secret Generation | ⏳ PENDING | Generate with openssl |
| Deployment Config | ⏳ PENDING | Update Vercel env vars |

**Time to production:** ~30 minutes of manual work remaining

---

## 📞 What Can Friends Do?

Once deployed, you can give friends limited credit budgets:

1. **Create their account:**
   - They go to your deployment URL
   - Click "Sign Up"
   - Create account with email/password
   - (If REGISTRATION_SECRET is set, share it with them)

2. **Grant them credits:**
   - You log into `/admin` panel
   - Find their email in the user list
   - Click "Grant Credits"
   - Enter amount (e.g., 50 credits = 50 thumbnails)
   - Add reason (e.g., "Friend trial - March 2026")

3. **They can generate:**
   - They log into `/dashboard`
   - See their credit balance in the header
   - Generate thumbnails (1 credit each)
   - When credits run out, they see "Insufficient credits" message

4. **You can monitor:**
   - View all users in `/admin` panel
   - See their current balance
   - Expand their row to see full transaction history
   - Track how many credits they've consumed

---

## 🆘 If Something Goes Wrong

**"Model not found" error:**
- Your new API key may not have access to the Gemini model
- Go to Google Cloud Console → Enable Gemini API
- Verify billing is enabled on the project

**"Unauthorized" on /api/generate:**
- User may have 0 credits remaining
- Check in admin panel and grant more credits

**Can't log in after deployment:**
- Verify NEXTAUTH_SECRET is set in Vercel
- Check Vercel deployment logs for errors
- Try clearing browser cookies and logging in again

**Cron jobs not running:**
- Verify CRON_SECRET is set in Vercel
- Check Vercel Dashboard → Cron (tab) for job status
- May need to create vercel.json with cron config

---

## 📚 More Information

For detailed information, see:
- `SECURITY_FIXES_APPLIED.md` - Full security audit and fixes
- `PRODUCTION_SETUP.md` - Complete Vercel deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment verification
- `CLAUDE.md` - Architecture and API documentation

---

**Ready to deploy?** Complete the manual steps above, then push your changes! 🚀
