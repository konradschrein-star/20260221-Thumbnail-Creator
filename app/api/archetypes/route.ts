import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/archetypes?channelId=xxx - List archetypes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    const where = channelId ? { channelId } : {};

    const archetypes = await prisma.archetype.findMany({
      where,
      include: {
        channel: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ archetypes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch archetypes' },
      { status: 500 }
    );
  }
}

// POST /api/archetypes - Create new archetype
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, channelId, imageUrl, layoutInstructions } = body;

    if (!name || !channelId || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, channelId, imageUrl' },
        { status: 400 }
      );
    }

    const archetype = await prisma.archetype.create({
      data: {
        name,
        channelId,
        imageUrl,
        layoutInstructions: layoutInstructions || '',
      },
    });

    return NextResponse.json({ archetype }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create archetype' },
      { status: 500 }
    );
  }
}
