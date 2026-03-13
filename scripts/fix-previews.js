const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Fixing Archetype Previews...\n');

  const sourceDir = path.join(process.cwd(), 'research', 'video_analysis');
  const targetDir = path.join(process.cwd(), 'public', 'research', 'video_analysis');

  // 1. Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    console.log(`📂 Creating directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 2. Identify all .jpg files in research/video_analysis
  const folders = fs.readdirSync(sourceDir).filter(f => fs.statSync(path.join(sourceDir, f)).isDirectory());
  
  for (const folder of folders) {
    const sourceFilePath = path.join(sourceDir, folder, `${folder}.jpg`);
    const targetFilePath = path.join(targetDir, `${folder}.jpg`);

    if (fs.existsSync(sourceFilePath)) {
      console.log(`📄 Copying image: ${folder}.jpg`);
      fs.copyFileSync(sourceFilePath, targetFilePath);
    }
  }

  // 3. Update paths in DB
  console.log('\n🔄 Updating database paths...');
  const archetypes = await prisma.archetype.findMany({
    where: {
      imageUrl: { startsWith: '/research/' }
    }
  });

  for (const arch of archetypes) {
    // Current: /research/video_analysis/Something.jpg
    // We already use /research/... in the URL, and Next serves from /public.
    // So if file is at public/research/video_analysis/Something.jpg, 
    // the URL /research/video_analysis/Something.jpg should work.
    
    // Let's ensure they are linked to the correct folders.
    // Some URLs might be missing the folder name if they were generated incorrectly.
    
    const correctUrl = `/research/video_analysis/${arch.name}.jpg`;
    
    await prisma.archetype.update({
      where: { id: arch.id },
      data: { imageUrl: correctUrl }
    });
    console.log(`✅ Updated "${arch.name}" -> ${correctUrl}`);
  }

  console.log('\n✨ Preview fix complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
