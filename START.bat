@echo off
chcp 65001 >nul
title AI Thumbnail Rendering Farm
cls

echo.
echo    ╔══════════════════════════════════════════════════════════════╗
echo    ║                                                              ║
echo    ║           🎨 AI THUMBNAIL RENDERING FARM 🎨                  ║
echo    ║                                                              ║
echo    ║     Enterprise AI-powered YouTube thumbnail generation       ║
echo    ║                                                              ║
echo    ╚══════════════════════════════════════════════════════════════╝
echo.

:: Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo    ❌ Docker is not installed!
    echo.
    echo    Please install Docker Desktop first:
    echo    https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo    ❌ Docker is not running!
    echo.
    echo    Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo    ✅ Docker is ready!
echo.

:: Check for .env file
if not exist ".env" (
    echo    ⚠️  Configuration file not found!
    echo.
    echo    Creating .env from template...
    copy .env.example .env >nul
    echo.
    echo    ✅ Created .env file.
    echo    📝 Please edit .env and add your FAL_AI_API_KEY
    echo.
    echo    Get your free API key at: https://fal.ai/dashboard/keys
    echo.
    notepad .env
    pause
    exit /b 1
)

:: Check if FAL_AI_API_KEY is set
findstr /C:"FAL_AI_API_KEY=your-fal" .env >nul 2>&1
if not errorlevel 1 (
    echo    ⚠️  Please configure your FAL_AI_API_KEY in .env file
    echo.
    echo    Get your free API key at: https://fal.ai/dashboard/keys
    echo.
    notepad .env
    pause
    exit /b 1
)

echo    🚀 Starting AI Thumbnail Farm services...
echo.
echo    This may take a few minutes on first run.
echo.

:: Start services
docker-compose up -d --build

if errorlevel 1 (
    echo.
    echo    ❌ Failed to start services!
    echo.
    pause
    exit /b 1
)

echo.
echo    ⏳ Waiting for services to start...
echo.
timeout /t 15 /nobreak >nul

echo    ╔══════════════════════════════════════════════════════════════╗
echo    ║  🎉 Services are running!                                      ║
echo    ║                                                                ║
echo    ║  📊 Dashboard:  http://localhost:3000                          ║
echo    ║  📚 API Docs:   http://localhost:8000/docs                     ║
echo    ║                                                                ║
echo    ║  Press Ctrl+C to stop viewing logs                             ║
echo    ╚══════════════════════════════════════════════════════════════╝
echo.

:: Open browser
start http://localhost:3000

:: Show logs
docker-compose logs -f
