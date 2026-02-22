"""
================================================================================
Database Service - PostgreSQL with Supabase Compatibility
================================================================================
Handles all database operations for the thumbnail generation system.
Uses asyncpg for high-performance async PostgreSQL operations.
================================================================================
"""

import json
import logging
from datetime import datetime
from typing import Any, Optional

import asyncpg

logger = logging.getLogger(__name__)


class DatabaseService:
    """Async PostgreSQL database service with Supabase compatibility."""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """Initialize database connection pool."""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=2,
                max_size=10,
                command_timeout=60,
            )
            logger.info("Database connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def disconnect(self) -> None:
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    async def ping(self) -> bool:
        """Check database connectivity."""
        if not self.pool:
            return False
        try:
            async with self.pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                return result == 1
        except Exception as e:
            logger.error(f"Database ping failed: {e}")
            return False
    
    async def create_job(self, job_data: dict[str, Any]) -> None:
        """Create a new job record."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO thumbnail_jobs (
                    job_id, channel_id, video_title, video_description,
                    reference_thumbnail_url, num_variants, status, progress,
                    metadata, is_regeneration, original_job_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (job_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    progress = EXCLUDED.progress,
                    updated_at = NOW()
                """,
                job_data["job_id"],
                job_data["channel_id"],
                job_data["video_title"],
                job_data.get("video_description"),
                job_data.get("reference_thumbnail_url"),
                job_data.get("num_variants", 3),
                job_data.get("status", "pending"),
                job_data.get("progress", 0),
                json.dumps(job_data.get("metadata", {})),
                job_data.get("is_regeneration", False),
                job_data.get("original_job_id"),
                datetime.fromisoformat(job_data["created_at"].replace('Z', '+00:00')) if isinstance(job_data["created_at"], str) else job_data["created_at"],
            )
            logger.debug(f"Job {job_data['job_id']} created in database")
    
    async def get_job(self, job_id: str) -> Optional[dict[str, Any]]:
        """Retrieve a job by ID."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM thumbnail_jobs WHERE job_id = $1",
                job_id
            )
            if row:
                return dict(row)
            return None
    
    async def update_job_status(
        self,
        job_id: str,
        status: str,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        """Update job status and progress."""
        async with self.pool.acquire() as conn:
            updates = ["status = $2"]
            params = [job_id, status]
            param_idx = 3
            
            if progress is not None:
                updates.append(f"progress = ${param_idx}")
                params.append(progress)
                param_idx += 1
            
            if message is not None:
                updates.append(f"message = ${param_idx}")
                params.append(message)
                param_idx += 1
            
            if error is not None:
                updates.append(f"error = ${param_idx}")
                params.append(error)
                param_idx += 1
            
            if status in ("completed", "failed"):
                updates.append("completed_at = NOW()")
            
            query = f"""
                UPDATE thumbnail_jobs
                SET {', '.join(updates)}, updated_at = NOW()
                WHERE job_id = $1
            """
            
            await conn.execute(query, *params)
            logger.debug(f"Job {job_id} status updated to {status}")
    
    async def update_job_variants(
        self,
        job_id: str,
        variants: list[dict[str, Any]],
    ) -> None:
        """Update job with generated variants."""
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE thumbnail_jobs
                SET variants = $2, status = 'completed', progress = 100,
                    completed_at = NOW(), updated_at = NOW()
                WHERE job_id = $1
                """,
                job_id,
                json.dumps(variants),
            )
            logger.info(f"Job {job_id} updated with {len(variants)} variants")
