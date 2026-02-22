# 🚀 AI Thumbnail Farm - Quick Start Guide

## ⚡ Get Running in 3 Minutes

### Step 1: Get Your API Key (Free)

1. Go to https://fal.ai/dashboard/keys
2. Create a new API key
3. Copy it (starts with `fc-`)

### Step 2: Run Setup Wizard

**Windows:**
```bash
# Double-click this file
setup.html

# Or run
npm run setup
```

**Mac/Linux:**
```bash
# Open setup wizard
open setup.html

# Or run
npm run setup
```

### Step 3: Configure & Launch

1. Select **"Local Development"** mode
2. Choose **"Local Filesystem"** for storage (easiest)
3. Paste your **Fal.ai API Key**
4. Click **"Start Local Server"**
5. Wait 30 seconds for services to start

### Step 4: Open Dashboard

Your browser will automatically open: **http://localhost:3000**

---

## 🎯 Using the Dashboard

1. **Enter Video Title** - e.g., "How to Build a React App"
2. **Click "Generate Thumbnails"**
3. **Wait 30-60 seconds** for AI generation
4. **Select your favorite** from 3 variants
5. **Download** and upload to YouTube!

---

## 🛑 Stopping the Server

```bash
# Stop all services
docker-compose down

# Or on Windows/Mac
Ctrl+C in the terminal, then:
docker-compose down
```

---

## 🔧 Common Issues

### "Docker not installed"
- Download from https://www.docker.com/products/docker-desktop
- Start Docker Desktop
- Try again

### "Ports already in use"
```bash
# Find what's using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Or change ports in docker-compose.yml
```

### "API key not working"
- Make sure key starts with `fc-`
- Check you copied the full key
- Verify key has "text-to-image" permission

---

## ☁️ Deploy to Vercel (Optional)

Want to host online? See **DEPLOY.md** for:
- Vercel deployment steps
- Required services (Upstash, Supabase, R2)
- Environment variable setup

---

## 📞 Need Help?

- 📖 Full docs: See **README.md**
- 🐛 Issues: Open a GitHub issue
- 💬 Questions: Check **DEPLOY.md** troubleshooting section

---

**Enjoy your AI-generated thumbnails! 🎨**
