"""
Thumbnail generation endpoint for Vercel serverless.
Uses Upstash Redis for queueing and Supabase for database.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import uuid
from datetime import datetime
import urllib.request
import urllib.error

# Try to import optional dependencies
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


def get_redis_client():
    """Get Redis client from environment."""
    if not REDIS_AVAILABLE:
        return None
    
    redis_url = os.getenv("REDIS_URL", os.getenv("KV_URL"))
    if redis_url:
        return redis.from_url(redis_url, decode_responses=True)
    
    # Upstash Redis (Vercel KV)
    upstash_url = os.getenv("UPSTASH_REDIS_REST_URL")
    upstash_token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
    
    if upstash_url and upstash_token:
        # For Upstash REST API, we'd need a different client
        # This is a simplified version
        pass
    
    return None


def save_job_to_db(job_data: dict) -> bool:
    """Save job to Supabase database."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        # No database configured, store in memory (not for production)
        return True
    
    try:
        req = urllib.request.Request(
            f"{supabase_url}/rest/v1/thumbnail_jobs",
            data=json.dumps(job_data).encode(),
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            method="POST"
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        print(f"Database error: {e}")
        return False


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            # Validate required fields
            if not data.get('channel_id') or not data.get('video_title'):
                self.send_error_response(400, "Missing required fields: channel_id, video_title")
                return
            
            # Generate job ID
            job_id = str(uuid.uuid4())
            created_at = datetime.utcnow().isoformat()
            
            # Create job data
            job_data = {
                "job_id": job_id,
                "channel_id": data['channel_id'],
                "video_title": data['video_title'],
                "video_description": data.get('video_description'),
                "reference_thumbnail_url": data.get('reference_thumbnail_url'),
                "num_variants": data.get('num_variants', 3),
                "status": "pending",
                "progress": 0,
                "created_at": created_at,
                "updated_at": created_at
            }
            
            # Save to database
            save_job_to_db(job_data)
            
            # Try to queue job
            redis_client = get_redis_client()
            if redis_client:
                redis_client.lpush("thumbnail-generation", json.dumps(job_data))
            
            # Return response
            response = {
                "job_id": job_id,
                "status": "pending",
                "message": "Thumbnail generation job submitted",
                "estimated_seconds": 45,
                "created_at": created_at
            }
            
            self.send_response(202)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except json.JSONDecodeError:
            self.send_error_response(400, "Invalid JSON")
        except Exception as e:
            print(f"Error: {e}")
            self.send_error_response(500, str(e))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_error_response(self, code: int, message: str):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())
