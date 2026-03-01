const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const channel = await prisma.channel.create({
            data: {
                name: "Test Direct Node",
                personaDescription: "test desc",
                primaryColor: '#ffffff',
                secondaryColor: '#000000',
                tags: [] // Purposefully triggering exactly what the user saw earlier
            },
        });
        console.log("Success:", channel);
    } catch (e) {
        console.error("PRISMA FAILURE EXACT CAUSE:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
