# 🚀 Getting Started with AI Thumbnail Farm

## ⚡ 2-Minute Setup

### Step 1: Get Your Free API Key (30 seconds)

1. Go to https://fal.ai/dashboard/keys
2. Sign up (free, no credit card required)
3. Click "Create Key"
4. Copy your key (starts with `fc-`)

### Step 2: Configure (30 seconds)

**Option A: Setup Wizard (Recommended)**
```bash
# Windows - Double click:
setup.html

# Mac/Linux:
open setup.html
# Or:
./setup.html
```

Paste your API key and click "Save & Start"

**Option B: Manual**
```bash
cp .env.example .env
# Edit .env and replace "your-fal-ai-api-key-here" with your actual key
```

### Step 3: Launch (60 seconds)

```bash
# Windows:
START.bat

# Mac/Linux:
./start.sh

# Or use Make:
make start
```

Wait for the "Services are running!" message, then your browser will automatically open http://localhost:3000

---

## 🎯 Using the Dashboard

1. **Enter Video Title** - e.g., "How to Build a React App in 2024"
2. **(Optional) Add Description** - Helps AI understand the content
3. **Click "Generate Thumbnails"**
4. **Wait 30-60 seconds** - The AI generates 3 variants
5. **Select your favorite** - Click "Select" on the best one
6. **Download** - Click "Download" to save your thumbnail
7. **Upload to YouTube** - Use the downloaded image as your video thumbnail

---

## 📂 Project Files

| File | Purpose |
|------|---------|
| `setup.html` | Visual setup wizard |
| `START.bat` | Windows one-click launcher |
| `start.sh` | Mac/Linux one-click launcher |
| `Makefile` | Convenient commands |
| `docker-compose.yml` | Service orchestration |

---

## 🔧 Common Commands

```bash
# Start everything
make start

# Stop everything
make stop

# View logs
make logs

# Check status
make status

# Run tests
make test

# Clean up (removes all data)
make clean
```

---

## 🐛 Troubleshooting

### "Docker not installed"
- Download from https://www.docker.com/products/docker-desktop
- Start Docker Desktop
- Try again

### "Ports already in use"
```bash
# Check what's using port 3000
lsof -i :3000

# Or change ports in docker-compose.yml
```

### "API key not working"
- Make sure key starts with `fc-`
- Check you copied the entire key
- Verify in .env file: `FAL_AI_API_KEY=fc-your-actual-key`

### "Services won't start"
```bash
# Reset everything
docker-compose down -v
docker-compose up -d --build
```

---

## 💡 Tips

- **Use descriptive titles** - The AI uses your title to generate relevant backgrounds
- **Try different styles** - Each variant uses a different visual style
- **Regenerate if needed** - Click "Regenerate (Priority)" for instant new variants
- **Local storage** - Images are saved locally by default (in `/tmp/thumbnail-farm`)

---

## 📚 Next Steps

- **Deploy to Vercel**: See [DEPLOY.md](DEPLOY.md)
- **Customize**: Edit files in `frontend/` or `backend/`
- **Scale**: Run `docker-compose up -d --scale worker=4` for 4 parallel workers

---

**You're all set! Happy thumbnail generating! 🎨**
