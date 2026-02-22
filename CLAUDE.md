# AI Thumbnail Rendering Farm - Developer Guide

## Build & Run Commands

### Docker (Recommended)
- **Start All Services**: `docker-compose up -d`
- **Build Services**: `docker-compose build`
- **Stop All Services**: `docker-compose down`
- **View Logs**: `docker-compose logs -f`
- **Restart Specific Service**: `docker-compose restart [service_name]` (e.g., `backend`, `worker`, `frontend`)

### Local Development

#### Backend (FastAPI)
- **Install Dependencies**: `cd backend && pip install -r requirements.txt`
- **Run Server**: `cd backend && uvicorn app.main:app --reload --port 8000`
- **Lint**: `cd backend && flake8 .`

#### Worker (RQ)
- **Install Dependencies**: `cd worker && pip install -r requirements.txt`
- **Run Worker**: `cd worker && python app/worker.py`

#### Frontend (Next.js)
- **Install Dependencies**: `cd frontend && npm install`
- **Run Dev Server**: `cd frontend && npm run dev`
- **Lint**: `cd frontend && npm run lint`

### Testing
- **Run Audit Script**: `./test.sh` (On Windows use Git Bash or WSL)

## Coding Standards

### Python (Backend/Worker)
- **Architecture**: Domain-driven design with clear separation of concerns.
- **Typing**: **Strict Type Hints are mandatory** for all function signatures and complex variables.
- **Error Handling**: Use `try/except` blocks for all external API calls (FAL AI, Storage, DB).
- **Style**: PEP 8 compliance. Use `tenacity` for retries on flaky AI generations.

### TypeScript/React (Frontend)
- **Architecture**: Next.js 14 App Router.
- **Typing**: **TypeScript interfaces are mandatory** for all props and state. Avoid `any`.
- **Components**: Functional components with hooks.
- **Styling**: Tailwind CSS for responsive design.

### General
- **No Slop**: Never output `# ... rest of code`. Write complete, production-ready logic.
- **Commits**: Frequent, descriptive commits via GitHub MCP.
- **LIFO Priority**: Ensure regenerations use the `at_front=True` flag in the `LIFOQueue`.
