const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Refining archetypes for "test 2" channel...\n');

  const channel = await prisma.channel.findFirst({
    where: { name: { contains: 'test 2', mode: 'insensitive' } }
  });

  if (!channel) {
    console.error('❌ Channel "test 2" not found.');
    return;
  }

  const toRemove = [
    'Energetic Tech Style',
    'Educational Friendly Style'
  ];

  for (const name of toRemove) {
    const arch = await prisma.archetype.findFirst({ where: { name } });
    if (arch) {
      await prisma.channelArchetype.deleteMany({
        where: {
          channelId: channel.id,
          archetypeId: arch.id
        }
      });
      console.log(`- Removed link for "${name}"`);
    }
  }

  // Ensure "Mobile Tutorial Person 1" is linked (if it exists or needs renaming)
  // According to the screenshot, it's already there
  
  console.log('\n✅ Refinement complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
