#!/bin/bash

# =============================================================================
# AI Thumbnail Rendering Farm - Startup Script
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║              🎨 AI THUMBNAIL RENDERING FARM 🎨                       ║"
echo "║                                                                      ║"
echo "║        Enterprise AI-powered YouTube thumbnail generation            ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo ""
    echo "Please install Docker first:"
    echo "  macOS:   brew install --cask docker"
    echo "  Linux:   https://docs.docker.com/engine/install/"
    echo ""
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo ""
    echo "Please start Docker and try again."
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Docker is ready!${NC}"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Configuration file not found!${NC}"
    echo ""
    echo "Creating .env from template..."
    cp .env.example .env
    echo ""
    echo -e "${GREEN}✅ Created .env file.${NC}"
    echo "📝 Please edit .env and add your FAL_AI_API_KEY"
    echo ""
    echo "Get your free API key at: https://fal.ai/dashboard/keys"
    echo ""
    
    # Try to open .env in editor
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    fi
    
    exit 1
fi

# Check if FAL_AI_API_KEY is configured
if grep -q "FAL_AI_API_KEY=your-fal" .env; then
    echo -e "${YELLOW}⚠️  Please configure your FAL_AI_API_KEY in .env file${NC}"
    echo ""
    echo "Get your free API key at: https://fal.ai/dashboard/keys"
    echo ""
    
    if command -v code &> /dev/null; then
        code .env
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    fi
    
    exit 1
fi

echo -e "${BLUE}🚀 Starting AI Thumbnail Farm services...${NC}"
echo ""
echo "This may take a few minutes on first run."
echo ""

# Start services
docker-compose up -d --build

echo ""
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
echo ""
sleep 15

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  🎉 Services are running!                                            ║"
echo "║                                                                      ║"
echo "║  📊 Dashboard:  http://localhost:3000                                ║"
echo "║  📚 API Docs:   http://localhost:8000/docs                           ║"
echo "║                                                                      ║"
echo "║  Press Ctrl+C to stop viewing logs                                   ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Open browser
sleep 2
if command -v open &> /dev/null; then
    open http://localhost:3000 &
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 &
fi

# Show logs
docker-compose logs -f
