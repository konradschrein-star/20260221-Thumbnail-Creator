/**
 * Admin API - Fix Channel Ownership
 *
 * POST /api/admin/fix-ownership
 *
 * Automatically fixes channel ownership:
 * - Transfers admin channels to admin account
 * - Ensures test channels stay with test account
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  // Check authentication and admin role
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  const userRole = authResult.user.role || 'USER';

  // Admin-only endpoint
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden. Admin access required.' },
      { status: 403 }
    );
  }

  try {
    const { targetAdminEmail } = await request.json();
    const adminEmail = targetAdminEmail || 'konrad.schrein@gmail.com';

    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, email: true, role: true },
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: `Admin user not found or not an admin: ${adminEmail}` },
        { status: 404 }
      );
    }

    // Get test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@test.ai' },
      select: { id: true, email: true },
    });

    if (!testUser) {
      return NextResponse.json(
        { error: 'Test user (test@test.ai) not found' },
        { status: 404 }
      );
    }

    // Get all channels to see current state
    const allChannels = await prisma.channel.findMany({
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    const results = {
      before: allChannels.map(c => ({ name: c.name, owner: c.user.email })),
      transferred: [] as Array<{ name: string; from: string; to: string }>,
      skipped: [] as Array<{ name: string; reason: string }>,
    };

    // Admin channel names (case-insensitive)
    const adminChannelNames = [
      "peter's help",
      'peters help',
      'harry',
      "gary's guides",
      'garys guides',
    ];

    // Test channel names (case-insensitive)
    const testChannelNames = ['test', 'test2'];

    // Transfer admin channels to admin account
    for (const channel of allChannels) {
      const nameLower = channel.name.toLowerCase();

      if (adminChannelNames.includes(nameLower)) {
        if (channel.userId === adminUser.id) {
          results.skipped.push({
            name: channel.name,
            reason: `Already owned by ${adminUser.email}`,
          });
        } else {
          await prisma.channel.update({
            where: { id: channel.id },
            data: { userId: adminUser.id },
          });

          results.transferred.push({
            name: channel.name,
            from: channel.user.email,
            to: adminUser.email,
          });
        }
      } else if (testChannelNames.includes(nameLower)) {
        if (channel.userId === testUser.id) {
          results.skipped.push({
            name: channel.name,
            reason: `Already owned by ${testUser.email}`,
          });
        } else {
          await prisma.channel.update({
            where: { id: channel.id },
            data: { userId: testUser.id },
          });

          results.transferred.push({
            name: channel.name,
            from: channel.user.email,
            to: testUser.email,
          });
        }
      }
    }

    // Get updated state
    const updatedChannels = await prisma.channel.findMany({
      include: {
        user: {
          select: { email: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    results.after = updatedChannels.map(c => ({ name: c.name, owner: c.user.email }));

    return NextResponse.json({
      success: true,
      message: `Fixed ${results.transferred.length} channel(s)`,
      results,
    });
  } catch (error) {
    console.error('Fix ownership error:', error);
    return NextResponse.json(
      { error: 'Failed to fix channel ownership', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
