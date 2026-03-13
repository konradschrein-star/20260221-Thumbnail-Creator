const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Comprehensive Archetype Image Audit...\n');

  const archetypes = await prisma.archetype.findMany();

  for (const arch of archetypes) {
    if (!arch.imageUrl) {
      console.log(`❌ Archetype: "${arch.name}" - NO IMAGE URL`);
      continue;
    }

    // Convert URL path to local filesystem path
    // URL: /archetypes/filename.jpg -> Path: public/archetypes/filename.jpg
    const relativePath = arch.imageUrl.startsWith('/') ? arch.imageUrl.slice(1) : arch.imageUrl;
    const fullPath = path.join(process.cwd(), 'public', relativePath.replace('archetypes/', ''));
    
    // Also check the literal path just in case
    const literalPath = path.join(process.cwd(), 'public', relativePath);

    const existsOriginal = fs.existsSync(literalPath);
    const existsFlat = fs.existsSync(fullPath);

    if (existsOriginal || existsFlat) {
      console.log(`✅ Archetype: "${arch.name}"`);
      console.log(`  - URL: ${arch.imageUrl}`);
      console.log(`  - Found at: ${existsOriginal ? literalPath : fullPath}`);
    } else {
      console.log(`❌ Archetype: "${arch.name}" - FILE NOT FOUND`);
      console.log(`  - URL: ${arch.imageUrl}`);
      console.log(`  - Checked path: ${literalPath}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
