import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as payloadEngine from '@/lib/payload-engine';
import * as generationService from '@/lib/generation-service';
import * as r2Service from '@/lib/r2-service';
import { getApiAuth } from '@/lib/api-auth';
import { EMERGENCY_CHANNELS, EMERGENCY_ARCHETYPES } from '@/lib/emergency-data';
import * as CreditService from '@/lib/credit-service';

export async function POST(request: NextRequest) {
  const authResult = await getApiAuth(request);

  if (authResult.error || !authResult.user?.id) {
    return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: authResult.status || 401 });
  }

  const userId = authResult.user.id;
  const userEmail = authResult.user.email || 'test@titan.ai';
  const userRole = authResult.user.role || 'USER';
  const isSuperuser = authResult.user.isSuperuser || false;
  const isTestUser = authResult.user.isTestUser || false;

  try {
    const body = await request.json();
    const {
      channelId,
      archetypeId,
      videoTopic,
      thumbnailText,
      customPrompt,
      versionCount = 1,
      includeBrandColors = true,
      includePersona = true
    } = body;

    // Strict validation
    if (!channelId || !archetypeId || !videoTopic || !thumbnailText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (videoTopic.length > 200 || thumbnailText.length > 100) {
      return NextResponse.json(
        { error: 'Input text too long. Max 200 for topic, 100 for thumbnail text.' },
        { status: 400 }
      );
    }

    const rawCount = parseInt(String(versionCount), 10);
    const count = Math.min(Math.max(isNaN(rawCount) ? 1 : rawCount, 1), 4);
    const results = [];

    // Credit system: Non-admins must have sufficient credits
    let creditsRemaining: number | null = null;
    let shouldDeductCredits = userRole !== 'ADMIN';

    if (shouldDeductCredits) {
      try {
        const userCredits = await CreditService.getUserCredits(userId);
        if (userCredits < count) {
          return NextResponse.json(
            {
              error: 'Insufficient credits',
              creditsRequired: count,
              creditsAvailable: userCredits,
              message: 'You need more credits to generate thumbnails. Please contact an admin to purchase credits.'
            },
            { status: 402 }
          );
        }
      } catch (error) {
        console.error('Credit check failed:', error);
        return NextResponse.json(
          { error: 'Failed to check credit balance' },
          { status: 500 }
        );
      }
    }

    // Fetch channel and archetype
    let channel, archetype;
    try {
      channel = await prisma.channel.findUnique({ where: { id: channelId } });
      archetype = await prisma.archetype.findUnique({ where: { id: archetypeId } });
    } catch (dbError) {
      console.error('DB lookup failed in generate:', dbError);
      return NextResponse.json(
        { error: 'Database error. Please try again or contact support if the issue persists.' },
        { status: 500 }
      );
    }

    // Validate that channel and archetype exist (no silent fallbacks)
    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found. Please select a valid channel.' },
        { status: 404 }
      );
    }

    if (!archetype) {
      return NextResponse.json(
        { error: 'Archetype not found. Please select a valid archetype.' },
        { status: 404 }
      );
    }

    // FINAL GUARD: Enforce Admin-Only archetypes at the generation layer
    // This prevents direct API manipulation by non-admins or the test account
    if (archetype.isAdminOnly && (userRole !== 'ADMIN' || isTestUser)) {
      return NextResponse.json({ error: 'Unauthorized archetype usage. This style is restricted to administrators.' }, { status: 403 });
    }

    // Deduct credits upfront for non-admins (atomic operation)
    let creditsDeducted = 0;
    const jobIds: string[] = [];

    if (shouldDeductCredits) {
      try {
        // Deduct credits BEFORE generating
        const balanceBefore = await CreditService.getUserCredits(userId);
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              credits: { decrement: count },
              totalCreditsConsumed: { increment: count }
            }
          });

          // Log transaction
          await tx.creditTransaction.create({
            data: {
              userId,
              transactionType: 'deduct',
              amount: -count,
              balanceBefore,
              balanceAfter: balanceBefore - count,
              reason: `Deducted ${count} credits for ${count} thumbnail generation(s): ${videoTopic}`
            }
          });
        });

        creditsDeducted = count;
        creditsRemaining = balanceBefore - count;
      } catch (error) {
        console.error('Credit deduction failed:', error);
        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        );
      }
    }

    // Build base payload using the engine's data-driven approach
    // If the user modified the draft in the UI, we just use that directly!
    const fullUserPrompt = customPrompt || payloadEngine.buildFullPrompt(channel as any, archetype as any, { videoTopic, thumbnailText }, includeBrandColors, includePersona);

    const payload: payloadEngine.AIRequestPayload = {
      systemPrompt: "You are an expert AI image generator fine-tuned for high-CTR YouTube thumbnails.",
      userPrompt: fullUserPrompt,
      base64Images: {
        archetype: await payloadEngine.encodeImageToBase64(archetype.imageUrl),
        persona: (includePersona && (channel as any).personaAssetPath)
          ? await payloadEngine.encodeImageToBase64((channel as any).personaAssetPath)
          : undefined,
      },
    };

    // Track successful and failed generations for refund calculation
    let successfulGenerations = 0;
    let failedGenerations = 0;

    for (let i = 0; i < count; i++) {
      // Create initial job record
      let job;
      const mockId = `mock_${Date.now()}_${i}`;
      try {
        job = await prisma.generationJob.create({
          data: {
            channelId,
            archetypeId,
            userId,
            videoTopic,
            thumbnailText,
            customPrompt,
            isManual: true,
            status: 'processing',
            creditsDeducted: shouldDeductCredits ? 1 : null // Track credit usage per job
          },
        } as any);
        jobIds.push(job.id);
      } catch (dbError) {
        console.error('DB job creation failed, using mock ID:', dbError);
        job = { id: mockId, status: 'processing' };
      }

      try {
        const { buffer: imageBuffer, fallbackUsed, fallbackMessage } = await generationService.callNanoBanana(payload, process.env.GOOGLE_API_KEY!);

        // Upload to R2 (Mandatory for Vercel)
        const filename = `gen_${job.id}.png`;
        const outputUrl = await r2Service.uploadToR2(imageBuffer, filename, 'image/png', userEmail);

        // Retry logic for job status update
        let updatedJob = null;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries && !updatedJob) {
          try {
            updatedJob = await prisma.generationJob.update({
              where: { id: job.id },
              data: {
                status: 'completed',
                outputUrl,
                promptUsed: `${payload.systemPrompt}\n\n${payload.userPrompt}${fallbackUsed ? `\n\n[FALLBACK TRIGGERED: ${fallbackMessage}]` : ''}`,
                completedAt: new Date()
              },
            } as any);
          } catch (dbError) {
            retryCount++;
            console.error(`DB job update (complete) failed (attempt ${retryCount}/${maxRetries + 1}):`, dbError);

            if (retryCount <= maxRetries) {
              // Wait 1 second before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              // All retries exhausted - log for manual recovery
              console.error(`CRITICAL: Job ${job.id} completed but failed to update DB after ${maxRetries + 1} attempts. Image exists at ${outputUrl}`);
            }
          }
        }

        if (updatedJob) {
          results.push({ ...updatedJob, fallbackUsed, fallbackMessage });
          successfulGenerations++;
        } else {
          // Fallback: return job data even though DB update failed
          results.push({ ...job, status: 'completed', outputUrl, fallbackUsed, fallbackMessage });
          successfulGenerations++;
        }
      } catch (error: any) {
        console.error(`Version ${i} failed:`, error);
        failedGenerations++;

        try {
          await prisma.generationJob.update({
            where: { id: job.id },
            data: { status: 'failed', errorMessage: error.message },
          } as any);
        } catch (dbError) {
          console.error('DB job update (failed) failed:', dbError);
        }

        if (count === 1) throw error;
        results.push({ id: job.id, status: 'failed', errorMessage: error.message });
      }
    }

    // NO REFUNDS - Credits deducted regardless of success/failure
    // This prevents exploitation and keeps the system simple
    // Failed generations are logged but credits are not refunded

    const response: any = {
      success: true,
      jobs: results,
      job: results[0],
    };

    // Include credit info for non-admins
    if (shouldDeductCredits) {
      response.creditsRemaining = creditsRemaining;
      response.creditsDeducted = creditsDeducted; // Full amount deducted, no refunds
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Generation Error (Top Level):', error);

    // NO REFUNDS - Credits are deducted regardless of outcome
    // Log the error but don't refund to prevent exploitation

    // Handle insufficient credits error with custom response
    if (error instanceof CreditService.InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          creditsRequired: error.required,
          creditsAvailable: error.available,
          message: 'You need more credits to generate thumbnails. Please contact an admin to purchase credits.'
        },
        { status: 402 }
      );
    }

    // Ensure we do not leak full stack traces in the 500 response
    const errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred during generation';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
