import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

/**
 * Uploads a buffer to Cloudflare R2
 * @param buffer The image buffer to upload
 * @param filename The destination filename
 * @param contentType The MIME type (default image/png)
 * @returns The relative path/ID of the uploaded asset (for proxy use)
 */
export async function uploadToR2(
    buffer: Buffer,
    filename: string,
    contentType: string = 'image/png'
): Promise<string> {
    if (!process.env.R2_BUCKET_NAME) {
        throw new Error('R2_BUCKET_NAME is not configured');
    }

    try {
        await r2Client.send(
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: filename,
                Body: buffer,
                ContentType: contentType,
            })
        );

        // Instead of returning the public R2 URL, we now return a proxied URL
        // This ensures the bucket can stay private.
        return `/api/assets/${filename}`;
    } catch (error) {
        console.error('R2 Upload Error:', error);
        throw new Error(`Failed to upload to R2: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Fetches an object from Cloudflare R2
 * @param key The key of the object to fetch
 */
export async function getObjectFromR2(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    if (!process.env.R2_BUCKET_NAME) {
        throw new Error('R2_BUCKET_NAME is not configured');
    }

    try {
        const response = await r2Client.send(
            new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
            })
        );

        if (!response.Body) {
            throw new Error('Empty response from R2');
        }

        const bytes = await response.Body.transformToByteArray();
        return {
            buffer: Buffer.from(bytes),
            contentType: response.ContentType || 'application/octet-stream',
        };
    } catch (error) {
        console.error('R2 Get Error:', error);
        throw new Error(`Failed to get object from R2: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Deletes an object from Cloudflare R2
 * @param filename The key of the object to delete
 */
export async function deleteFromR2(filename: string): Promise<void> {
    if (!process.env.R2_BUCKET_NAME) {
        throw new Error('R2_BUCKET_NAME is not configured');
    }

    try {
        await r2Client.send(
            new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: filename,
            })
        );
    } catch (error) {
        console.error('R2 Delete Error:', error);
        throw new Error(`Failed to delete from R2: ${error instanceof Error ? error.message : String(error)}`);
    }
}
