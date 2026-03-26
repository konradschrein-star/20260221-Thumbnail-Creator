/**
 * Admin API - Grant Credits
 *
 * POST /api/admin/credits/grant - Grant credits to a user
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "amount": 100,
 *   "reason": "Monthly subscription"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getApiAuth } from '@/lib/api-auth';
import * as CreditService from '@/lib/credit-service';

export async function POST(request: NextRequest) {
  // Check authentication and admin role
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    );
  }

  const adminUserId = authResult.user.id;
  const userRole = authResult.user.role || 'USER';

  // Admin-only endpoint
  if (userRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden. Admin access required.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, amount, reason } = body;

    // Validation
    if (!email || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: email, amount, reason' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: 'Amount too large. Maximum 10,000 credits per grant.' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${email}` },
        { status: 404 }
      );
    }

    // Grant credits using the credit service
    const newBalance = await CreditService.grantCredits(
      user.id,
      amount,
      adminUserId,
      reason
    );

    console.log(
      `Admin ${adminUserId} granted ${amount} credits to ${user.email}. New balance: ${newBalance}`
    );

    return NextResponse.json({
      success: true,
      message: `Granted ${amount} credits to ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        previousBalance: user.credits,
        newBalance,
        creditsGranted: amount,
      },
    });
  } catch (error) {
    console.error('Grant credits API error:', error);

    if (error instanceof CreditService.CreditServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to grant credits' },
      { status: 500 }
    );
  }
}
