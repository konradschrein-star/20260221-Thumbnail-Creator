/**
 * Generate SQL for Creating Archetypes
 *
 * This script generates SQL INSERT statements for creating archetypes
 * from the images in public/archetypes/temp/
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const TEMP_IMAGES_PATH = path.join(process.cwd(), 'public', 'archetypes', 'temp');

const DEFAULT_LAYOUT = `Create a high-impact YouTube thumbnail with:
- Bold, eye-catching text overlay
- Professional composition and framing
- Clear visual hierarchy
- Vibrant colors that pop
- Face/character centered (if persona is provided)
- Match the reference archetype style exactly`;

function generateArchetypeSQL() {
  console.log('🎨 Generating Archetype SQL Statements\n');
  console.log(`📂 Reading images from: ${TEMP_IMAGES_PATH}\n`);

  // Check if temp folder exists
  if (!fs.existsSync(TEMP_IMAGES_PATH)) {
    console.error('❌ Error: Temp images folder not found.');
    console.error('   Expected: public/archetypes/temp/');
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

  console.log(`Found ${imageFiles.length} images\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 SQL INSERT Statements (copy and run in Supabase SQL Editor):\n');
  console.log('-- Note: Replace /archetypes/temp/ URLs with actual R2 URLs after uploading\n');

  const sqlStatements: string[] = [];

  imageFiles.forEach((filename, i) => {
    const imageUrl = `/archetypes/temp/${filename}`;
    const id = `cm${randomUUID().replace(/-/g, '').substring(0, 22)}`; // CUID-like ID

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

    // Add suffix
    archetypeName = `${archetypeName} (New)`;

    const sql = `-- ${i + 1}. ${filename}
INSERT INTO archetypes (id, name, image_url, layout_instructions, category, is_admin_only, created_at, updated_at)
VALUES (
  '${id}',
  '${archetypeName.replace(/'/g, "''")}',
  '${imageUrl}',
  '${DEFAULT_LAYOUT.replace(/'/g, "''")}',
  'General',
  false,
  NOW(),
  NOW()
);`;

    sqlStatements.push(sql);
    console.log(sql);
    console.log();
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Generated ${sqlStatements.length} SQL statements\n`);
  console.log('📝 To use these:\n');
  console.log('1. Copy the SQL statements above');
  console.log('2. Go to Supabase Dashboard → SQL Editor');
  console.log('3. Paste and run the SQL');
  console.log('4. Go to /dashboard to see the new archetypes');
  console.log('5. Edit each archetype to upload proper images to R2');
  console.log('6. Delete old corrupted archetypes\n');

  // Save to file for convenience
  const outputFile = path.join(process.cwd(), 'scripts', 'archetypes-insert.sql');
  fs.writeFileSync(outputFile, sqlStatements.join('\n\n'));
  console.log(`💾 SQL saved to: ${outputFile}\n`);
}

generateArchetypeSQL();
