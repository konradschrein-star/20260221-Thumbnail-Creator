const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Restoration to 8 Archetypes for "test 2"...\n');

  // 1. Find the target channel and its owner
  const testChannel = await prisma.channel.findFirst({
    where: { name: { contains: 'test 2', mode: 'insensitive' } },
    include: { user: true }
  });

  if (!testChannel) {
    console.error('❌ Error: Channel "test 2" not found.');
    process.exit(1);
  }

  const userId = testChannel.userId;
  console.log(`Target Channel: ${testChannel.name} (${testChannel.id})`);
  console.log(`Owner: ${testChannel.user?.email || 'Unknown'} (${userId})`);

  // 2. Define the 8 archetypes to ensure
  const archetypesToRestore = [
    {
      name: 'Striking Warning Style',
      imageUrl: '/archetypes/archetype2.jpg',
      layoutInstructions: 'Bold warning colors with strong visual impact for attention-grabbing content',
      basePrompt: 'Give the image a striking, attention-grabbing vibe with bold, intense lighting. It should feel urgent and high-energy.',
      isAdminOnly: false
    },
    {
      name: 'Modern Productivity Style',
      imageUrl: '/archetypes/archetype3.jpeg',
      layoutInstructions: 'Clean, modern aesthetic focused on productivity and workspace content',
      basePrompt: 'Maintain a clean, modern, and professional aesthetic. The vibe should be productive, minimalist, and highly polished.',
      isAdminOnly: false
    },
    {
      name: 'Dramatic Bold Style',
      imageUrl: '/archetypes/archetype4.jpeg',
      layoutInstructions: 'Edgy, rebellious design with strong contrast for opinion/controversial content',
      basePrompt: 'Create an edgy, dramatic atmosphere with deep contrast and a slightly rebellious or intense vibe.',
      isAdminOnly: false
    },
    {
      name: 'Educational Friendly Style',
      imageUrl: '/archetypes/archetype5.jpeg',
      layoutInstructions: 'Approachable, beginner-friendly design for step-by-step tutorials',
      basePrompt: 'Keep the atmosphere approachable, friendly, and educational. The tone should feel helpful, clear, and inviting for beginners.',
      isAdminOnly: false
    },
    {
      name: 'Energetic Tech Style',
      imageUrl: '/archetypes/archetype6.jpeg',
      layoutInstructions: 'Dynamic, tech-focused layout with movement and energy for quick tips',
      basePrompt: 'Infuse the image with dynamic movement and energy. It should feel highly focused on technology and fast-paced learning.',
      isAdminOnly: false
    },
    {
      name: 'Comparison Battle Style',
      imageUrl: '/archetypes/archetype7.jpeg',
      layoutInstructions: 'Split-screen comparison design with dramatic versus styling',
      basePrompt: 'Enhance a dramatic split-screen or versus vibe. It should feel highly competitive and comparative.',
      isAdminOnly: false
    },
    {
      name: 'Premium Titan Style',
      imageUrl: '/archetypes/Archetype.png',
      layoutInstructions: 'Highly curated, exclusive premium layout for top-tier content',
      basePrompt: 'Ensure an extremely premium, high-end visual aesthetic. It should look highly curated, flawless, and exclusive.',
      isAdminOnly: true
    },
    {
      name: 'Normal Tutorial Style',
      imageUrl: '/archetypes/archetype5.jpeg',
      layoutInstructions: 'Simple, friendly tutorial layout for beginners (Traditional variant)',
      basePrompt: 'Simple, friendly tutorial style with clear visual cues and an inviting atmosphere.',
      isAdminOnly: false
    }
  ];

  for (const archData of archetypesToRestore) {
    // Upsert the archetype itself
    const archetype = await prisma.archetype.upsert({
      where: { 
        // We use name as a unique-ish identifier for this script's scope
        id: (await prisma.archetype.findFirst({ where: { name: archData.name } }))?.id || 'placeholder'
      },
      update: {
        ...archData,
        userId: userId
      },
      create: {
        ...archData,
        userId: userId
      }
    });

    console.log(`- Ensured archetype: ${archetype.name} (ID: ${archetype.id})`);

    // Link to the channel
    await prisma.channelArchetype.upsert({
      where: {
        channelId_archetypeId: {
          channelId: testChannel.id,
          archetypeId: archetype.id
        }
      },
      update: {},
      create: {
        channelId: testChannel.id,
        archetypeId: archetype.id
      }
    });
    console.log(`  Linked to channel "${testChannel.name}"`);
  }

  console.log('\n✅ Successfully restored and linked 8 archetypes to "test 2"!');
}

main()
  .catch((e) => {
    console.error('❌ Restoration failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
