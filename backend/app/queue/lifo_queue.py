"""
================================================================================
Strict LIFO Queue Implementation for RQ
================================================================================
This module provides a custom RQ Queue subclass that implements strict
Last-In-First-Out (LIFO) behavior using Redis list operations.

Key Features:
- enqueue uses Redis LPUSH (push to left/head of list)
- dequeue uses Redis RPOP (pop from right/tail of list)
- Ensures newest jobs are processed first
- Critical for manual regenerations to preempt bulk batch jobs

Reference: Adapted from RQ's Queue class with LIFO semantics
================================================================================
"""

import logging
import uuid
from typing import Any, Optional, Union

from redis import Redis
from rq.job import Job, JobStatus
from rq.queue import Queue
from rq.registry import StartedJobRegistry
from rq.utils import backend_class, import_attribute

logger = logging.getLogger(__name__)


class LIFOQueue(Queue):
    """
    Strict LIFO (Last-In-First-Out) Queue implementation.
    
    This queue subclass overrides the default FIFO behavior of RQ to implement
    a stack-based job processing order. Jobs pushed onto the queue are placed
    at the front (left) and jobs are popped from the back (right).
    
    Redis Operations:
    - LPUSH: Add job to front of queue (left side)
    - RPOP: Remove job from back of queue (right side)
    
    This ensures that:
    1. Manual regenerations are processed immediately
    2. Bulk overnight batches are deferred until manual jobs complete
    3. Users experience zero wait time for priority operations
    
    Usage:
        queue = LIFOQueue(connection=redis_conn, name="thumbnail-generation")
        queue.enqueue(my_function, arg1, arg2)  # Added to front
        queue.enqueue(my_function, arg3, arg4)  # Added to front, processed first
    """
    
    @classmethod
    def lpush(cls, queue_key: str, job_id: str, connection: Redis, pipeline: Optional[Any] = None) -> int:
        """
        Push a job ID to the left (front) of the queue.
        
        Args:
            queue_key: Redis key for the queue
            job_id: Unique job identifier
            connection: Redis connection
            pipeline: Optional Redis pipeline
            
        Returns:
            Length of queue after push
        """
        conn = pipeline if pipeline is not None else connection
        return conn.lpush(queue_key, job_id)
    
    @classmethod
    def rpop(cls, queue_key: str, connection: Redis, timeout: Optional[int] = None) -> Optional[str]:
        """
        Pop a job ID from the right (back) of the queue.
        Note: Standard RQ uses RPOP for FIFO. This is kept for compatibility.
        """
        if timeout is not None:
            result = connection.brpop(queue_key, timeout=timeout)
            return result[1] if result else None
        return connection.rpop(queue_key)

    @classmethod
    def lpop(cls, queue_key: str, connection: Redis, timeout: Optional[int] = None) -> Optional[str]:
        """
        Pop a job ID from the left (front) of the queue (LIFO).
        """
        if timeout is not None:
            result = connection.blpop(queue_key, timeout=timeout)
            return result[1] if result else None
        return connection.lpop(queue_key)
    
    def enqueue(
        self,
        f: Any,
        *args,
        job_id: Optional[str] = None,
        at_front: bool = False,
        **kwargs
    ) -> Job:
        """
        Enqueue a job with LIFO semantics.
        
        In LIFO mode, jobs are always pushed to the front (left) of the queue
        unless at_front=False is explicitly set for compatibility.
        
        Args:
            f: Function to execute
            *args: Positional arguments for the function
            job_id: Optional custom job ID
            at_front: If True, ensure job is at absolute front (highest priority)
            **kwargs: Keyword arguments for the function
            
        Returns:
            Created Job instance
        """
        # Generate job ID if not provided
        if job_id is None:
            job_id = str(uuid.uuid4())
        
        # Create the job
        job = Job.create(
            f,
            args=args,
            kwargs=kwargs,
            connection=self.connection,
            id=job_id,
            origin=self.name,
        )
        
        # Save job to Redis
        job.save()
        
        # Push to queue using LPUSH for LIFO behavior
        # If at_front is True, we use LPUSH (left push) - newest is leftmost
        # If at_front is False (for FIFO compatibility), we use RPUSH (right push)
        if at_front:
            # High priority: push to left (will be popped first with LPOP)
            self.connection.lpush(self.key, job_id)
            logger.debug(f"Job {job_id} enqueued at front (LIFO priority)")
        else:
            # Standard LIFO: still push to left for stack behavior
            self.connection.lpush(self.key, job_id)
            logger.debug(f"Job {job_id} enqueued (LIFO)")
        
        return job
    
    def dequeue(self, timeout: Optional[int] = None) -> Optional[Job]:
        """
        Dequeue a job using LIFO semantics.
        
        Pops from the left side of the queue (newest first) for true stack behavior.
        
        Args:
            timeout: Optional timeout in seconds for blocking pop
            
        Returns:
            Job instance or None if queue is empty
        """
        # Use LPOP for LIFO (pop from left, which is the newest)
        job_id = self.connection.lpop(self.key)
        
        if job_id is None:
            return None
        
        try:
            job = Job.fetch(job_id, connection=self.connection)
            
            # Update job status
            if job:
                job.set_status(JobStatus.QUEUED)
                logger.debug(f"Job {job_id} dequeued (LIFO)")
            
            return job
        except Exception as e:
            logger.error(f"Error fetching job {job_id}: {e}")
            return None
    
    def dequeue_any(
        self,
        queues: list["LIFOQueue"],
        timeout: Optional[int] = None,
        connection: Optional[Redis] = None,
    ) -> tuple[Optional[Job], Optional["LIFOQueue"]]:
        """
        Dequeue from any of the provided queues using LIFO semantics.
        """
        conn = connection or self.connection
        queue_keys = [q.key for q in queues]
        
        # BLPOP for atomically checking multiple queues (LIFO)
        result = conn.blpop(queue_keys, timeout=timeout or 0)
        
        if result is None:
            return None, None
        
        queue_key, job_id = result
        queue_key_str = queue_key.decode() if isinstance(queue_key, bytes) else queue_key
        
        # Map back to queue object
        queue = next((q for q in queues if q.key == queue_key_str), None)
        
        try:
            job_id_str = job_id.decode() if isinstance(job_id, bytes) else job_id
            job = Job.fetch(job_id_str, connection=conn)
            if job:
                job.set_status(JobStatus.QUEUED)
            return job, queue
        except Exception as e:
            logger.error(f"Error fetching job {job_id} from {queue_key_str}: {e}")
            return None, None
    
    @property
    def count(self) -> int:
        """Return the number of jobs in the queue."""
        return self.connection.llen(self.key)
    
    def get_job_ids(self, offset: int = 0, length: int = -1) -> list[str]:
        """
        Get job IDs in the queue.
        
        Args:
            offset: Starting offset
            length: Number of items to return (-1 for all)
            
        Returns:
            List of job IDs
        """
        # LRANGE returns items from left to right
        # In LIFO, leftmost is newest, rightmost is oldest
        job_ids = self.connection.lrange(self.key, offset, length if length >= 0 else -1)
        return [jid.decode() if isinstance(jid, bytes) else jid for jid in job_ids]
    
    def remove(self, job_id: str, pipeline: Optional[Any] = None) -> int:
        """
        Remove a job from the queue.
        
        Args:
            job_id: Job ID to remove
            pipeline: Optional Redis pipeline
            
        Returns:
            Number of removed items
        """
        conn = pipeline if pipeline is not None else self.connection
        return conn.lrem(self.key, 0, job_id)
    
    def compact(self) -> int:
        """
        Remove non-existent jobs from the queue.
        
        Returns:
            Number of jobs removed
        """
        removed = 0
        for job_id in self.get_job_ids():
            if not self.job_exists(job_id):
                self.remove(job_id)
                removed += 1
        return removed
    
    def job_exists(self, job_id: str) -> bool:
        """Check if a job exists in Redis."""
        return self.connection.exists(f"rq:job:{job_id}") == 1


