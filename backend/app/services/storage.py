"""
================================================================================
Storage Service - Cloudflare R2 Integration
================================================================================
Handles all object storage operations using boto3 for Cloudflare R2 compatibility.

Features:
- S3-compatible API via boto3
- Automatic presigned URL generation
- Multi-part upload support for large files
- CDN-friendly cache headers
================================================================================
"""

import logging
import os
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional
from urllib.parse import urlparse

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class StorageService:
    """
    Cloudflare R2 storage service using S3-compatible API.
    
    Provides upload, download, and presigned URL generation for
    generated thumbnails and reference images.
    """
    
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
        
        self._client: Optional[boto3.client] = None
        self._resource: Optional[boto3.resource] = None
    
    def _get_client(self) -> boto3.client:
        """Get or create boto3 S3 client."""
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
    
    def _get_resource(self) -> boto3.resource:
        """Get or create boto3 S3 resource."""
        if self._resource is None:
            if not all([self.endpoint_url, self.access_key_id, self.secret_access_key]):
                raise ValueError("R2 credentials not configured")
            
            self._resource = boto3.resource(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name=self.region,
            )
        return self._resource
    
    async def upload_image(
        self,
        image_data: bytes,
        key: str,
        content_type: str = "image/png",
        metadata: Optional[dict] = None,
    ) -> str:
        """
        Upload an image to R2 storage.
        
        Args:
            image_data: Raw image bytes
            key: Storage key/path
            content_type: MIME type of the image
            metadata: Optional metadata to attach
            
        Returns:
            Public URL of the uploaded image
        """
        try:
            client = self._get_client()
            
            extra_args = {
                "ContentType": content_type,
                "CacheControl": "public, max-age=31536000",  # 1 year cache
            }
            
            if metadata:
                extra_args["Metadata"] = {
                    k: str(v) for k, v in metadata.items()
                }
            
            client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=image_data,
                **extra_args,
            )
            
            # Generate public URL
            url = f"{self.endpoint_url}/{self.bucket_name}/{key}"
            logger.info(f"Uploaded image to {key}")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to upload image: {e}")
            raise
    
    async def upload_from_buffer(
        self,
        buffer: BytesIO,
        key: str,
        content_type: str = "image/png",
    ) -> str:
        """
        Upload from a BytesIO buffer.
        
        Args:
            buffer: BytesIO containing image data
            key: Storage key/path
            content_type: MIME type
            
        Returns:
            Public URL of the uploaded image
        """
        buffer.seek(0)
        return await self.upload_image(buffer.read(), key, content_type)
    
    async def download_image(self, key: str) -> bytes:
        """
        Download an image from R2 storage.
        
        Args:
            key: Storage key/path
            
        Returns:
            Raw image bytes
        """
        try:
            client = self._get_client()
            response = client.get_object(Bucket=self.bucket_name, Key=key)
            return response["Body"].read()
        except ClientError as e:
            logger.error(f"Failed to download image {key}: {e}")
            raise
    
    async def delete_image(self, key: str) -> bool:
        """
        Delete an image from R2 storage.
        
        Args:
            key: Storage key/path
            
        Returns:
            True if deleted, False if not found
        """
        try:
            client = self._get_client()
            client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"Deleted image {key}")
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                return False
            logger.error(f"Failed to delete image {key}: {e}")
            raise
    
    def generate_presigned_url(
        self,
        key: str,
        expiration: int = 3600,
        operation: str = "get_object",
    ) -> str:
        """
        Generate a presigned URL for temporary access.
        
        Args:
            key: Storage key/path
            expiration: URL expiration time in seconds (default 1 hour)
            operation: S3 operation (get_object, put_object, etc.)
            
        Returns:
            Presigned URL string
        """
        try:
            client = self._get_client()
            url = client.generate_presigned_url(
                operation,
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expiration,
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise
    
    def generate_thumbnail_key(
        self,
        job_id: str,
        variant_id: str,
        extension: str = "png",
    ) -> str:
        """
        Generate a standardized storage key for thumbnails.
        
        Args:
            job_id: Job identifier
            variant_id: Variant identifier
            extension: File extension
            
        Returns:
            Formatted storage key
        """
        date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
        return f"thumbnails/{date_prefix}/{job_id}/{variant_id}.{extension}"
    
    async def image_exists(self, key: str) -> bool:
        """
        Check if an image exists in storage.
        
        Args:
            key: Storage key/path
            
        Returns:
            True if exists, False otherwise
        """
        try:
            client = self._get_client()
            client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise
    
    async def list_objects(
        self,
        prefix: str = "",
        max_keys: int = 1000,
    ) -> list[dict]:
        """
        List objects in the bucket with optional prefix.
        
        Args:
            prefix: Key prefix filter
            max_keys: Maximum number of keys to return
            
        Returns:
            List of object metadata dictionaries
        """
        try:
            client = self._get_client()
            response = client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys,
            )
            
            contents = response.get("Contents", [])
            return [
                {
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"],
                    "etag": obj["ETag"],
                }
                for obj in contents
            ]
        except ClientError as e:
            logger.error(f"Failed to list objects: {e}")
            raise
    
    async def copy_object(self, source_key: str, dest_key: str) -> str:
        """
        Copy an object within the bucket.
        
        Args:
            source_key: Source object key
            dest_key: Destination object key
            
        Returns:
            URL of the copied object
        """
        try:
            client = self._get_client()
            copy_source = {"Bucket": self.bucket_name, "Key": source_key}
            
            client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=dest_key,
            )
            
            url = f"{self.endpoint_url}/{self.bucket_name}/{dest_key}"
            logger.info(f"Copied {source_key} to {dest_key}")
            return url
        except ClientError as e:
            logger.error(f"Failed to copy object: {e}")
            raise
    
    async def get_object_metadata(self, key: str) -> Optional[dict]:
        """
        Get metadata for an object without downloading.
        
        Args:
            key: Storage key/path
            
        Returns:
            Object metadata dictionary or None if not found
        """
        try:
            client = self._get_client()
            response = client.head_object(Bucket=self.bucket_name, Key=key)
            return {
                "content_type": response.get("ContentType"),
                "content_length": response.get("ContentLength"),
                "last_modified": response.get("LastModified"),
                "etag": response.get("ETag"),
                "metadata": response.get("Metadata", {}),
            }
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return None
            raise


class LocalStorageService:
    """
    Local filesystem storage service for development/testing.
    
    Mirrors the StorageService API but stores files locally.
    """
    
    def __init__(self, base_path: str = "/tmp/thumbnail-farm"):
        self.base_path = base_path
        os.makedirs(base_path, exist_ok=True)
    
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
    
    async def download_image(self, key: str) -> bytes:
        """Download an image from local storage."""
        file_path = os.path.join(self.base_path, key)
        with open(file_path, "rb") as f:
            return f.read()
    
    async def delete_image(self, key: str) -> bool:
        """Delete an image from local storage."""
        file_path = os.path.join(self.base_path, key)
        if os.path.exists(file_path):
            os.remove(file_path)
            meta_path = f"{file_path}.meta.json"
            if os.path.exists(meta_path):
                os.remove(meta_path)
            return True
        return False
    
    def generate_thumbnail_key(
        self,
        job_id: str,
        variant_id: str,
        extension: str = "png",
    ) -> str:
        """Generate a standardized storage key for thumbnails."""
        date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
        return f"thumbnails/{date_prefix}/{job_id}/{variant_id}.{extension}"
