const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Auditing Archetype Previews...\n');

  const archetypes = await prisma.archetype.findMany({
    include: {
      channels: {
        include: {
          channel: true
        }
      }
    }
  });

  for (const arch of archetypes) {
    const channelNames = arch.channels.map(c => c.channel.name).join(', ');
    console.log(`Archetype: "${arch.name}"`);
    console.log(`- Image URL: ${arch.imageUrl}`);
    console.log(`- Channels: ${channelNames}`);
    console.log('---');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