class LIFOWorker:
    """
    Custom lightweight worker class for LIFO queue processing.
    """
    
    def __init__(
        self,
        queues: list[LIFOQueue],
        connection: Redis,
        name: Optional[str] = None,
        default_result_ttl: int = 86400,
        default_worker_ttl: int = 420,
    ):
        self.queues = queues
        self.connection = connection
        self.name = name or f"worker-{uuid.uuid4()}"
        self.default_result_ttl = default_result_ttl
        self.default_worker_ttl = default_worker_ttl
        self._stopped = False
        
    def work(self, burst: bool = False, polling_interval: int = 5) -> bool:
        """
        Start processing jobs from the queues.
        """
        logger.info(f"Worker {self.name} started with LIFO semantics (Stack behavior)")
        
        while not self._stopped:
            try:
                # Use LIFO dequeue_any (BLPOP under the hood)
                job, queue = LIFOQueue.dequeue_any(
                    self.queues,
                    timeout=polling_interval if not burst else 1,
                    connection=self.connection,
                )
                
                if job is None:
                    if burst:
                        break
                    continue
                
                logger.info(f"Processing job {job.id} from queue {queue.name}")
                self.execute_job(job, queue)
                
                if burst:
                    break
                    
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")
                if burst:
                    break
        
        return True
    
    def execute_job(self, job: Job, queue: LIFOQueue) -> None:
        """Execute a job and handle result."""
        try:
            job.set_status(JobStatus.STARTED)
            
            # Execute function
            func = job.func
            if hasattr(func, "__call__"):
                result = func(*job.args, **job.kwargs)
            else:
                # Handle string-based imports if necessary
                f = import_attribute(job.func_name)
                result = f(*job.args, **job.kwargs)
            
            job.save_result(result, self.default_result_ttl)
            job.set_status(JobStatus.FINISHED)
            logger.info(f"Job {job.id} completed successfully")
            
        except Exception as e:
            logger.error(f"Job {job.id} failed: {e}")
            job.set_status(JobStatus.FAILED)
            job.save_meta({"error": str(e)})
    
    def stop(self) -> None:
        """Stop the worker gracefully."""
        self._stopped = True
        logger.info(f"Worker {self.name} stopping...")
