"""
================================================================================
AI Thumbnail Rendering Farm - FastAPI Backend
================================================================================
Enterprise-grade API for AI-powered YouTube thumbnail generation with strict
LIFO queue implementation for priority job handling.

Key Features:
- Strict LIFO queue using custom RQ Queue subclass
- Server-Sent Events (SSE) for real-time job status streaming
- Comprehensive error handling and logging
- Type-safe Pydantic models
================================================================================
"""

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

import asyncpg
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, HttpUrl, field_validator
from redis import Redis

from app.queue.lifo_queue import LIFOQueue
from app.services.database import DatabaseService
from app.services.storage import StorageService

# =============================================================================
# Logging Configuration
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# =============================================================================
# Environment Configuration
# =============================================================================
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/thumbnail_farm")

# =============================================================================
# Pydantic Models
# =============================================================================


class ThumbnailGenerationRequest(BaseModel):
    """Request model for thumbnail generation."""
    channel_id: str = Field(..., min_length=1, max_length=255, description="YouTube channel ID")
    video_title: str = Field(..., min_length=1, max_length=200, description="Video title text")
    video_description: Optional[str] = Field(
        default=None, max_length=2000, description="Optional video description for context"
    )
    reference_thumbnail_url: Optional[HttpUrl] = Field(
        default=None, description="URL of reference thumbnail for style guidance"
    )
    num_variants: int = Field(
        default=3, ge=1, le=5, description="Number of thumbnail variants to generate"
    )

    @field_validator("video_title")
    @classmethod
    def sanitize_title(cls, v: str) -> str:
        """Sanitize video title — strip control characters, cap at 200 chars."""
        return "".join(ch for ch in v if ch.isprintable())[:200]


class ThumbnailVariant(BaseModel):
    """Model representing a generated thumbnail variant."""
    variant_id: str
    image_url: str
    metadata: dict = Field(default_factory=dict)


class ThumbnailGenerationResponse(BaseModel):
    """Response model for thumbnail generation request."""
    job_id: str
    status: str
    message: str
    estimated_seconds: int
    created_at: datetime


class JobStatusResponse(BaseModel):
    """Model for job status updates."""
    job_id: str
    status: str  # pending, processing, completed, failed
    progress: int = Field(ge=0, le=100)
    message: Optional[str] = None
    variants: Optional[list[ThumbnailVariant]] = None
    error: Optional[str] = None
    updated_at: datetime


# =============================================================================
# Global State Management
# =============================================================================

class AppState:
    """Application state container for lifespan management."""
    redis: Optional[Redis] = None
    db: Optional[DatabaseService] = None
    queue: Optional[LIFOQueue] = None
    storage: Optional[StorageService] = None


app_state = AppState()


# =============================================================================
# Lifespan Context Manager
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("Starting up AI Thumbnail Rendering Farm...")
    
    # Initialize Redis connection
    app_state.redis = Redis.from_url(REDIS_URL, decode_responses=True)
    
    # Initialize LIFO Queue
    app_state.queue = LIFOQueue(connection=app_state.redis, name="thumbnail-generation")
    
    # Initialize database service
    app_state.db = DatabaseService(DATABASE_URL)
    await app_state.db.connect()
    
    # Initialize storage service
    app_state.storage = StorageService()
    
    logger.info("All services initialized successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down...")
    if app_state.redis:
        app_state.redis.close()
    if app_state.db:
        await app_state.db.disconnect()


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="AI Thumbnail Rendering Farm",
    description="Enterprise API for AI-powered YouTube thumbnail generation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Health Check Endpoints
# =============================================================================

