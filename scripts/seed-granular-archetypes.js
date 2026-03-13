const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const researchDir = 'research/video_analysis';

async function main() {
  console.log('🌱 Seeding 17 Granular Research Archetypes (JS)...\n');

  // Find or create a default channel
  let channel = await prisma.channel.findFirst();
  if (!channel) {
    console.log('No channel found, creating default "Titan Research" channel...');
    channel = await prisma.channel.create({
      data: {
        name: 'Titan Research',
        personaDescription: 'A professional and clean research persona.',
      },
    });
  }

  // Identify all valid folders
  const items = fs.readdirSync(researchDir);
  const folders = items.filter(f => fs.statSync(path.join(researchDir, f)).isDirectory());

  console.log(`Found ${folders.length} research folders.`);

  for (const folder of folders) {
    const mdPath = path.join(researchDir, folder, 'thumbnail_analysis.md');
    let category = 'Research';
    let instructions = '';

    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf8');
      
      // Extract Category (Software Spotlight, etc.)
      const archMatch = content.match(/## Archetype: (.*)/);
      if (archMatch) category = archMatch[1].trim();

      // Extract specific instructions from the Pros section
      const prosMatch = content.match(/### Pros for UI Generation\n([\s\S]*?)\n###/);
      if (prosMatch) {
        instructions = prosMatch[1]
          .replace(/- /g, '')
          .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
          .trim()
          .split('\n')
          .join(' ');
      }
    }

    // Image path relative to public/
    const imageUrl = `/research/video_analysis/${folder}.jpg`;

    const archetypeData = {
      name: folder,
      category: category,
      layoutInstructions: instructions || 'Follow the visual cues and layout from the reference image.',
      imageUrl: imageUrl,
      isAdminOnly: true,
      channelId: channel.id,
    };

    const existing = await prisma.archetype.findFirst({
      where: { name: folder }
    });

    if (existing) {
      console.log(`- Updating archetype: ${folder}`);
      await prisma.archetype.update({
        where: { id: existing.id },
        data: archetypeData,
      });
    } else {
      console.log(`- Creating archetype: ${folder}`);
      await prisma.archetype.create({
        data: archetypeData,
      });
    }
  }

  // Optional: Clean up the 4 generic archetypes I added earlier if they exist
  const genericNames = ['Software Spotlight', 'Persona Authority', 'High-Contrast Split', 'Narrative Minimalist'];
  for (const name of genericNames) {
    const genericArch = await prisma.archetype.findFirst({ where: { name } });
    if (genericArch) {
      console.log(`- Removing generic template: ${name}`);
      await prisma.archetype.delete({ where: { id: genericArch.id } });
    }
  }

  console.log('\n✅ 17 Granular Research Archetypes seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
