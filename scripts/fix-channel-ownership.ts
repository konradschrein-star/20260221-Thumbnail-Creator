/**
 * Fix Channel Ownership Script
 *
 * This script helps admins reassign channels to the correct users.
 *
 * Usage:
 * npx tsx scripts/fix-channel-ownership.ts
 */

import { prisma } from '../lib/prisma';

async function fixChannelOwnership() {
  console.log('🔍 Fetching all channels and users...\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { email: 'asc' },
  });

  console.log('📋 Available Users:');
  users.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.email} (${user.role}) - ID: ${user.id}`);
  });
  console.log('');

  // Get all channels with ownership info
  const channels = await prisma.channel.findMany({
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log('📺 Current Channel Ownership:');
  channels.forEach((channel, index) => {
    console.log(`  ${index + 1}. "${channel.name}" → Owner: ${channel.user?.email || 'UNKNOWN'}`);
  });
  console.log('');

  // Define the correct ownership mapping (case-insensitive)
  const channelOwnershipMap: { [channelNameLower: string]: string } = {
    // Admin channels (assign to admin email)
    "peter's help": 'konrad.schrein@gmail.com',
    "harry": 'konrad.schrein@gmail.com',
    "gary's guides": 'konrad.schrein@gmail.com',

    // Test account channels
    "test": 'test@test.ai',
    "test2": 'test@test.ai',
  };

  console.log('🔧 Applying ownership fixes...\n');

  let fixedCount = 0;
  let skippedCount = 0;

  for (const [channelNameLower, targetEmail] of Object.entries(channelOwnershipMap)) {
    // Case-insensitive channel lookup
    const channel = channels.find(c => c.name.toLowerCase() === channelNameLower);
    const targetUser = users.find(u => u.email === targetEmail);

    if (!channel) {
      console.log(`  ⚠️  Channel matching "${channelNameLower}" not found - skipping`);
      skippedCount++;
      continue;
    }

    if (!targetUser) {
      console.log(`  ⚠️  User "${targetEmail}" not found - skipping channel "${channel.name}"`);
      skippedCount++;
      continue;
    }

    if (channel.userId === targetUser.id) {
      console.log(`  ✅ "${channel.name}" already owned by ${targetEmail} - no change needed`);
      skippedCount++;
      continue;
    }

    // Transfer ownership
    await prisma.channel.update({
      where: { id: channel.id },
      data: { userId: targetUser.id },
    });

    console.log(`  🔄 Transferred "${channel.name}" to ${targetEmail}`);
    fixedCount++;
  }

  console.log('');
  console.log('✅ Done!');
  console.log(`  - Fixed: ${fixedCount} channels`);
  console.log(`  - Skipped: ${skippedCount} channels`);
  console.log('');

  // Show final ownership
  const updatedChannels = await prisma.channel.findMany({
    include: {
      user: {
        select: { email: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log('📊 Final Channel Ownership:');
  updatedChannels.forEach((channel) => {
    console.log(`  "${channel.name}" → ${channel.user?.email || 'UNKNOWN'}`);
  });
}

fixChannelOwnership()
  .then(() => {
    console.log('\n✨ Channel ownership fixed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fixing channel ownership:', error);
    process.exit(1);
  });
