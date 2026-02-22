"""
================================================================================
Vercel Serverless API Entry Point
================================================================================
This file serves as the main entry point for Vercel serverless deployment.
It adapts the FastAPI app to work with Vercel's serverless environment.
================================================================================
"""

import os
import sys
from typing import Dict, Any

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import the FastAPI app
from backend.app.main import app

# Vercel serverless handler
from mangum import Mangum

# Create ASGI handler for Vercel
handler = Mangum(app, lifespan="off")

# For Vercel, we need to export the handler
def vercel_handler(event, context):
    """Vercel serverless handler."""
    return handler(event, context)
