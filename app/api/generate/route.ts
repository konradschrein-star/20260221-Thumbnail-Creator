import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as payloadEngine from '@/lib/payload-engine';
import * as generationService from '@/lib/generation-service';
import { writeFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, archetypeId, videoTopic, thumbnailText, customPrompt } = body;

    // Validate required fields
    if (!channelId || !archetypeId || !videoTopic || !thumbnailText) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, archetypeId, videoTopic, thumbnailText' },
        { status: 400 }
      );
    }

    // Create generation job
    const job = await prisma.generationJob.create({
      data: {
        channelId,
        archetypeId,
        videoTopic,
        thumbnailText,
        customPrompt,
        status: 'processing',
      },
    });

    try {
      // Fetch channel and archetype
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
      });

      const archetype = await prisma.archetype.findUnique({
        where: { id: archetypeId },
      });

      if (!channel || !archetype) {
        throw new Error('Channel or Archetype not found');
      }

      // Build prompt with persona consistency
      const fullPrompt = customPrompt || `${channel.personaDescription} ${archetype.layoutInstructions}`;

      // Build payload
      const payload: payloadEngine.AIRequestPayload = {
        systemPrompt: fullPrompt,
        userPrompt: `Create a professional YouTube thumbnail.

Topic: ${videoTopic}
Text to display: "${thumbnailText}"

Use the reference image for style inspiration.`,
        base64Images: {
          archetype: await payloadEngine.encodeImageToBase64(
            path.join(process.cwd(), 'assets/test', path.basename(archetype.imageUrl))
          ),
          persona: '', // Not used in current implementation
          logo: '',    // Not used in current implementation
        },
      };

      // Generate thumbnail
      const imageBuffer = await generationService.callNanoBanana(
        payload,
        process.env.GOOGLE_API_KEY!
      );

      // Save to public/generated
      const filename = `${job.id}.png`;
      const outputPath = path.join(process.cwd(), 'public', 'generated', filename);
      await writeFile(outputPath, imageBuffer);

      const outputUrl = `/generated/${filename}`;

      // Update job as completed
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          outputUrl,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          outputUrl,
          status: 'completed',
        },
      });
    } catch (error: any) {
      // Update job as failed
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
