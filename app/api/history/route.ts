import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch both master jobs and variant jobs in parallel for better performance
        // Take 50 of each to ensure we have enough records after combining and sorting
        const [masterJobs, variantJobs] = await Promise.all([
            // 1. Fetch manual generation jobs
            prisma.generationJob.findMany({
                where: {
                    userId: session.user.id,
                    isManual: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 50,
                include: {
                    channel: true,
                    archetype: true,
                },
            }),
            // 2. Fetch variant jobs for this user's master jobs
            prisma.variantJob.findMany({
                where: {
                    masterJob: {
                        userId: session.user.id
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 50,
                include: {
                    masterJob: {
                        include: {
                            channel: true,
                            archetype: true
                        }
                    }
                }
            })
        ]);

        // 3. Map variants to a standardized format that matches HistoryJob
        const currentUserId = session.user.id;
        const mappedVariants = (variantJobs as any[]).map(v => ({
            id: v.id,
            channelId: v.masterJob?.channelId || '',
            archetypeId: v.masterJob?.archetypeId || '',
            videoTopic: v.masterJob?.videoTopic || 'Translated Variant',
            thumbnailText: v.translatedText,
            customPrompt: null,
            promptUsed: null,
            status: v.status as any,
            outputUrl: v.outputUrl,
            errorMessage: v.errorMessage,
            createdAt: v.createdAt.toISOString(),
            completedAt: v.completedAt?.toISOString() || null,
            isManual: true,
            userId: currentUserId,
            metadata: {
                isVariant: true,
                language: v.language,
                translationMode: v.translationMode as string,
                originalText: v.originalText as string
            },
            channel: v.masterJob?.channel,
            archetype: v.masterJob?.archetype
        }));

        // 4. Combine and sort
        const combined = [...masterJobs, ...mappedVariants]
            .sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 50);

        return NextResponse.json(combined);
    } catch (error: any) {
        console.error('History fetch error:', error);
        const errorMessage = error instanceof Error
            ? error.message
            : 'An unexpected error occurred fetching history';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
