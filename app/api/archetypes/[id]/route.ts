import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/archetypes/[id] - Fetch single archetype
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user is admin
    const userRole = (session.user as any)?.role || 'USER';
    const isAdmin = userRole === 'ADMIN';

    const archetype = await prisma.archetype.findUnique({
      where: { id },
      include: {
        channels: {
          include: {
            channel: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!archetype) {
      return NextResponse.json(
        { error: 'Archetype not found' },
        { status: 404 }
      );
    }

    // Check ownership (admin can view all)
    if (!isAdmin && archetype.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view this archetype' },
        { status: 403 }
      );
    }

    return NextResponse.json({ archetype });
  } catch (error: any) {
    console.error('[Error] Failed to fetch archetype:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archetype' },
      { status: 500 }
    );
  }
}

// PATCH /api/archetypes/[id] - Update archetype
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, imageUrl, layoutInstructions, basePrompt, channelIds } = body;

    // Check if user is admin
    const userRole = (session.user as any)?.role || 'USER';
    const isAdmin = userRole === 'ADMIN';

    // Build update data object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (layoutInstructions !== undefined) updateData.layoutInstructions = layoutInstructions;
    if (basePrompt !== undefined) updateData.basePrompt = basePrompt;

    if (Object.keys(updateData).length === 0 && channelIds === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Use transaction to prevent race conditions
    const archetype = await prisma.$transaction(async (tx) => {
      // Verify ownership atomically
      const existingArchetype = await tx.archetype.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existingArchetype) {
        throw new Error('ARCHETYPE_NOT_FOUND');
      }

      // Check ownership (admin can edit all)
      if (!isAdmin && existingArchetype.userId !== session.user.id) {
        throw new Error('FORBIDDEN');
      }

      // If updating channels, validate ownership and update junction table
      if (channelIds !== undefined) {
        const channelIdsArray = Array.isArray(channelIds) ? channelIds : [];

        if (channelIdsArray.length > 0 && !isAdmin) {
          const channels = await tx.channel.findMany({
            where: { id: { in: channelIdsArray } },
            select: { id: true, userId: true },
          });

          const invalidChannels = channels.filter(ch => ch.userId !== session.user!.id);
          if (invalidChannels.length > 0) {
            throw new Error('CHANNEL_OWNERSHIP_INVALID');
          }
        }

        // Delete existing channel assignments and create new ones
        await tx.channelArchetype.deleteMany({
          where: { archetypeId: id },
        });

        if (channelIdsArray.length > 0) {
          await tx.channelArchetype.createMany({
            data: channelIdsArray.map(channelId => ({
              archetypeId: id,
              channelId,
            })),
          });
        }
      }

      // Perform update within same transaction
      return await tx.archetype.update({
        where: { id },
        data: updateData,
        include: {
          channels: {
            include: {
              channel: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ archetype });
  } catch (error: any) {
    // Handle custom transaction errors
    if (error.message === 'ARCHETYPE_NOT_FOUND' || error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Archetype not found' },
        { status: 404 }
      );
    }

    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to edit this archetype' },
        { status: 403 }
      );
    }

    if (error.message === 'CHANNEL_OWNERSHIP_INVALID') {
      return NextResponse.json(
        { error: 'You do not own all the selected channels' },
        { status: 403 }
      );
    }

    console.error('[Error] Failed to update archetype:', error);
    return NextResponse.json(
      { error: 'Failed to update archetype' },
      { status: 500 }
    );
  }
}

// DELETE /api/archetypes/[id] - Delete archetype
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user is admin
    const userRole = (session.user as any)?.role || 'USER';
    const isAdmin = userRole === 'ADMIN';

    // Use transaction to prevent race conditions
    await prisma.$transaction(async (tx) => {
      // Verify ownership atomically
      const existingArchetype = await tx.archetype.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existingArchetype) {
        throw new Error('ARCHETYPE_NOT_FOUND');
      }

      // Check ownership (admin can delete all)
      if (!isAdmin && existingArchetype.userId !== session.user.id) {
        throw new Error('FORBIDDEN');
      }

      // Perform delete within same transaction
      await tx.archetype.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Handle custom transaction errors
    if (error.message === 'ARCHETYPE_NOT_FOUND' || error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Archetype not found' },
        { status: 404 }
      );
    }

    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete this archetype' },
        { status: 403 }
      );
    }

    console.error('[Error] Failed to delete archetype:', error);
    return NextResponse.json(
      { error: 'Failed to delete archetype' },
      { status: 500 }
    );
  }
}
