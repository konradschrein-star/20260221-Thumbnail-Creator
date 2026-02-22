# =============================================================================
# AI Thumbnail Rendering Farm - Makefile
# =============================================================================

.PHONY: help setup start stop logs build clean test

help: ## Show this help message
	@echo "AI Thumbnail Rendering Farm - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Run setup wizard
	@echo "Opening setup wizard..."
	@python3 -c "import webbrowser; webbrowser.open('setup.html')" 2>/dev/null || \
		open setup.html 2>/dev/null || \
		xdg-open setup.html 2>/dev/null || \
		echo "Please open setup.html manually"

start: ## Start all services
	@echo "🚀 Starting AI Thumbnail Farm..."
	docker-compose up -d --build
	@echo ""
	@echo "⏳ Waiting for services..."
	@sleep 15
	@echo ""
	@echo "✅ Services running!"
	@echo "   Dashboard: http://localhost:3000"
	@echo "   API Docs:  http://localhost:8000/docs"
	@echo ""
	@echo "Run 'make logs' to view logs"

stop: ## Stop all services
	@echo "🛑 Stopping services..."
	docker-compose down

logs: ## View service logs
	docker-compose logs -f

build: ## Rebuild all services
	docker-compose build --no-cache

restart: stop start ## Restart all services

status: ## Check service status
	docker-compose ps

clean: ## Remove all containers and volumes
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	docker system prune -f

test: ## Run health checks
	@echo "🏥 Health Checks:"
	@echo ""
	@echo "Backend:"
	@curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "  Backend not responding"
	@echo ""
	@echo "Frontend:"
	@curl -s http://localhost:3000/api/health | python3 -m json.tool 2>/dev/null || echo "  Frontend not responding"

api-test: ## Test API endpoint
	@echo "🧪 Testing API..."
	@curl -s -X POST http://localhost:8000/api/v1/thumbnails/generate \
		-H "Content-Type: application/json" \
		-d '{"channel_id":"test","video_title":"Test Video","num_variants":1}' | \
		python3 -m json.tool 2>/dev/null || echo "API test failed"

dev-frontend: ## Run frontend in development mode
	cd frontend && npm run dev

dev-backend: ## Run backend in development mode
	cd backend && uvicorn app.main:app --reload
