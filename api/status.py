"""
Job status endpoint for Vercel serverless.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
from urllib.parse import urlparse, parse_qs


def get_job_from_db(job_id: str) -> dict:
    """Get job from Supabase database."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        return {"job_id": job_id, "status": "pending", "progress": 0}
    
    try:
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
        print(f"Database error: {e}")
    
    return {"job_id": job_id, "status": "unknown", "progress": 0}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse job_id from query string
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            job_id = params.get('job_id', [''])[0]
            
            if not job_id:
                # Try to get from path
                path_parts = self.path.split('/')
                if len(path_parts) > 1:
                    job_id = path_parts[-1].split('?')[0]
            
            if not job_id or job_id == 'status':
                self.send_error_response(400, "Missing job_id")
                return
            
            # Get job from database
            job = get_job_from_db(job_id)
            
            response = {
                "job_id": job_id,
                "status": job.get("status", "unknown"),
                "progress": job.get("progress", 0),
                "message": job.get("message"),
                "variants": job.get("variants"),
                "error": job.get("error"),
                "updated_at": job.get("updated_at")
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            print(f"Error: {e}")
            self.send_error_response(500, str(e))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_error_response(self, code: int, message: str):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())
