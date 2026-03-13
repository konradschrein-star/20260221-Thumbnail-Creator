const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const channelName = 'test 2';
  const channel = await prisma.channel.findFirst({
    where: { name: { contains: channelName, mode: 'insensitive' } },
    include: {
      archetypes: {
        include: {
          archetype: true
        }
      }
    }
  });

  if (!channel) {
    console.log(`Channel "${channelName}" not found.`);
    return;
  }

  console.log(`\nAUDIT FOR CHANNEL: "${channel.name}" (ID: ${channel.id})`);
  console.log(`Owner ID: ${channel.userId}`);
  console.log(`Current Linked Archetypes (${channel.archetypes.length}):`);
  
  channel.archetypes.forEach((ca, i) => {
    console.log(`${i+1}. ${ca.archetype.name} (ID: ${ca.archetype.id}, Style: ${ca.archetype.styleId})`);
  });

  // Also list all archetypes in DB for comparison
  const allArchetypes = await prisma.archetype.findMany();
  console.log(`\nTOTAL ARCHETYPES IN DATABASE: ${allArchetypes.length}`);
  allArchetypes.forEach((a, i) => {
    // Check if linked to this channel
    const isLinked = channel.archetypes.some(ca => ca.archetypeId === a.id);
    console.log(`- ${a.name} [${isLinked ? 'LINKED' : 'UNLINKED'}]`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
