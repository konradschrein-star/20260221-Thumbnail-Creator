#!/bin/bash

# =============================================================================
# AI Thumbnail Rendering Farm - Test Script
# =============================================================================

set -e

echo "🧪 Testing AI Thumbnail Farm Setup"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_count=0
pass_count=0

run_test() {
    test_count=$((test_count + 1))
    echo -n "Test $test_count: $1... "
}

pass() {
    pass_count=$((pass_count + 1))
    echo -e "${GREEN}✅ PASS${NC}"
}

fail() {
    echo -e "${RED}❌ FAIL${NC}"
    echo "  $1"
}

# Test 1: Check Docker
run_test "Docker installed"
if command -v docker &> /dev/null; then
    pass
else
    fail "Docker not found. Please install Docker Desktop."
    exit 1
fi

# Test 2: Check Docker Compose
run_test "Docker Compose available"
if docker-compose --version &> /dev/null || docker compose version &> /dev/null; then
    pass
else
    fail "Docker Compose not found"
    exit 1
fi

# Test 3: Check .env file
run_test ".env file exists"
if [ -f ".env" ]; then
    pass
else
    fail ".env not found. Run setup.html first."
    exit 1
fi

# Test 4: Check FAL_AI_API_KEY
run_test "FAL_AI_API_KEY configured"
if grep -q "FAL_AI_API_KEY=" .env && ! grep -q "FAL_AI_API_KEY=your-fal" .env; then
    pass
else
    fail "FAL_AI_API_KEY not configured in .env"
    exit 1
fi

# Test 5: Check services are running
run_test "Services running"
if docker-compose ps | grep -q "Up"; then
    pass
else
    fail "Services not running. Run 'make start' first."
fi

# Test 6: Check backend health
run_test "Backend health endpoint"
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    pass
else
    fail "Backend not responding at http://localhost:8000/health"
fi

# Test 7: Check frontend
run_test "Frontend responding"
if curl -s http://localhost:3000 | grep -q "html"; then
    pass
else
    fail "Frontend not responding at http://localhost:3000"
fi

echo ""
echo "=============================="
echo "Results: $pass_count/$test_count tests passed"
echo "=============================="

if [ $pass_count -eq $test_count ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Dashboard: http://localhost:3000"
    echo "API Docs:  http://localhost:8000/docs"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
