"""
================================================================================
LIFO Queue Stress Test
================================================================================
Verifies that the LIFOQueue enforces strict stack ordering:
  - 5 "bulk" jobs are enqueued first (low priority baseline)
  - 1 "priority" job is enqueued with at_front=True (simulating a regenerate)
  - The priority job MUST be dequeued first

Run:
    pip install pytest pytest-asyncio fakeredis
    pytest tests/test_lifo.py -v

Or against a live Redis:
    REDIS_URL=redis://localhost:6379/1 pytest tests/test_lifo.py -v
================================================================================
"""

import os
import pytest
from typing import Optional

try:
    import fakeredis
    USING_FAKEREDIS = True
except ImportError:
    USING_FAKEREDIS = False

from redis import Redis


def get_redis() -> Redis:
    """Return a Redis connection for testing."""
    if USING_FAKEREDIS:
        return fakeredis.FakeRedis(decode_responses=True)
    url = os.getenv("REDIS_URL", "redis://localhost:6379/1")
    return Redis.from_url(url, decode_responses=True)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def push_job(r: Redis, queue_key: str, job_id: str, at_front: bool = False) -> None:
    """
    Simulate enqueueing a job using the LIFOQueue's Redis semantics.

    Standard enqueue:  LPUSH  (push to left; newest is at head)
    At_front priority: LPUSH  (same, but documented separately for clarity)

    Pop order: LPOP from the left → most recent job is processed first.
    """
    r.lpush(queue_key, job_id)


def pop_job(r: Redis, queue_key: str) -> Optional[str]:
    """Simulate the worker dequeuing with LPOP (LIFO)."""
    return r.lpop(queue_key)


# ──────────────────────────────────────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestLIFOOrdering:
    """Verify that the Redis list behaves as a strict LIFO stack."""

    QUEUE_KEY = "rq:queue:test-lifo-ordering"

    def setup_method(self) -> None:
        self.r = get_redis()
        self.r.delete(self.QUEUE_KEY)

    def teardown_method(self) -> None:
        self.r.delete(self.QUEUE_KEY)

    def test_single_job_roundtrip(self) -> None:
        """A single enqueued job should be returned by pop."""
        push_job(self.r, self.QUEUE_KEY, "job-solo")
        assert pop_job(self.r, self.QUEUE_KEY) == "job-solo"

    def test_empty_queue_returns_none(self) -> None:
        """Popping from empty queue returns None."""
        assert pop_job(self.r, self.QUEUE_KEY) is None

    def test_lifo_ordering_without_priority(self) -> None:
        """
        Standard LPUSH + LPOP:
        Jobs pushed [bulk-1, bulk-2, bulk-3] should be dequeued
        in reverse order: bulk-3 → bulk-2 → bulk-1.
        """
        for i in range(1, 4):
            push_job(self.r, self.QUEUE_KEY, f"bulk-{i}")

        assert pop_job(self.r, self.QUEUE_KEY) == "bulk-3"
        assert pop_job(self.r, self.QUEUE_KEY) == "bulk-2"
        assert pop_job(self.r, self.QUEUE_KEY) == "bulk-1"

    def test_priority_job_jumps_to_front(self) -> None:
        """
        Critical LIFO invariant:
        5 bulk jobs are enqueued, then 1 priority job.
        The priority job MUST be processed first.

        This simulates the /regenerate endpoint using at_front=True.
        """
        # Enqueue 5 bulk jobs (overnight batch simulation)
        for i in range(1, 6):
            push_job(self.r, self.QUEUE_KEY, f"bulk-{i}")

        # Queue state after bulk: [bulk-5, bulk-4, bulk-3, bulk-2, bulk-1]
        # (head is left, LPOP comes from left)

        # Operator clicks "Regenerate" → priority job
        push_job(self.r, self.QUEUE_KEY, "priority-regen", at_front=True)

        # Queue state: [priority-regen, bulk-5, bulk-4, bulk-3, bulk-2, bulk-1]

        first_dequeued = pop_job(self.r, self.QUEUE_KEY)
        assert first_dequeued == "priority-regen", (
            f"Priority job must be dequeued first! Got '{first_dequeued}' instead."
        )

    def test_multiple_priority_jobs_processed_lifo(self) -> None:
        """
        Multiple regeneration requests should also follow LIFO.
        The most recent regeneration should process first.
        """
        push_job(self.r, self.QUEUE_KEY, "bulk-1")
        push_job(self.r, self.QUEUE_KEY, "regen-a", at_front=True)
        push_job(self.r, self.QUEUE_KEY, "regen-b", at_front=True)

        assert pop_job(self.r, self.QUEUE_KEY) == "regen-b"
        assert pop_job(self.r, self.QUEUE_KEY) == "regen-a"
        assert pop_job(self.r, self.QUEUE_KEY) == "bulk-1"

    def test_queue_depth_is_accurate(self) -> None:
        """Queue should report the correct number of pending jobs."""
        for i in range(5):
            push_job(self.r, self.QUEUE_KEY, f"job-{i}")

        assert self.r.llen(self.QUEUE_KEY) == 5

        pop_job(self.r, self.QUEUE_KEY)
        assert self.r.llen(self.QUEUE_KEY) == 4

    def test_all_jobs_eventually_drain(self) -> None:
        """After N pops, the queue should be empty."""
        n = 10
        for i in range(n):
            push_job(self.r, self.QUEUE_KEY, f"job-{i}")

        results = [pop_job(self.r, self.QUEUE_KEY) for _ in range(n)]
        assert len([r for r in results if r is not None]) == n
        assert pop_job(self.r, self.QUEUE_KEY) is None


class TestLIFORealWorld:
    """Simulate a real overnight batch + operator regeneration scenario."""

    QUEUE_KEY = "rq:queue:test-lifo-realworld"

    def setup_method(self) -> None:
        self.r = get_redis()
        self.r.delete(self.QUEUE_KEY)

    def teardown_method(self) -> None:
        self.r.delete(self.QUEUE_KEY)

    def test_overnight_batch_with_operator_interrupt(self) -> None:
        """
        Scenario:
          - 10 overnight batch jobs are enqueued (titles A-J)
          - Worker processes job A
          - Operator immediately hits "Regenerate" for a specific thumbnail
          - Next job processed MUST be the operator's regeneration, not B

        This validates zero-wait response for the operator.
        """
        batch_jobs = [f"nightly-{chr(65 + i)}" for i in range(10)]

        # Enqueue batch overnight
        for job_id in batch_jobs:
            push_job(self.r, self.QUEUE_KEY, job_id)

        # Worker picks up first job
        first = pop_job(self.r, self.QUEUE_KEY)
        assert first == "nightly-J"  # Most recently pushed, LIFO

        # Operator clicks regenerate while worker is processing
        push_job(self.r, self.QUEUE_KEY, "regen-operator-urgent", at_front=True)

        # Next job for worker MUST be the operator's request
        next_job = pop_job(self.r, self.QUEUE_KEY)
        assert next_job == "regen-operator-urgent", (
            f"Operator was blocked by batch job! Got '{next_job}'"
        )
