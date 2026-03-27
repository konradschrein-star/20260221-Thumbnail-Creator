import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as CreditService from '@/lib/credit-service';

/**
 * GET /api/user/credits
 *
 * Returns the current user's credit balance.
 *
 * Response:
 * {
 *   "credits": 150
 * }
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const credits = await CreditService.getUserCredits(session.user.id);

    return NextResponse.json({ credits });
  } catch (error: any) {
    console.error('Failed to fetch user credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}
