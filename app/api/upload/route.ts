import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { auth } from '@/lib/auth';
import * as r2Service from '@/lib/r2-service';
import { fileTypeFromBuffer } from 'file-type';

// POST /api/upload - Handle file uploads directly to R2
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'archetypes';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WEBP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename using UUID to prevent enumeration attacks
    const uuid = randomUUID();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${uuid}-${originalName}`;
    const r2Key = `${folder}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Server-side MIME type validation using magic numbers
    const detectedType = await fileTypeFromBuffer(buffer);
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!detectedType || !allowedMimes.includes(detectedType.mime)) {
      return NextResponse.json(
        { error: 'Invalid file type. File content must be a valid JPG, PNG, or WEBP image.' },
        { status: 400 }
      );
    }

    // Polyglot file detection: Verify image structural integrity with sharp
    // This prevents malicious files with valid image headers but embedded payloads
    try {
      const metadata = await sharp(buffer).metadata();

      // Validate image has valid dimensions
      if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
        return NextResponse.json(
          { error: 'Invalid image structure. Image must have valid dimensions.' },
          { status: 400 }
        );
      }

      // Validate reasonable dimensions (prevent zip bombs / excessive memory usage)
      const maxDimension = 10000; // 10k pixels max
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        return NextResponse.json(
          { error: `Image too large. Maximum dimension is ${maxDimension}px.` },
          { status: 400 }
        );
      }

      // Validate format matches detected MIME type
      const formatMap: Record<string, string[]> = {
        'image/jpeg': ['jpeg', 'jpg'],
        'image/png': ['png'],
        'image/webp': ['webp'],
      };

      const expectedFormats = formatMap[detectedType.mime] || [];
      if (metadata.format && !expectedFormats.includes(metadata.format)) {
        return NextResponse.json(
          { error: 'Image format mismatch. File may be corrupted or malicious.' },
          { status: 400 }
        );
      }
    } catch (sharpError: any) {
      console.error('Sharp validation error:', sharpError.message);
      return NextResponse.json(
        { error: 'Corrupted or invalid image file. Unable to process image structure.' },
        { status: 400 }
      );
    }

    // Upload to R2 (Mandatory) - use detected MIME type, not client-provided
    const url = await r2Service.uploadToR2(buffer, r2Key, detectedType.mime);

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    // Check if the stream or parsing failed due to unexpected multi-part data
    if (error instanceof TypeError && error.message.includes('stream')) {
      return NextResponse.json(
        { error: 'Invalid or corrupt file upload stream.' },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred during upload';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
