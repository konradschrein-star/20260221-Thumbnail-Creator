import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword, validatePasswordStrength } from '@/lib/password-service';

const prisma = new PrismaClient();

// POST /api/auth/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, secret } = body;

    // Optional Registration Secret check for security
    const requiredSecret = process.env.REGISTRATION_SECRET;
    if (requiredSecret && secret !== requiredSecret) {
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
