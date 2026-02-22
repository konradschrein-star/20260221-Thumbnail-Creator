"""
Unified Vercel Serverless API for AI Thumbnail Farm
Handles all API routes in a single serverless function.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import uuid
from datetime import datetime
from urllib.parse import urlparse, parse_qs

# In-memory storage for serverless (use Supabase for production)
_jobs_store = {}


def get_job(job_id: str) -> dict:
    """Get job from store or database."""
    # Check in-memory first
    if job_id in _jobs_store:
        return _jobs_store[job_id]
    
    # Try Supabase
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if supabase_url and supabase_key:
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{supabase_url}/rest/v1/thumbnail_jobs?job_id=eq.{job_id}",
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                }
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                if data:
                    return data[0]
        except Exception as e:
            print(f"Supabase error: {e}")
    
    return None


def save_job(job_data: dict):
    """Save job to store and database."""
    # Save to in-memory
    _jobs_store[job_data["job_id"]] = job_data
    
    # Try Supabase
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if supabase_url and supabase_key:
        try:
            import urllib.request
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
        except Exception as e:
            print(f"Supabase save error: {e}")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)
        
        # Route: /api/v1/health
        if path.endswith('/health'):
            self.handle_health()
        # Route: /api/v1/thumbnails/status/{job_id}
        elif '/thumbnails/status/' in path:
            job_id = path.split('/thumbnails/status/')[-1]
            self.handle_get_status(job_id)
        # Route: /api/v1/thumbnails/stream/{job_id}
        elif '/thumbnails/stream/' in path:
            job_id = path.split('/thumbnails/stream/')[-1]
            self.handle_stream(job_id)
        else:
            self.send_error_response(404, "Not found")
    
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        # Route: /api/v1/thumbnails/generate
        if path.endswith('/thumbnails/generate'):
            self.handle_generate()
        # Route: /api/v1/thumbnails/regenerate/{job_id}
        elif '/thumbnails/regenerate/' in path:
            job_id = path.split('/thumbnails/regenerate/')[-1]
            self.handle_regenerate(job_id)
        else:
            self.send_error_response(404, "Not found")
    
    def do_OPTIONS(self):
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def handle_health(self):
        response = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ai-thumbnail-farm-api",
            "version": "1.0.0"
        }
        self.send_json_response(200, response)
    
    def handle_generate(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            # Validate
            if not data.get('channel_id') or not data.get('video_title'):
                self.send_error_response(400, "Missing required fields")
                return
            
            job_id = str(uuid.uuid4())
            created_at = datetime.utcnow().isoformat()
            
            job_data = {
                "job_id": job_id,
                "channel_id": data['channel_id'],
                "video_title": data['video_title'],
                "video_description": data.get('video_description'),
                "reference_thumbnail_url": data.get('reference_thumbnail_url'),
                "num_variants": min(data.get('num_variants', 3), 5),
                "status": "pending",
                "progress": 0,
                "created_at": created_at,
                "updated_at": created_at
            }
            
            save_job(job_data)
            
            response = {
                "job_id": job_id,
                "status": "pending",
                "message": "Job submitted successfully",
                "estimated_seconds": 45,
                "created_at": created_at
            }
            
            self.send_json_response(202, response)
            
        except json.JSONDecodeError:
            self.send_error_response(400, "Invalid JSON")
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def handle_get_status(self, job_id: str):
        job = get_job(job_id)
        
        if not job:
            self.send_error_response(404, "Job not found")
            return
        
        response = {
            "job_id": job_id,
            "status": job.get("status", "unknown"),
            "progress": job.get("progress", 0),
            "message": job.get("message"),
            "variants": job.get("variants"),
            "error": job.get("error"),
            "updated_at": job.get("updated_at")
        }
        
        self.send_json_response(200, response)
    
    def handle_stream(self, job_id: str):
        """SSE stream for job status."""
        job = get_job(job_id)
        
        if not job:
            self.send_error_response(404, "Job not found")
            return
        
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Send current status
        event_data = {
            "job_id": job_id,
            "status": job.get("status", "unknown"),
            "progress": job.get("progress", 0),
            "message": job.get("message"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if job.get("variants"):
            event_data["variants"] = job["variants"]
        
        self.wfile.write(f"event: status\ndata: {json.dumps(event_data)}\n\n".encode())
        
        # Send complete event if done
        if job.get("status") in ["completed", "failed"]:
            self.wfile.write(f"event: complete\ndata: {json.dumps({'final_status': job['status']})}\n\n".encode())
    
    def handle_regenerate(self, original_job_id: str):
        """Create a new regeneration job."""
        original = get_job(original_job_id)
        
        if not original:
            self.send_error_response(404, "Original job not found")
            return
        
        job_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        
        job_data = {
            "job_id": job_id,
            "original_job_id": original_job_id,
            "channel_id": original["channel_id"],
            "video_title": original["video_title"],
            "video_description": original.get("video_description"),
            "reference_thumbnail_url": original.get("reference_thumbnail_url"),
            "num_variants": original.get("num_variants", 3),
            "status": "pending",
            "progress": 0,
            "is_regeneration": True,
            "created_at": created_at,
            "updated_at": created_at
        }
        
        save_job(job_data)
        
        response = {
            "job_id": job_id,
            "status": "pending",
            "message": "Regeneration job submitted with priority",
            "estimated_seconds": 30,
            "created_at": created_at
        }
        
        self.send_json_response(202, response)
    
    def send_json_response(self, code: int, data: dict):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def send_error_response(self, code: int, message: str):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())
