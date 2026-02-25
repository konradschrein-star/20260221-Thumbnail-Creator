import { promises as fs } from 'fs';
import { resolve } from 'path';

/**
 * Hardcoded profile configuration for a YouTube channel
 */
export interface HardcodedProfile {
  name: string;
  systemPrompt: string;
  personaPath: string;
  logoPath: string;
}

/**
 * Hardcoded archetype configuration for thumbnail layout style
 */
export interface HardcodedArchetype {
  name: string;
  referencePath: string;
  layoutInstructions: string;
}

/**
 * Job configuration for a single thumbnail generation request
 */
export interface JobConfig {
  videoTopic: string;
  thumbnailText: string;
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
    logo: string;
  };
}

/**
 * Reads a local image file and converts it to base64 encoding
 * @param filePath - Absolute or relative path to the image file
 * @returns Base64-encoded string of the image
 * @throws Error if file cannot be read
 */
export async function encodeImageToBase64(filePath: string): Promise<string> {
  try {
    const absolutePath = resolve(filePath);
    const buffer = await fs.readFile(absolutePath);
    return buffer.toString('base64');
  } catch (error) {
    throw new Error(
      `Failed to read image at ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Merges profile system prompt with archetype layout instructions
 * @param profile - Channel profile configuration
 * @param archetype - Thumbnail archetype configuration
 * @returns Formatted system prompt string
 */
export function buildSystemPrompt(
  profile: HardcodedProfile,
  archetype: HardcodedArchetype
): string {
  return `${profile.systemPrompt}\n\n## Layout Instructions\n${archetype.layoutInstructions}`;
}

/**
 * Formats video topic and thumbnail text into user prompt with image references
 * @param job - Job configuration with topic and text
 * @returns Formatted user prompt string
 */
export function buildUserPrompt(job: JobConfig): string {
  return `Create a professional YouTube thumbnail.

Topic: ${job.videoTopic}
Text to display: "${job.thumbnailText}"

Use the reference image for style inspiration.`;
}

/**
 * Assembles complete AI request payload by encoding images and building prompts
 * @param profile - Channel profile configuration
 * @param archetype - Thumbnail archetype configuration
 * @param job - Job configuration
 * @returns Complete AIRequestPayload ready for API submission
 */
export async function assemblePayload(
  profile: HardcodedProfile,
  archetype: HardcodedArchetype,
  job: JobConfig
): Promise<AIRequestPayload> {
  // Build prompts
  const systemPrompt = buildSystemPrompt(profile, archetype);
  const userPrompt = buildUserPrompt(job);

  // Encode images in parallel
  const [archetypeBase64, personaBase64, logoBase64] = await Promise.all([
    encodeImageToBase64(archetype.referencePath),
    encodeImageToBase64(profile.personaPath),
    encodeImageToBase64(profile.logoPath),
  ]);

  return {
    systemPrompt,
    userPrompt,
    base64Images: {
      archetype: archetypeBase64,
      persona: personaBase64,
      logo: logoBase64,
    },
  };
}
