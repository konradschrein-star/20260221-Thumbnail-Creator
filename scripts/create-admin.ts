import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password-service';

const prisma = new PrismaClient();

/**
 * Create or update admin user
 * Email: konrad.schrein@gmail.com
 * Password: testva1234
 * Replaces: dualaryan@gmail.com
 */
async function createAdmin() {
  try {
    console.log('🔧 Setting up admin account...\n');

    const email = 'konrad.schrein@gmail.com';
    const password = 'testva1234';
    const name = 'Admin';

    // Hash password with Argon2id
    console.log('🔐 Hashing password with Argon2id...');
    const hashedPassword = await hashPassword(password);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update existing user
      console.log('📝 Updating existing user...');
      const user = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          passwordHashAlgorithm: 'argon2id',
          role: 'ADMIN',
          name,
        },
      });

      console.log('\n✅ Admin user updated successfully!');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Credits: ${user.credits}`);
    } else {
      // Create new user
      console.log('💾 Creating new admin user...');
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          passwordHashAlgorithm: 'argon2id',
          name,
          role: 'ADMIN',
          credits: 0, // Admins have unlimited access, credits don't matter
        },
      });

      console.log('\n✅ Admin user created successfully!');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    }

    // Also remove old dualaryan@gmail.com account if it exists
    const oldAdmin = await prisma.user.findUnique({
      where: { email: 'dualaryan@gmail.com' },
    });

    if (oldAdmin) {
      console.log('\n🗑️  Removing old admin account (dualaryan@gmail.com)...');
      await prisma.user.delete({
        where: { email: 'dualaryan@gmail.com' },
      });
      console.log('✅ Old admin account removed');
    }

    console.log('\n🚀 You can now sign in with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🔗 Admin panel: /admin\n');
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
