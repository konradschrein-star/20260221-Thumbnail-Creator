"""
================================================================================
Database Service - PostgreSQL with Supabase Compatibility
================================================================================
Handles all database operations for the thumbnail generation system.
Uses asyncpg for high-performance async PostgreSQL operations.

Features:
- Job metadata storage with jsonb for flexibility
- pgvector extension for future similarity searches
- Connection pooling for performance
- Automatic schema initialization
================================================================================
"""

import json
import logging
from datetime import datetime
from typing import Any, Optional

import asyncpg

logger = logging.getLogger(__name__)


class DatabaseService:
    """
    Async PostgreSQL database service with Supabase compatibility.
    
    Uses jsonb columns for flexible metadata storage and supports
    pgvector for future similarity search capabilities.
    """
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """Initialize database connection pool."""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=5,
                max_size=20,
                command_timeout=60,
            )
            logger.info("Database connection pool initialized")
            
            # Initialize schema
            await self._init_schema()
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
    
    async def _init_schema(self) -> None:
        """Initialize database schema with extensions and tables."""
        async with self.pool.acquire() as conn:
            # Enable required extensions
            await conn.execute("""
                CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            """)
            
            # Try to enable pgvector (may fail if not installed, which is OK)
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                logger.info("pgvector extension enabled")
            except Exception:
                logger.warning("pgvector extension not available, similarity search disabled")
            
            # Create jobs table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS thumbnail_jobs (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    job_id VARCHAR(255) UNIQUE NOT NULL,
                    channel_id VARCHAR(255) NOT NULL,
                    video_title TEXT NOT NULL,
                    video_description TEXT,
                    reference_thumbnail_url TEXT,
                    num_variants INTEGER DEFAULT 3,
                    status VARCHAR(50) DEFAULT 'pending',
                    progress INTEGER DEFAULT 0,
                    message TEXT,
                    error TEXT,
                    metadata JSONB DEFAULT '{}',
                    variants JSONB DEFAULT '[]',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    completed_at TIMESTAMP WITH TIME ZONE,
                    is_regeneration BOOLEAN DEFAULT FALSE,
                    original_job_id VARCHAR(255)
                );
            """)
            
            # Create indexes
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_jobs_status ON thumbnail_jobs(status);
                CREATE INDEX IF NOT EXISTS idx_jobs_channel ON thumbnail_jobs(channel_id);
                CREATE INDEX IF NOT EXISTS idx_jobs_created ON thumbnail_jobs(created_at DESC);
            """)
            
            # Create updated_at trigger
            await conn.execute("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            """)
            
            await conn.execute("""
                DROP TRIGGER IF EXISTS update_thumbnail_jobs_updated_at ON thumbnail_jobs;
                CREATE TRIGGER update_thumbnail_jobs_updated_at
                    BEFORE UPDATE ON thumbnail_jobs
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            """)
            
            # Create thumbnails table for storing generated thumbnails
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS generated_thumbnails (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    job_id VARCHAR(255) NOT NULL REFERENCES thumbnail_jobs(job_id),
                    variant_id VARCHAR(255) NOT NULL,
                    image_url TEXT NOT NULL,
                    storage_key TEXT NOT NULL,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(job_id, variant_id)
                );
            """)
            
            logger.info("Database schema initialized successfully")
    
    async def create_job(self, job_data: dict[str, Any]) -> None:
        """
        Create a new job record.
        
        Args:
            job_data: Dictionary containing job metadata
        """
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
                datetime.fromisoformat(job_data["created_at"]) if isinstance(job_data["created_at"], str) else job_data["created_at"],
            )
            logger.debug(f"Job {job_data['job_id']} created in database")
    
    async def get_job(self, job_id: str) -> Optional[dict[str, Any]]:
        """
        Retrieve a job by ID.
        
        Args:
            job_id: Unique job identifier
            
        Returns:
            Job data dictionary or None if not found
        """
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
        """
        Update job status and progress.
        
        Args:
            job_id: Unique job identifier
            status: New status (pending, processing, completed, failed)
            progress: Optional progress percentage (0-100)
            message: Optional status message
            error: Optional error message
        """
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
        """
        Update job with generated variants.
        
        Args:
            job_id: Unique job identifier
            variants: List of variant dictionaries
        """
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
            
            # Also insert into generated_thumbnails table
            for variant in variants:
                await conn.execute(
                    """
                    INSERT INTO generated_thumbnails (
                        job_id, variant_id, image_url, storage_key, metadata
                    ) VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (job_id, variant_id) DO UPDATE SET
                        image_url = EXCLUDED.image_url,
                        storage_key = EXCLUDED.storage_key,
                        metadata = EXCLUDED.metadata
                    """,
                    job_id,
                    variant["variant_id"],
                    variant["image_url"],
                    variant.get("storage_key", ""),
                    json.dumps(variant.get("metadata", {})),
                )
            
            logger.info(f"Job {job_id} updated with {len(variants)} variants")
    
    async def get_jobs_by_status(
        self,
        status: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """
        Get jobs filtered by status.
        
        Args:
            status: Job status to filter by
            limit: Maximum number of results
            offset: Pagination offset
            
        Returns:
            List of job dictionaries
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM thumbnail_jobs
                WHERE status = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                """,
                status, limit, offset
            )
            return [dict(row) for row in rows]
    
    async def get_channel_jobs(
        self,
        channel_id: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """
        Get jobs for a specific channel.
        
        Args:
            channel_id: Channel identifier
            limit: Maximum number of results
            
        Returns:
            List of job dictionaries
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM thumbnail_jobs
                WHERE channel_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                channel_id, limit
            )
            return [dict(row) for row in rows]
    
    async def delete_job(self, job_id: str) -> bool:
        """
        Delete a job and its associated thumbnails.
        
        Args:
            job_id: Unique job identifier
            
        Returns:
            True if deleted, False if not found
        """
        async with self.pool.acquire() as conn:
            # Delete associated thumbnails first
            await conn.execute(
                "DELETE FROM generated_thumbnails WHERE job_id = $1",
                job_id
            )
            
            # Delete job
            result = await conn.execute(
                "DELETE FROM thumbnail_jobs WHERE job_id = $1",
                job_id
            )
            
            # Check if any row was deleted
            return "DELETE 1" in result
    
    async def get_job_statistics(self) -> dict[str, Any]:
        """Get aggregate statistics for jobs."""
        async with self.pool.acquire() as conn:
            stats = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) as total_jobs,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
                    COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
                    AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))
                        FILTER (WHERE status = 'completed') as avg_processing_time
                FROM thumbnail_jobs
                WHERE created_at > NOW() - INTERVAL '24 hours'
                """
            )
            return dict(stats) if stats else {}

    async def list_jobs(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """
        List jobs ordered by creation time (newest first).

        Args:
            limit:  Maximum rows to return.
            offset: Pagination offset.
            status: Optional status to filter on.

        Returns:
            List of job dicts with all columns from thumbnail_jobs.
        """
        async with self.pool.acquire() as conn:
            if status:
                rows = await conn.fetch(
                    """
                    SELECT * FROM thumbnail_jobs
                    WHERE status = $1
                    ORDER BY created_at DESC
                    LIMIT $2 OFFSET $3
                    """,
                    status, limit, offset,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT * FROM thumbnail_jobs
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2
                    """,
                    limit, offset,
                )
            return [dict(row) for row in rows]

