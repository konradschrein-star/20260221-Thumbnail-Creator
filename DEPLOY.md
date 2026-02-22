# 🚀 AI Thumbnail Farm - Deployment Guide

## Quick Start Options

### Option 1: Local Development (Easiest)

**Requirements:**
- Docker Desktop installed
- 4GB+ RAM available

**Steps:**
1. Double-click `setup.html` in your browser
2. Choose "Local Development" mode
3. Enter your API keys
4. Click "Start Local Server"
5. Open http://localhost:3000

Or manually:
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 2. Start services
./start.sh        # Mac/Linux
START.bat         # Windows
```

---

### Option 2: Vercel Cloud Deployment (Production)

**Requirements:**
- Vercel account (free tier works!)
- GitHub account

**Steps:**

#### 1. Create Required Services (Free Tier)

**Upstash Redis (for queueing):**
1. Go to https://console.upstash.com/redis
2. Click "Create Database"
3. Choose region closest to you
4. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

**Supabase PostgreSQL (for database):**
1. Go to https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy the connection string (use the pooled connection)

**Cloudflare R2 (for image storage):**
1. Go to https://dash.cloudflare.com
2. Navigate to R2
3. Create bucket named "thumbnail-farm"
4. Create API token with R2 edit permissions
5. Copy Account ID, Access Key ID, and Secret Access Key

**Fal.ai (for AI image generation):**
1. Go to https://fal.ai/dashboard/keys
2. Create new API key
3. Copy the key (starts with `fc-`)

#### 2. Run Setup Wizard

1. Open `setup.html` in your browser
2. Choose "Vercel Cloud" mode
3. Enter all your API keys
4. Click "Download Vercel Config"

#### 3. Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

Or use the Vercel Dashboard:
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Add environment variables from your `.env` file
4. Deploy!

---

## Environment Variables Reference

### Required for All Deployments

| Variable | Description | Get From |
|----------|-------------|----------|
| `FAL_AI_API_KEY` | AI image generation | https://fal.ai/dashboard/keys |

### Required for Vercel Deployment

| Variable | Description | Get From |
|----------|-------------|----------|
| `SUPABASE_URL` | Database URL | https://supabase.com/dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Database key | Supabase Settings → API |
| `UPSTASH_REDIS_REST_URL` | Redis URL | https://console.upstash.com |
| `UPSTASH_REDIS_REST_TOKEN` | Redis token | Upstash console |
| `R2_ENDPOINT_URL` | Storage endpoint | https://dash.cloudflare.com |
| `R2_ACCESS_KEY_ID` | Storage key | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Storage secret | Cloudflare R2 |
| `R2_BUCKET_NAME` | Bucket name | Your R2 bucket |

---

## API Endpoints

Once deployed, your API will be available at:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/v1/thumbnails/generate` | POST | Submit generation job |
| `/api/v1/thumbnails/status/{job_id}` | GET | Get job status |
| `/api/v1/thumbnails/stream/{job_id}` | GET | SSE stream for real-time updates |
| `/api/v1/thumbnails/regenerate/{job_id}` | POST | Priority regeneration |

### Example API Call

```bash
# Submit generation job
curl -X POST https://your-app.vercel.app/api/v1/thumbnails/generate \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "UCxxxxxxxx",
    "video_title": "How to Build a React App",
    "num_variants": 3
  }'
```

---

## Troubleshooting

### Local Development

**Docker not starting:**
- Make sure Docker Desktop is running
- Check ports 3000, 8000, 5432, 6379 are free

**Services not connecting:**
- Wait 30 seconds after starting for all services to initialize
- Check logs: `docker-compose logs -f`

### Vercel Deployment

**Build fails:**
- Check all environment variables are set
- Make sure `vercel.json` is in the root directory

**API returns 500:**
- Check function logs in Vercel dashboard
- Verify database connection string format

**Images not saving:**
- Verify R2 credentials
- Check bucket permissions

---

## Cost Estimates (Monthly)

### Free Tier (Sufficient for Personal Use)
- **Vercel:** $0 (500k function invocations)
- **Upstash Redis:** $0 (10k commands/day)
- **Supabase:** $0 (500MB database)
- **Cloudflare R2:** $0 (10GB storage)
- **Fal.ai:** ~$5-10 (pay per generation)

### Paid Tier (Production)
- **Vercel Pro:** $20/month
- **Upstash:** $10/month
- **Supabase Pro:** $25/month
- **Cloudflare R2:** ~$5/month
- **Fal.ai:** Usage-based (~$0.03-0.05 per image)

---

## Support

- 📖 Documentation: See README.md
- 🐛 Issues: Open a GitHub issue
- 💬 Discussions: GitHub Discussions
