/**
 * Create New Archetypes from Images
 *
 * This script creates new archetypes using the images in public/archetypes/temp/
 * The user can then manually delete the old corrupted ones.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const TEMP_IMAGES_PATH = path.join(process.cwd(), 'public', 'archetypes', 'temp');

// Default layout instructions for new archetypes
const DEFAULT_LAYOUT = `Create a high-impact YouTube thumbnail with:
- Bold, eye-catching text overlay
- Professional composition and framing
- Clear visual hierarchy
- Vibrant colors that pop
- Face/character centered (if persona is provided)
- Match the reference archetype style exactly`;

async function createArchetypesFromImages() {
  try {
    console.log('🎨 Creating New Archetypes from Images\n');
    console.log(`📂 Reading images from: ${TEMP_IMAGES_PATH}\n`);

    // Check if temp folder exists
    if (!fs.existsSync(TEMP_IMAGES_PATH)) {
      console.error('❌ Error: Temp images folder not found.');
      console.error('   Expected: public/archetypes/temp/');
      console.error('   Please copy images there first.');
      process.exit(1);
    }

    // Read all image files
    const files = fs.readdirSync(TEMP_IMAGES_PATH);
    const imageFiles = files.filter(f =>
      f.endsWith('.jpg') ||
      f.endsWith('.jpeg') ||
      f.endsWith('.png') ||
      f.endsWith('.webp')
    );

    if (imageFiles.length === 0) {
      console.error('❌ No image files found in temp folder.');
      process.exit(1);
    }

    console.log(`Found ${imageFiles.length} images:\n`);

    // Check if any channels exist
    const channels = await prisma.channel.findMany({
      select: { id: true, name: true },
    });

    if (channels.length === 0) {
      console.error('❌ No channels found in database.');
      console.error('   Please create at least one channel first.');
      process.exit(1);
    }

    console.log(`📺 Available channels (${channels.length}):`);
    channels.forEach((c, i) => console.log(`   ${i + 1}. ${c.name} (${c.id})`));
    console.log();

    // Use first channel as default (user can change later via dashboard)
    const defaultChannelId = channels[0].id;
    console.log(`Using default channel: ${channels[0].name}\n`);

    const createdArchetypes: any[] = [];

    // Create archetypes
    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      const imageUrl = `/archetypes/temp/${filename}`;

      // Generate archetype name from filename
      let archetypeName = filename
        .replace(/\.(jpg|jpeg|png|webp)$/i, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Capitalize first letter of each word
      archetypeName = archetypeName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // Truncate if too long
      if (archetypeName.length > 50) {
        archetypeName = archetypeName.substring(0, 47) + '...';
      }

      // Add suffix to avoid duplicates
      archetypeName = `${archetypeName} (New)`;

      console.log(`[${i + 1}/${imageFiles.length}] Creating: ${archetypeName}`);

      try {
        // Create archetype
        const archetype = await prisma.archetype.create({
          data: {
            name: archetypeName,
            imageUrl: imageUrl,
            layoutInstructions: DEFAULT_LAYOUT,
            category: 'General',
            isAdminOnly: false,
            // Don't assign to channel yet - user can do this via dashboard
          },
        });

        createdArchetypes.push({
          id: archetype.id,
          name: archetype.name,
          imageUrl: archetype.imageUrl,
          filename,
        });

        console.log(`   ✅ Created: ${archetype.id}\n`);
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}\n`);
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Archetype Creation Complete!\n');
    console.log(`Successfully created: ${createdArchetypes.length}/${imageFiles.length}\n`);

    if (createdArchetypes.length > 0) {
      console.log('📋 Created Archetypes:\n');
      createdArchetypes.forEach(({ id, name, filename }, i) => {
        console.log(`${i + 1}. ${name}`);
        console.log(`   ID: ${id}`);
        console.log(`   Image: ${filename}\n`);
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📝 Next Steps:\n');
      console.log('1. Go to /dashboard and view the new archetypes');
      console.log('2. For each archetype:');
      console.log('   - Click "Edit"');
      console.log('   - Upload the proper image to R2 (drag & drop)');
      console.log('   - Update layout instructions if needed');
      console.log('   - Assign to channels');
      console.log('   - Save');
      console.log('3. Delete the old corrupted archetypes');
      console.log('4. Clean up temp images: rm -rf public/archetypes/temp\n');
    }

  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createArchetypesFromImages();
