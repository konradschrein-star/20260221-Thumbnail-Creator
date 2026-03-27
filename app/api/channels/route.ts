import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { EMERGENCY_CHANNELS } from '@/lib/emergency-data';

// GET /api/channels - List all channels (filtered by user, admin sees all)
export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = (session.user as any)?.role || 'USER';
    const isAdmin = userRole === 'ADMIN';

    const channels = await prisma.channel.findMany({
      where: isAdmin ? {} : { userId: session.user.id }, // Admin sees all, users see only their own
      include: {
        _count: {
          select: { archetypes: true, generationJobs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ channels });
  } catch (error: any) {
    console.error('Database error in GET /api/channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels. Please try again.' },
      { status: 500 }
    );
  }
}

// POST /api/channels - Create new channel
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      personaDescription,
      personaAssetPath,
      logoAssetPath,
      primaryColor,
      secondaryColor,
      tags
    } = body;

    if (!name || !personaDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: name, personaDescription' },
        { status: 400 }
      );
    }

    // Input validation and sanitization
    if (typeof name !== 'string' || typeof personaDescription !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input types' },
        { status: 400 }
      );
    }

    // Length limits to prevent abuse
    if (name.trim().length > 200) {
      return NextResponse.json(
        { error: 'Channel name too long (max 200 characters)' },
        { status: 400 }
      );
    }

    if (personaDescription.trim().length > 10000) {
      return NextResponse.json(
        { error: 'Persona description too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    // Basic word count validation (minimum 20 words)
    const wordCount = personaDescription.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 20) {
      return NextResponse.json(
        { error: `Persona description must be at least 20 words (currently ${wordCount} words)` },
        { status: 400 }
      );
    }

    // Validate hex color format
    function isValidHexColor(color: string): boolean {
      return /^#[0-9A-Fa-f]{6}$/.test(color);
    }

    if (primaryColor && !isValidHexColor(primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Use #RRGGBB (e.g., #FF5733).' },
        { status: 400 }
      );
    }

    if (secondaryColor && !isValidHexColor(secondaryColor)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format. Use #RRGGBB (e.g., #00FF00).' },
        { status: 400 }
      );
    }

    // Note: To prevent runtime crashes on Windows due to the Prisma client lock,
    // we are currently only persisting core fields. Branding tokens and assets
    // will be fully functional once the server is restarted and the client 
    // regenerates.
    const channel = await prisma.channel.create({
      data: {
        name,
        personaDescription,
        user: { connect: { id: session.user.id } },
        personaAssetPath,
        logoAssetPath,
        primaryColor: primaryColor || '#ffffff',
        secondaryColor: secondaryColor || '#000000',
        tags: typeof tags === 'string' ? (tags.trim() || null) : (Array.isArray(tags) && tags.length > 0 ? tags.join(',') : null)
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error: any) {
    console.error('Channel creation error:', error);

    // Sanitize Prisma connection errors for the frontend
    if (error.message?.includes('Can\'t reach database server')) {
      return NextResponse.json(
        { error: 'Database connection timeout. Please verify your Vercel Connection Pooler (IPv4) settings.' },
        { status: 503 }
      );
    }

    console.error('[Error] Failed to create channel:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
