"""
================================================================================
RQ Worker - Main Entry Point
================================================================================
Worker process that consumes jobs from the LIFO queue and processes them
through the thumbnail generation pipeline.

Usage:
    python -m app.worker

Environment Variables:
    REDIS_URL: Redis connection URL
    DATABASE_URL: PostgreSQL connection URL
    R2_*: Cloudflare R2 credentials
    FAL_AI_API_KEY: Fal.ai API key
    QWEN_API_KEY: Qwen API key
================================================================================
"""

import asyncio
import logging
import os
import sys
from datetime import datetime

from redis import Redis
from rq import Worker, Queue, Connection

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "shared"))

from app.pipeline import process_thumbnail_job

# =============================================================================
# Logging Configuration
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [Worker] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# =============================================================================
# Configuration
# =============================================================================
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME = os.getenv("QUEUE_NAME", "thumbnail-generation")
WORKER_NAME = os.getenv("WORKER_NAME", f"worker-{os.getpid()}")

# =============================================================================
# Worker Entry Point
# =============================================================================

def main():
    """Main worker entry point."""
    logger.info(f"Starting RQ Worker: {WORKER_NAME}")
    logger.info(f"Redis URL: {REDIS_URL}")
    logger.info(f"Queue: {QUEUE_NAME}")
    
    # Connect to Redis
    redis_conn = Redis.from_url(REDIS_URL, decode_responses=True)
    
    try:
        # Test connection
        redis_conn.ping()
        logger.info("Connected to Redis successfully")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        sys.exit(1)
    
    # Start worker with LIFO queue
    with Connection(redis_conn):
        queue = Queue(QUEUE_NAME, connection=redis_conn)
        worker = Worker(
            [queue],
            name=WORKER_NAME,
            connection=redis_conn,
            default_result_ttl=86400,  # 24 hours
            default_worker_ttl=420,    # 7 minutes
        )
        
        logger.info("Worker ready, waiting for jobs...")
        worker.work()


if __name__ == "__main__":
    main()
