/**
 * Batch Upload Archetype Images to R2
 *
 * This script uploads all archetype images from tmp folder to R2
 * and provides the URLs for updating archetypes in the database.
 */

import fs from 'fs';
import path from 'path';
import { uploadToR2 } from '../lib/r2-service';

const IMAGES_FOLDER = path.join(process.cwd(), 'tmp', 'Images of failing archetypes');

async function batchUpload() {
  try {
    console.log('🚀 Batch Archetype Image Upload\n');
    console.log(`📂 Reading images from: ${IMAGES_FOLDER}\n`);

    // Read all files from the folder
    const files = fs.readdirSync(IMAGES_FOLDER);
    const imageFiles = files.filter(f =>
      f.endsWith('.jpg') ||
      f.endsWith('.jpeg') ||
      f.endsWith('.png') ||
      f.endsWith('.webp')
    );

    if (imageFiles.length === 0) {
      console.log('❌ No image files found in the folder.');
      process.exit(1);
    }

    console.log(`Found ${imageFiles.length} images to upload:\n`);
    imageFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log();

    const uploadedUrls: { filename: string; url: string }[] = [];

    // Upload each image
    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      const filePath = path.join(IMAGES_FOLDER, filename);

      console.log(`📤 [${i + 1}/${imageFiles.length}] Uploading: ${filename}`);

      try {
        // Read file as buffer
        const buffer = fs.readFileSync(filePath);

        // Determine MIME type
        let mimeType = 'image/jpeg';
        if (filename.endsWith('.png')) mimeType = 'image/png';
        else if (filename.endsWith('.webp')) mimeType = 'image/webp';

        // Generate R2 key
        const timestamp = Date.now();
        const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const r2Key = `archetypes/${timestamp}-${sanitizedName}`;

        // Upload to R2
        const url = await uploadToR2(buffer, r2Key, mimeType);

        uploadedUrls.push({ filename, url });
        console.log(`   ✅ Uploaded: ${url}\n`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}\n`);
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Upload Complete!\n');
    console.log(`Successfully uploaded: ${uploadedUrls.length}/${imageFiles.length}\n`);
    console.log('📋 Image URLs (copy these to update your archetypes):\n');

    uploadedUrls.forEach(({ filename, url }, i) => {
      console.log(`${i + 1}. ${filename}`);
      console.log(`   URL: ${url}\n`);
    });

    // Generate SQL update statements for convenience
    console.log('\n💡 Quick SQL Updates (edit archetype IDs as needed):\n');
    uploadedUrls.forEach(({ filename, url }, i) => {
      console.log(`-- ${filename}`);
      console.log(`UPDATE archetypes SET image_url = '${url}' WHERE id = 'REPLACE_WITH_ARCHETYPE_ID';`);
      console.log();
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📝 Next Steps:');
    console.log('1. Copy the URLs above');
    console.log('2. Go to /dashboard and edit each archetype');
    console.log('3. Paste the new image URL or use the file upload');
    console.log('4. Save the archetype\n');

  } catch (error: any) {
    console.error('\n❌ Batch upload failed:', error.message);
    process.exit(1);
  }
}

batchUpload();
