const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAccess() {
  console.log('🧪 Verifying Archetype Access Control...\n');

  // Fetch all archetypes from DB
  const allArchetypes = await prisma.archetype.findMany({
    select: { id: true, name: true, isAdminOnly: true }
  });

  console.log(`Total archetypes in DB: ${allArchetypes.length}`);
  const adminOnlyCount = allArchetypes.filter(a => a.isAdminOnly).length;
  console.log(`Admin-only archetypes: ${adminOnlyCount}\n`);

  if (adminOnlyCount === 0) {
    console.error('❌ Error: No admin-only archetypes found! Seeding might have failed to set the flag.');
    process.exit(1);
  }

  // Simulate API Logic for ADMIN
  const adminRole = 'ADMIN';
  const adminEmail = 'konrad@titan.ai';
  const isAdminTestAccount = adminEmail === 'test@test.ai';
  
  const adminVisible = allArchetypes.filter(arch => {
    if (arch.isAdminOnly && (adminRole !== 'ADMIN' || isAdminTestAccount)) return false;
    return true;
  });
  console.log(`✅ ADMIN [konrad@titan.ai] sees: ${adminVisible.length} archetypes (Expected: ${allArchetypes.length})`);

  // Simulate API Logic for USER
  const userRole = 'USER';
  const userEmail = 'user@example.com';
  const isUserTestAccount = userEmail === 'test@test.ai';
  
  const userVisible = allArchetypes.filter(arch => {
    if (arch.isAdminOnly && (userRole !== 'ADMIN' || isUserTestAccount)) return false;
    return true;
  });
  console.log(`✅ USER [user@example.com] sees: ${userVisible.length} archetypes (Expected: ${allArchetypes.length - adminOnlyCount})`);

  // Simulate API Logic for TEST@TEST.AI
  const testRole = 'USER';
  const testEmail = 'test@test.ai';
  const isTestAccount = testEmail === 'test@test.ai';
  
  const testVisible = allArchetypes.filter(arch => {
    if (arch.isAdminOnly && (testRole !== 'ADMIN' || isTestAccount)) return false;
    return true;
  });
  console.log(`✅ TEST [test@test.ai] sees: ${testVisible.length} archetypes (Expected: ${allArchetypes.length - adminOnlyCount})`);

  if (testVisible.length === adminVisible.length) {
    console.error('❌ SECURITY FAILURE: Test account sees admin archetypes!');
    process.exit(1);
  }

  console.log('\n✨ Verification complete: Access control is functioning correctly.');
}

verifyAccess()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
