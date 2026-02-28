const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const email = 'dualaryan@gmail.com';
    console.log(`Checking user: ${email}`);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        console.log('User found!');
        console.log('ID:', user.id);
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Password Hash:', user.password);
        console.log('Password Hash Length:', user.password?.length);
    } else {
        console.log('User NOT found.');
    }
    process.exit(0);
}
check();
