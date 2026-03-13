const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️ Global deletion of specified archetypes...\n');

  const namesToDelete = [
    'Energetic Tech Style',
    'Educational Friendly Style'
  ];

  for (const name of namesToDelete) {
    const arch = await prisma.archetype.findFirst({ where: { name } });
    if (arch) {
      console.log(`Found "${name}" (ID: ${arch.id}). Deleting...`);
      
      // Delete from junction table first if cascade is not set (Prisma usually handles this if relation is configured)
      // But let's be safe.
      await prisma.channelArchetype.deleteMany({
        where: { archetypeId: arch.id }
      });
      
      await prisma.archetype.delete({
        where: { id: arch.id }
      });
      console.log(`- Deleted "${name}" from database.`);
    } else {
      console.log(`- Archetype "${name}" not found in database.`);
    }
  }

  console.log('\n✅ Global deletion complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
