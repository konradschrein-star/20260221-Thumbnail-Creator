import { promises as fs } from 'fs';
import { resolve, join } from 'path';

/**
 * Job configuration for a single thumbnail generation request
 */
export interface JobConfig {
  videoTopic: string;
  thumbnailText: string;
}

export interface HardcodedProfile {
  name: string;
  systemPrompt: string;
  personaPath: string;
  logoPath?: string;
}

export interface HardcodedArchetype {
  name: string;
  referencePath: string;
  layoutInstructions: string;
}

/**
 * Complete AI request payload with prompts and encoded images
 */
export interface AIRequestPayload {
  systemPrompt: string;
  userPrompt: string;
  base64Images: {
    archetype: string;
    persona: string;
    logo?: string;
  };
}

export interface BrandContext {
  primaryColor: string;
  secondaryColor: string;
  tags: string[];
}

/**
 * Sanitizes input to prevent prompt injection and character limits
 */
export function sanitizePrompt(text: string, maxLength: number): string {
  if (!text) return '';
  return text.trim().substring(0, maxLength).replace(/[\r\n]/g, ' ');
}

/**
 * Encodes an image to base64 from a local path or a remote URL.
 * Aggressively attempts local resolution for any internal paths/URLs.
 */
export async function encodeImageToBase64(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return '';

  try {
    const projectRoot = process.cwd();
    let localBuffer: Buffer | null = null;
    let internalPath: string | null = null;

    // 1. Candidate Extraction
    if (pathOrUrl.startsWith('http')) {
      try {
        const url = new URL(pathOrUrl);
        // If it's an internal-looking URL, try to resolve the path locally
        if (
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname.includes('vercel.app') ||
          url.hostname.includes('next-auth')
        ) {
          internalPath = url.pathname;
        }
      } catch (e) {
        // Fallback: just use URL as is
      }
    } else {
      internalPath = pathOrUrl;
    }

    // 2. Try Local Filesystem Resolve (Aggressive)
    if (internalPath) {
      // Clean path: remove leading / and any query params
      const cleanPath = internalPath.split('?')[0].startsWith('/')
        ? internalPath.split('?')[0].slice(1)
        : internalPath.split('?')[0];

      const candidates = [
        join(projectRoot, 'public', cleanPath),
        join(projectRoot, 'assets', cleanPath),
        join(projectRoot, cleanPath),
        resolve(projectRoot, cleanPath)
      ];

      for (const candidate of candidates) {
        try {
          const normalized = resolve(candidate);
          // Safety: ensure it's inside the project
          if (normalized.startsWith(resolve(projectRoot))) {
            const stats = await fs.stat(normalized);
            if (stats.isFile()) {
              localBuffer = await fs.readFile(normalized);
              console.log(`[STORAGE] Resolved ${pathOrUrl} locally at ${normalized}`);
              break;
            }
          }
        } catch (err) {
          // Continue to next candidate
        }
      }
    }

    if (localBuffer) {
      return localBuffer.toString('base64');
    }

    // 3. Remote Fetch Fallback
    if (pathOrUrl.startsWith('http')) {
      const response = await fetch(pathOrUrl, {
        headers: { 'User-Agent': 'ThumbnailCreator/2.0' },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        throw new Error(`Remote fetch failed: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    }

    throw new Error(`Could not resolve image locally or as a valid URL: ${pathOrUrl}`);

  } catch (error: any) {
    console.error(`[ENCODER ERROR] Failed for ${pathOrUrl}:`, error.message);
    throw new Error(`Failed to encode image: ${error.message}`);
  }
}

/**
 * Detects branding colors and context based on video topic keywords
 */
export function getBrandingContext(topic: string, channel: { primaryColor?: string | null, secondaryColor?: string | null, tags?: string | null }): BrandContext {
  const p = topic.toLowerCase();
  const channelTags = channel.tags?.toLowerCase().split(',').map(t => t.trim()) || [];

  let primary = channel.primaryColor || "#ffffff";
  let secondary = channel.secondaryColor || "#000000";

  const platforms: Record<string, { p: string, s: string }> = {
    'snapchat': { p: "#FFFC00", s: "#000000" },
    'whatsapp': { p: "#25D366", s: "#075E54" },
    'youtube': { p: "#FF0000", s: "#FFFFFF" },
    'instagram': { p: "#E1306C", s: "#FCAF45" },
    'tiktok': { p: "#EE1D52", s: "#69C9D0" },
    'facebook': { p: "#1877F2", s: "#FFFFFF" },
    'twitter': { p: "#1DA1F2", s: "#FFFFFF" },
    'x.com': { p: "#000000", s: "#FFFFFF" },
    'linkedin': { p: "#0077B5", s: "#FFFFFF" }
  };

  for (const [platform, colors] of Object.entries(platforms)) {
    if (p.includes(platform) || channelTags.includes(platform)) {
      primary = colors.p;
      secondary = colors.s;
      break;
    }
  }

  return { primaryColor: primary, secondaryColor: secondary, tags: channelTags };
}

/**
 * Merges profile system prompt with archetype layout instructions and branding context
 */
export function buildSystemPrompt(
  profile: { personaDescription: string; systemPrompt?: string },
  archetype: { layoutInstructions: string },
  brand?: BrandContext
): string {
  const personaDesc = sanitizePrompt(profile.personaDescription, 1000);
  const layoutInstr = sanitizePrompt(archetype.layoutInstructions, 1000);

  let prompt = `${personaDesc}\n\n## Layout Instructions\n${layoutInstr}`;

  if (brand) {
    prompt += `\n\n## Visual Branding & Color Harmony
Apply the following color palette to ensure brand consistency:
- **Primary Color**: ${brand.primaryColor}
- **Secondary Color**: ${brand.secondaryColor}

Strategy: Use these for accents and overlays while maintaining professional legibility.`;
  }

  return prompt;
}

/**
 * Formats video topic and thumbnail text into user prompt with image references
 */
export function buildUserPrompt(job: JobConfig, hasLogo: boolean): string {
  const topic = sanitizePrompt(job.videoTopic, 150);
  const text = sanitizePrompt(job.thumbnailText, 80);

  return `Create a professional YouTube thumbnail.

Topic: ${topic}
Text to display: "${text}"

Use the provided reference image for style inspiration. ${hasLogo ? 'Integrate the channel logo cleanly.' : 'Focus on the persona and topic assets.'}
Ensure the text is high-contrast and legible.`;
}

/**
 * Assembles complete AI request payload by encoding images and building prompts
 */
export async function assemblePayload(
  channel: any | HardcodedProfile,
  archetype: any | HardcodedArchetype,
  job: JobConfig,
  baseUrl: string = ''
): Promise<AIRequestPayload> {
  const brand = getBrandingContext(job.videoTopic, channel);
  const systemPrompt = buildSystemPrompt(channel, archetype, brand);
  const userPrompt = buildUserPrompt(job, !!(channel.logoAssetPath || channel.logoPath));

  const personaPath = channel.personaAssetPath || channel.personaPath;
  const logoPath = channel.logoAssetPath || channel.logoPath;
  const archetypeUrl = archetype.imageUrl || archetype.referencePath;

  const encodingTasks: Promise<string | undefined>[] = [
    encodeImageToBase64(archetypeUrl.startsWith('http') ? archetypeUrl : `${baseUrl}${archetypeUrl}`),
    personaPath ? encodeImageToBase64(personaPath.startsWith('http') ? personaPath : `${baseUrl}${personaPath}`) : Promise.resolve(undefined),
    logoPath ? encodeImageToBase64(logoPath.startsWith('http') ? logoPath : `${baseUrl}${logoPath}`) : Promise.resolve(undefined),
  ];

  const [archetypeBase64, personaBase64, logoBase64] = await Promise.all(encodingTasks);

  if (!archetypeBase64) throw new Error("Archetype image is required");
  if (!personaBase64) throw new Error("Persona image is required");

  return {
    systemPrompt,
    userPrompt,
    base64Images: {
      archetype: archetypeBase64,
      persona: personaBase64,
      ...(logoBase64 ? { logo: logoBase64 } : {}),
    },
  };
}
