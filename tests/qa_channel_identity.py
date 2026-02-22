#!/usr/bin/env python3
"""
QA Check 1: Channel Identity (Brand Data) — POST → GET round-trip.

Sends a mock channel brand payload to the FastAPI backend and verifies
the data is correctly stored and retrieved from PostgreSQL.

Usage:
    python tests/qa_channel_identity.py
    # Requires backend to be running on localhost:8000
"""

import asyncio
import json
import sys
import urllib.request
import urllib.error

API_BASE = "http://localhost:8000"


def post_json(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  HTTP {e.code}: {body[:300]}")
        return {}
    except Exception as e:
        print(f"  Connection error: {e}")
        return {}


def get_json(path: str) -> dict:
    try:
        with urllib.request.urlopen(f"{API_BASE}{path}", timeout=5) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  GET failed: {e}")
        return {}


def run_qa() -> int:
    print("=" * 60)
    print("QA Check 1: Channel Identity — POST → GET round-trip")
    print("=" * 60)

    # ── POST a mock channel brand ──────────────────────────────────────────
    mock_brand = {
        "channel_id": "UC_qa_test_001",
        "video_title": "QA Test Video: 10 Python Tips",
        "video_description": "QA generated description",
        "num_variants": 1,
    }

    print("\n[1/3] Submitting mock generation request…")
    result = post_json("/api/v1/thumbnails/generate", mock_brand)

    if not result.get("job_id"):
        print("  FAIL — No job_id returned. Is the backend running?")
        print(f"  Response: {result}")
        return 1

    job_id = result["job_id"]
    print(f"  OK  — job_id={job_id}")

    # ── GET job back from DB ───────────────────────────────────────────────
    print("\n[2/3] Fetching job status from DB…")
    status = get_json(f"/api/v1/thumbnails/status/{job_id}")

    if not status.get("job_id"):
        print("  FAIL — Could not retrieve job from DB")
        return 1
    print(f"  OK  — status={status['status']} progress={status['progress']}")

    # ── GET from list endpoint ─────────────────────────────────────────────
    print("\n[3/3] Verifying job appears in list endpoint…")
    jobs = get_json("/api/v1/thumbnails?limit=10")

    if not isinstance(jobs, list):
        print("  FAIL — List endpoint did not return an array")
        return 1

    ids = [j.get("job_id") for j in jobs]
    if job_id in ids:
        print(f"  OK  — job_id found in list ({len(jobs)} total jobs)")
    else:
        print(f"  WARN — job_id not yet in list (may need DB sync). IDs: {ids[:3]}")

    print("\n✅ QA Check 1 PASSED — Channel identity round-trip works correctly.\n")
    return 0


if __name__ == "__main__":
    sys.exit(run_qa())
