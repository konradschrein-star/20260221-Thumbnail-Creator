import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/channels/[id] - Fetch single channel
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
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        _count: {
          select: { archetypes: true, generationJobs: true },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (channel.userId !== session.user?.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this channel' },
        { status: 403 }
      );
    }

    return NextResponse.json({ channel });
  } catch (error: any) {
    console.error('[Error] Failed to fetch channel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel' },
      { status: 500 }
    );
  }
}

// PATCH /api/channels/[id] - Update channel
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
    const { name, personaDescription, primaryColor, secondaryColor, tags } = body;

    // Validate hex color format if provided
    function isValidHexColor(color: string): boolean {
      return /^#[0-9A-Fa-f]{6}$/.test(color);
    }

    if (primaryColor !== undefined && primaryColor !== null && !isValidHexColor(primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Use #RRGGBB (e.g., #FF5733).' },
        { status: 400 }
      );
    }

    if (secondaryColor !== undefined && secondaryColor !== null && !isValidHexColor(secondaryColor)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format. Use #RRGGBB (e.g., #00FF00).' },
        { status: 400 }
      );
    }

    // Input validation and sanitization
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          { error: 'Invalid name type' },
          { status: 400 }
        );
      }
      if (name.trim().length > 200) {
        return NextResponse.json(
          { error: 'Channel name too long (max 200 characters)' },
          { status: 400 }
        );
      }
    }

    if (personaDescription !== undefined) {
      if (typeof personaDescription !== 'string') {
        return NextResponse.json(
          { error: 'Invalid persona description type' },
          { status: 400 }
        );
      }
      if (personaDescription.trim().length > 10000) {
        return NextResponse.json(
          { error: 'Persona description too long (max 10,000 characters)' },
          { status: 400 }
        );
      }
      // Minimum 20 words validation
      const wordCount = personaDescription.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 20) {
        return NextResponse.json(
          { error: `Persona description must be at least 20 words (currently ${wordCount} words)` },
          { status: 400 }
        );
      }
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (personaDescription !== undefined) updateData.personaDescription = personaDescription;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (tags !== undefined) updateData.tags = typeof tags === 'string' ? (tags.trim() || null) : (Array.isArray(tags) && tags.length > 0 ? tags.join(',') : null);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Use transaction to prevent race conditions
    const channel = await prisma.$transaction(async (tx) => {
      // Verify ownership atomically
      const existingChannel = await tx.channel.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existingChannel) {
        throw new Error('CHANNEL_NOT_FOUND');
      }

      if (existingChannel.userId !== session.user?.id) {
        throw new Error('FORBIDDEN');
      }

      // Perform update within same transaction
      return await tx.channel.update({
        where: { id },
        data: updateData,
      });
    });

    return NextResponse.json({ channel });
  } catch (error: any) {
    // Handle custom transaction errors
    if (error.message === 'CHANNEL_NOT_FOUND' || error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this channel' },
        { status: 403 }
      );
    }

    // Log detailed error server-side, return generic message to client
    console.error('[Error] Failed to update channel:', error);
    return NextResponse.json(
      { error: 'Failed to update channel' },
      { status: 500 }
    );
  }
}

// DELETE /api/channels/[id] - Delete channel (cascades to archetypes and jobs)
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

    // Use transaction to prevent race conditions
    await prisma.$transaction(async (tx) => {
      // Verify ownership atomically
      const existingChannel = await tx.channel.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!existingChannel) {
        throw new Error('CHANNEL_NOT_FOUND');
      }

      if (existingChannel.userId !== session.user?.id) {
        throw new Error('FORBIDDEN');
      }

      // Perform delete within same transaction
      await tx.channel.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Handle custom transaction errors
    if (error.message === 'CHANNEL_NOT_FOUND' || error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this channel' },
        { status: 403 }
      );
    }

    console.error('[Error] Failed to delete channel:', error);
    return NextResponse.json(
      { error: 'Failed to delete channel' },
      { status: 500 }
    );
  }
}
