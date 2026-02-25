import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/jobs?channelId=xxx&status=xxx - List generation jobs with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const status = searchParams.get('status');

    // Build where clause based on filters
    const where: any = {};
    if (channelId) where.channelId = channelId;
    if (status) where.status = status;

    const jobs = await prisma.generationJob.findMany({
      where,
      include: {
        channel: {
          select: { id: true, name: true },
        },
        archetype: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
