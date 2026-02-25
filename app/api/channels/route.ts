import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/channels - List all channels
export async function GET() {
  try {
    const channels = await prisma.channel.findMany({
      include: {
        _count: {
          select: { archetypes: true, generationJobs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ channels });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST /api/channels - Create new channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, personaDescription } = body;

    if (!name || !personaDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: name, personaDescription' },
        { status: 400 }
      );
    }

    const channel = await prisma.channel.create({
      data: { name, personaDescription },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create channel' },
      { status: 500 }
    );
  }
}
