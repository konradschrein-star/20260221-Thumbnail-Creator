import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword, validatePasswordStrength } from '@/lib/password-service';
import { getUserLimiter } from '@/lib/rate-limiter';

const prisma = new PrismaClient();

// POST /api/auth/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 registrations per minute per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const limiter = getUserLimiter(`register:${ip}`, 3, 'minute');
    const remainingTokens = await limiter.removeTokens(1);

    if (remainingTokens < 0) {
      return NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again in 1 minute.',
          retryAfter: 60
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    const body = await request.json();
    const { email, password, name, secret } = body;

    // MANDATORY Registration Secret check for security
    const requiredSecret = process.env.REGISTRATION_SECRET;

    // Fail if no secret is configured (registration disabled)
    if (!requiredSecret) {
      return NextResponse.json(
        { error: 'Registration is currently disabled. Please contact the administrator.' },
        { status: 503 }
      );
    }

    // Validate provided secret matches
    if (secret !== requiredSecret) {
      return NextResponse.json(
        { error: 'Invalid registration secret. Direct registration is disabled.' },
        { status: 403 }
      );
    }

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password with Argon2id
    const hashedPassword = await hashPassword(password);

    // Get default credits from environment
    const defaultCredits = parseInt(process.env.DEFAULT_USER_CREDITS || '0', 10);

    // Create user with Argon2id hash and default credits
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        passwordHashAlgorithm: 'argon2id',
        credits: defaultCredits,
        totalCreditsGranted: defaultCredits,
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