@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Health check endpoint for load balancers."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {}
    }
    
    # Check Redis
    try:
        app_state.redis.ping()
        health_status["services"]["redis"] = "connected"
    except Exception as e:
        health_status["services"]["redis"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Database
    try:
        await app_state.db.ping()
        health_status["services"]["database"] = "connected"
    except Exception as e:
        health_status["services"]["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


@app.get("/api/v1/health/detailed", tags=["Health"])
async def detailed_health_check() -> dict:
    """Detailed health check with queue statistics."""
    basic = await health_check()
    
    # Get queue statistics
    try:
        queue_stats = {
            "queued": app_state.queue.count,
            "started": len(app_state.queue.started_job_registry),
            "finished": len(app_state.queue.finished_job_registry),
            "failed": len(app_state.queue.failed_job_registry),
        }
        basic["queue_stats"] = queue_stats
    except Exception as e:
        basic["queue_stats"] = {"error": str(e)}
    
    return basic


# =============================================================================
# Thumbnail Generation Endpoints
# =============================================================================

@app.post(
    "/api/v1/thumbnails/generate",
    response_model=ThumbnailGenerationResponse,
    status_code=202,
    tags=["Thumbnail Generation"],
)
async def generate_thumbnails(
    request: ThumbnailGenerationRequest,
    background_tasks: BackgroundTasks,
) -> ThumbnailGenerationResponse:
    """
    Submit a thumbnail generation job to the LIFO queue.
    
    The job will be processed by workers with strict LIFO ordering,
    ensuring manual regenerations preempt bulk batch jobs.
    """
    job_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)

    logger.info(
        "Thumbnail generation request: job_id=%s channel=%s",
        job_id,
        request.channel_id,
    )
    
    # Prepare job data
    job_data = {
        "job_id": job_id,
        "channel_id": request.channel_id,
        "video_title": request.video_title,
        "video_description": request.video_description,
        "reference_thumbnail_url": str(request.reference_thumbnail_url) if request.reference_thumbnail_url else None,
        "num_variants": request.num_variants,
        "created_at": created_at.isoformat(),
        "status": "pending",
        "progress": 0,
    }
    
    # Store job metadata in database
    await app_state.db.create_job(job_data)
    
    # Enqueue job using LIFO queue (lpush for stack behavior)
    # Uses the sync RQ wrapper — asyncio.run() is called inside the worker process
    app_state.queue.enqueue(
        "worker.app.pipeline.process_thumbnail_job_sync",
        job_data,
        job_id=job_id,
        job_timeout=600,
        result_ttl=86400,
        failure_ttl=604800,
    )
    
    logger.info(f"Job enqueued successfully: job_id={job_id}, queue_position={app_state.queue.count}")
    
    # Estimate processing time based on queue depth
    queue_depth = app_state.queue.count
    estimated_seconds = min(30 + (queue_depth * 15), 300)  # Cap at 5 minutes
    
    return ThumbnailGenerationResponse(
        job_id=job_id,
        status="pending",
        message=f"Thumbnail generation job submitted. Position in queue: {queue_depth}",
        estimated_seconds=estimated_seconds,
        created_at=created_at,
    )


@app.get(
    "/api/v1/thumbnails/status/{job_id}",
    response_model=JobStatusResponse,
    tags=["Thumbnail Generation"],
)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """Get the current status of a thumbnail generation job."""
    # Try to get from database first
    job_data = await app_state.db.get_job(job_id)
    
    if not job_data:
        # Check if job exists in RQ
        try:
            job = app_state.queue.fetch_job(job_id)
            if job:
                job_data = {
                    "job_id": job_id,
                    "status": job.get_status(),
                    "progress": job.meta.get("progress", 0) if job.meta else 0,
                    "message": job.meta.get("message", "") if job.meta else "",
                    "updated_at": datetime.utcnow(),
                }
            else:
                raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    # Parse variants if present
    variants = None
    if job_data.get("variants"):
        variants = [ThumbnailVariant(**v) for v in job_data["variants"]]
    
    return JobStatusResponse(
        job_id=job_id,
        status=job_data.get("status", "unknown"),
        progress=job_data.get("progress", 0),
        message=job_data.get("message"),
        variants=variants,
        error=job_data.get("error"),
        updated_at=job_data.get("updated_at", datetime.utcnow()),
    )


# =============================================================================
# Server-Sent Events (SSE) Streaming Endpoint
# =============================================================================

async def job_status_stream(job_id: str) -> AsyncGenerator[str, None]:
    """
    Generate SSE stream for job status updates.
    
    Yields formatted SSE events with job status updates.
    Connection remains open until job completes or fails.
    """
    last_status = None
    retry_count = 0
    max_retries = 600  # 10 minutes at 1 second intervals
    
    while retry_count < max_retries:
        try:
            # Get current job status
            job_data = await app_state.db.get_job(job_id)
            
            if not job_data:
                # Check RQ directly
                job = app_state.queue.fetch_job(job_id)
                if job:
                    job_data = {
                        "job_id": job_id,
                        "status": job.get_status(),
                        "progress": job.meta.get("progress", 0) if job.meta else 0,
                        "message": job.meta.get("message", "") if job.meta else "",
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                else:
                    yield f"event: error\ndata: {json.dumps({'error': 'Job not found'})}\n\n"
                    break
            
            current_status = job_data.get("status")
            
            # Only send update if status changed
            if current_status != last_status or retry_count == 0:
                event_data = {
                    "job_id": job_id,
                    "status": current_status,
                    "progress": job_data.get("progress", 0),
                    "message": job_data.get("message", ""),
                    "timestamp": datetime.utcnow().isoformat(),
                }
                
                # Include variants if job is completed
                if current_status == "completed" and job_data.get("variants"):
                    event_data["variants"] = job_data["variants"]
                
                # Include error if job failed
                if current_status == "failed" and job_data.get("error"):
                    event_data["error"] = job_data["error"]
                
                yield f"event: status\ndata: {json.dumps(event_data)}\n\n"
                last_status = current_status
            
            # Send periodic heartbeat to keep connection alive
            if retry_count % 30 == 0 and retry_count > 0:
                yield f"event: heartbeat\ndata: {json.dumps({'timestamp': datetime.utcnow().isoformat()})}\n\n"
            
            # Check if job is complete or failed
            if current_status in ("completed", "failed"):
                yield f"event: complete\ndata: {json.dumps({'final_status': current_status})}\n\n"
                break
            
            retry_count += 1
            await asyncio.sleep(1)  # Poll every second
            
        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for job {job_id}")
            break
        except Exception as e:
            logger.error(f"Error in SSE stream for job {job_id}: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            break
    
    # Timeout reached
    if retry_count >= max_retries:
        yield f"event: timeout\ndata: {json.dumps({'error': 'Stream timeout'})}\n\n"


@app.get("/api/v1/thumbnails/stream/{job_id}", tags=["Thumbnail Generation"])
async def stream_job_status(job_id: str, request: Request) -> StreamingResponse:
    """
    Stream job status updates via Server-Sent Events (SSE).
    
    This endpoint maintains a persistent connection and pushes real-time
    updates as the thumbnail generation job progresses.
    
    Client should handle:
    - status: Job status update
    - heartbeat: Keep-alive ping (every 30 seconds)
    - complete: Job finished (completed or failed)
    - error: Error occurred
    - timeout: Stream timeout reached
    """
    # Verify job exists
    job_exists = await app_state.db.get_job(job_id)
    if not job_exists:
        job = app_state.queue.fetch_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return StreamingResponse(
        job_status_stream(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


# =============================================================================
# Regenerate Endpoint (Priority LIFO)
# =============================================================================

@app.post(
    "/api/v1/thumbnails/regenerate/{job_id}",
    response_model=ThumbnailGenerationResponse,
    status_code=202,
    tags=["Thumbnail Generation"],
)
async def regenerate_thumbnails(
    job_id: str,
    background_tasks: BackgroundTasks,
) -> ThumbnailGenerationResponse:
    """
    Regenerate thumbnails for an existing job with LIFO priority.
    
    This endpoint places the job at the front of the queue using
    strict LIFO ordering, ensuring immediate processing.
    """
    # Get original job data
    original_job = await app_state.db.get_job(job_id)
    
    if not original_job:
        raise HTTPException(status_code=404, detail=f"Original job {job_id} not found")
    
    # Create new job ID for regeneration
    new_job_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)

    logger.info("Regenerating: original=%s new=%s", job_id, new_job_id)
    
    # Prepare job data with regeneration flag
    job_data = {
        "job_id": new_job_id,
        "original_job_id": job_id,
        "channel_id": original_job["channel_id"],
        "video_title": original_job["video_title"],
        "video_description": original_job.get("video_description"),
        "reference_thumbnail_url": original_job.get("reference_thumbnail_url"),
        "num_variants": original_job.get("num_variants", 3),
        "created_at": created_at.isoformat(),
        "status": "pending",
        "progress": 0,
        "is_regeneration": True,
    }
    
    # Store in database
    await app_state.db.create_job(job_data)
    
    # Enqueue at the FRONT of the LIFO stack — preempts all pending batch jobs
    app_state.queue.enqueue(
        "worker.app.pipeline.process_thumbnail_job_sync",
        job_data,
        job_id=new_job_id,
        job_timeout=600,
        result_ttl=86400,
        failure_ttl=604800,
        at_front=True,
    )
    
    logger.info(f"Regeneration job enqueued with priority: new_job_id={new_job_id}")
    
    return ThumbnailGenerationResponse(
        job_id=new_job_id,
        status="pending",
        message="Regeneration job submitted with LIFO priority — processing next.",
        estimated_seconds=30,
        created_at=created_at,
    )


# =============================================================================
# Job Listing Endpoint
# =============================================================================

class JobListItem(BaseModel):
    """Minimal job summary for the list view."""
    job_id: str
    status: str
    progress: int
    video_title: str
    channel_id: str
    num_variants: int
    created_at: datetime
    updated_at: datetime


@app.get(
    "/api/v1/thumbnails",
    response_model=list[JobListItem],
    tags=["Thumbnail Generation"],
)
async def list_jobs(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
) -> list[JobListItem]:
    """
    List recent thumbnail generation jobs.

    Args:
        limit:  Maximum results to return (default 50, max 200).
        offset: Pagination offset.
        status: Optional filter — 'pending', 'processing', 'completed', 'failed'.
    """
    limit = min(limit, 200)
    jobs = await app_state.db.list_jobs(limit=limit, offset=offset, status=status)
    return [
        JobListItem(
            job_id=j["job_id"],
            status=j["status"],
            progress=j.get("progress", 0),
            video_title=j["video_title"],
            channel_id=j["channel_id"],
            num_variants=j.get("num_variants", 3),
            created_at=j["created_at"],
            updated_at=j.get("updated_at", j["created_at"]),
        )
        for j in jobs
    ]


# =============================================================================
# Error Handlers
# =============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions with structured response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.exception("Unhandled exception occurred")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if os.getenv("DEBUG") == "true" else "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
