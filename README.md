# 🎨 AI YouTube Thumbnail Rendering Farm

**Enterprise-grade AI-powered thumbnail generation for YouTube creators.**

Zero prompt-engineering required. Just enter your video title, get 3 high-quality thumbnail variants in 30-60 seconds.

![Dashboard Preview](https://via.placeholder.com/800x400/667eea/ffffff?text=AI+Thumbnail+Farm+Dashboard)

---

## 🚀 Quick Start (2 Minutes)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed

### 1. Get Your Free API Key (30 sec)
1. Go to https://fal.ai/dashboard/keys
2. Create a new API key (starts with `fc-`)
3. Copy it

### 2. Configure (30 sec)
```bash
# Windows: Double-click
setup.html

# Mac/Linux:
open setup.html
```
Paste your API key → Click "Save & Start"

### 3. Launch (60 sec)
```bash
# Windows
START.bat

# Mac/Linux
./start.sh
```

🎉 **Dashboard opens at http://localhost:3000**

---

## 🎯 How to Use

1. **Enter Video Title** → "How to Build a React App"
2. **Click "Generate"** → Wait 30-60 seconds
3. **Pick Your Favorite** → From 3 AI-generated variants
4. **Download** → Upload to YouTube!

---

## 📁 Project Structure

```
ai-thumbnail-farm/
├── 🚀 Launchers
│   ├── setup.html          # Visual setup wizard
│   ├── START.bat           # Windows one-click start
│   ├── start.sh            # Mac/Linux one-click start
│   └── Makefile            # Convenient commands
│
├── 🎨 Frontend (Next.js 14)
│   ├── app/page.tsx        # Main dashboard
│   └── ...
│
├── ⚙️ Backend (FastAPI)
│   ├── app/main.py         # API endpoints
│   ├── app/queue/lifo_queue.py  # Custom LIFO queue
│   └── ...
│
├── 🔧 Worker (RQ Pipeline)
│   ├── app/pipeline.py     # Job processing
│   ├── app/compositor.py   # Pillow text compositing
│   └── ...
│
└── ☁️ Vercel API
    └── api/v1.py           # Serverless functions
```

---

## 🛠️ Commands

```bash
# Start everything
make start

# Stop
make stop

# View logs
make logs

# Check status
make status

# Run tests
make test

# Scale workers (4 parallel)
docker-compose up -d --scale worker=4
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Generation** | Fal.ai for high-quality backgrounds |
| ✍️ **Smart Text** | Auto-wraps for any language (German, English, etc.) |
| ⚡ **LIFO Queue** | Manual regenerations get priority |
| 📊 **Real-time** | Live progress updates |
| 🎨 **3 Variants** | Different styles per request |
| ☁️ **Cloud Ready** | Deploy to Vercel in minutes |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TailwindCSS |
| Backend | FastAPI, Python 3.11 |
| Queue | Redis, RQ (LIFO) |
| Database | PostgreSQL |
| AI | Fal.ai |
| Image | Pillow (PIL) |

---

## 📊 API

```bash
# Submit job
curl -X POST http://localhost:8000/api/v1/thumbnails/generate \
  -H "Content-Type: application/json" \
  -d '{"channel_id":"test","video_title":"Test","num_variants":3}'

# Check status
curl http://localhost:8000/api/v1/thumbnails/status/{job_id}
```

---

## ☁️ Deploy to Vercel

See [DEPLOY.md](DEPLOY.md) for cloud deployment.

---

## 💰 Costs

| Item | Cost |
|------|------|
| Local Dev | FREE |
| Fal.ai | ~$0.03-0.05/image |
| Vercel (optional) | $0-20/month |

---

## 🐛 Troubleshooting

**"Docker not installed"**
→ https://www.docker.com/products/docker-desktop

**"Ports in use"**
→ Change ports in `docker-compose.yml`

**"API key not working"**
→ Make sure it starts with `fc-`

---

## 📚 Documentation

- [GETTING_STARTED.md](GETTING_STARTED.md) - Detailed setup guide
- [DEPLOY.md](DEPLOY.md) - Vercel deployment
- [QUICKSTART.md](QUICKSTART.md) - 3-minute quick start
- [SUMMARY.md](SUMMARY.md) - Technical overview

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch
3. Make changes
4. Submit PR

---

## 📄 License

MIT License

---

**Made with ❤️ for content creators**

[Getting Started](GETTING_STARTED.md) • [Deploy](DEPLOY.md) • [API Docs](http://localhost:8000/docs)
