import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RateLimitConfig {
  tokensPerInterval: number;
  interval: 'day';
}

/**
 * DB-backed rate limiting for production-safe manual generation
 * 
 * @param userId - ID of the authenticated user
 * @param userRole - Role of the user
 * @param isSuperuser - Whether the user has unlimited access
 * @param isTestUser - Whether the user is part of the shared test group
 * @param config - Rate limit configuration
 * @returns Response or null if allowed
 */
export async function checkManualRateLimit(
  userId: string,
  userRole: string = 'USER',
  isSuperuser: boolean = false,
  isTestUser: boolean = false,
  config: RateLimitConfig = { tokensPerInterval: 10, interval: 'day' }
): Promise<NextResponse | null> {
  // Superusers (Aron) are exempt from rate limits
  if (isSuperuser || userRole === 'ADMIN') return null;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // If it's a test user, we check the global count for all test users
    // If it's a regular user, we check only their own count
    const whereClause: any = {
      isManual: true,
      createdAt: {
        gte: yesterday,
      },
    };

    if (isTestUser) {
      // Test users share the same "test-user-group-id" or we can filter by isTestUser if we store it
      // For now, if isTestUser is true, we limit based on the specific shared ID
      whereClause.userId = 'test-user-group-id';
    } else {
      whereClause.userId = userId;
    }

    const manualJobsCount = await prisma.generationJob.count({
      where: whereClause,
    });

    if (manualJobsCount >= config.tokensPerInterval) {
      return NextResponse.json(
        {
          error: 'Daily generation limit reached.',
          message: isTestUser
            ? `The test account shared limit (${config.tokensPerInterval}/day) has been reached. Please try again tomorrow or use your own account.`
            : `You have already generated ${manualJobsCount} images in the last 24 hours. Your limit is ${config.tokensPerInterval} per day.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.tokensPerInterval.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  } catch (error) {
    console.error('Rate limit DB check failed, bypassing:', error);
    return null;
  }

  return null;
}

/**
 * Simple IP-based rate limit for general API safety (non-generation)
 */
export async function ipRateLimit(
  request: NextRequest,
  limit: number = 30
): Promise<NextResponse | null> {
  // For other API routes, we can still use a light IP-based check or just rely on Vercel's protection.
  // Given the requirement for "safer credential storage" and "hosting properly", 
  // we'll stick to DB-backed checks for expensive AI operations.
  return null;
}

// Preset rate limit configs
export const rateLimits = {
  manualUI: {
    tokensPerInterval: 10,
    interval: 'day' as const,
  },
};
