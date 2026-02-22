"""
================================================================================
Storage Service - Cloudflare R2 Integration
================================================================================
Handles all object storage operations using boto3 for Cloudflare R2 compatibility.
================================================================================
"""

import logging
import os
from datetime import datetime
from io import BytesIO
from typing import Optional

logger = logging.getLogger(__name__)

# Try to import boto3, but make it optional
try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    logger.warning("boto3 not available, using local storage only")


class StorageService:
    """Cloudflare R2 storage service using S3-compatible API."""
    
    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        region: str = "auto",
    ):
        self.endpoint_url = endpoint_url or os.getenv("R2_ENDPOINT_URL")
        self.access_key_id = access_key_id or os.getenv("R2_ACCESS_KEY_ID")
        self.secret_access_key = secret_access_key or os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = bucket_name or os.getenv("R2_BUCKET_NAME", "thumbnail-farm")
        self.region = region
        
        self._client = None
        self._resource = None
    
    def _get_client(self):
        """Get or create boto3 S3 client."""
        if not BOTO3_AVAILABLE:
            raise RuntimeError("boto3 not available")
        
        if self._client is None:
            if not all([self.endpoint_url, self.access_key_id, self.secret_access_key]):
                raise ValueError("R2 credentials not configured")
            
            config = Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            )
            
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name=self.region,
                config=config,
            )
        return self._client
    
    async def upload_image(
        self,
        image_data: bytes,
        key: str,
        content_type: str = "image/png",
        metadata: Optional[dict] = None,
    ) -> str:
        """Upload an image to R2 storage."""
        try:
            client = self._get_client()
            
            extra_args = {
                "ContentType": content_type,
                "CacheControl": "public, max-age=31536000",
            }
            
            if metadata:
                extra_args["Metadata"] = {k: str(v) for k, v in metadata.items()}
            
            client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=image_data,
                **extra_args,
            )
            
            url = f"{self.endpoint_url}/{self.bucket_name}/{key}"
            logger.info(f"Uploaded image to {key}")
            return url
            
        except Exception as e:
            logger.error(f"Failed to upload image: {e}")
            raise
    
    def generate_thumbnail_key(
        self,
        job_id: str,
        variant_id: str,
        extension: str = "png",
    ) -> str:
        """Generate a standardized storage key for thumbnails."""
        date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
        return f"thumbnails/{date_prefix}/{job_id}/{variant_id}.{extension}"


class LocalStorageService:
    """Local filesystem storage service for development/testing."""
    
    def __init__(self, base_path: str = "/tmp/thumbnail-farm"):
        self.base_path = base_path
        os.makedirs(base_path, exist_ok=True)
        logger.info(f"Local storage initialized at {base_path}")
    
    async def upload_image(
        self,
        image_data: bytes,
        key: str,
        content_type: str = "image/png",
        metadata: Optional[dict] = None,
    ) -> str:
        """Upload an image to local storage."""
        file_path = os.path.join(self.base_path, key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        # Save metadata if provided
        if metadata:
            import json
            meta_path = f"{file_path}.meta.json"
            with open(meta_path, "w") as f:
                json.dump(metadata, f)
        
        logger.info(f"Saved image locally to {file_path}")
        return f"file://{file_path}"
    
    def generate_thumbnail_key(
        self,
        job_id: str,
        variant_id: str,
        extension: str = "png",
    ) -> str:
        """Generate a standardized storage key for thumbnails."""
        date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
        return f"thumbnails/{date_prefix}/{job_id}/{variant_id}.{extension}"
