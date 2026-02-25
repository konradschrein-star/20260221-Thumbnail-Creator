# Lessons Learned

## Lesson 1: Nano Banana API - generateContent vs generateImages (2026-02-24)

**MISTAKE 1:** Initial implementation used `@google/generative-ai` SDK (text-only SDK) instead of `@google/genai` SDK.

**MISTAKE 2:** After switching to `@google/genai`, tried to use `ai.models.generateImages()` with models like `imagen-3.0-generate-001` and `imagegeneration@006`, which don't exist or aren't accessible.

**ROOT CAUSE:** Confused legacy Imagen models (which use `generateImages`) with Nano Banana, which is actually `gemini-3-pro-image-preview` - a multimodal Gemini model that generates images via `generateContent()` with `responseModalities: ["IMAGE"]`.

**RULE:** For Nano Banana (gemini-3-pro-image-preview) image generation:
- Use `@google/genai` SDK ✅
- Use `ai.models.generateContent()` (NOT `generateImages`)
- Model name: `gemini-3-pro-image-preview`
- Config must include: `responseModalities: ["IMAGE"]`
- Supports multi-image fusion (archetype + persona + logo)
- Response structure: `response.candidates[0].content.parts[0].inlineData.data`

**EXAMPLE FIX:**
```typescript
// WRONG (tried generateImages with Imagen models):
const response = await ai.models.generateImages({
  model: 'imagen-3.0-generate-001',
  prompt: textPrompt,
  config: { numberOfImages: 1 }
});

// CORRECT (Nano Banana with generateContent):
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: [prompt, ...imageParts],
  config: { responseModalities: ["IMAGE"] }
});
const base64Data = response.candidates[0].content.parts[0].inlineData.data;
const imageBuffer = Buffer.from(base64Data, 'base64');
```

**IMPACT:** This was caught in Phase 1 before building database/UI. The "headless first" approach validated itself - we discovered the correct API integration pattern with ~200 LOC changes instead of after building 2000+ LOC of infrastructure.

---

## Lesson 2: Character Consistency & Layout Templates (2026-02-24)

**MISTAKE:** Initial batch generation produced different-looking people in each thumbnail, breaking brand consistency.

**ROOT CAUSE:** Generic prompts like "handsome brown-haired man" are too vague. AI generates a new interpretation each time without detailed, specific character descriptions.

**RULE:** For consistent character appearance across multiple thumbnails:
1. Create ONE highly detailed persona description (age, facial features, hair style, build, clothing, expression, etc.)
2. Use this EXACT description at the start of every single generation prompt
3. Include ~10-15 specific details: face shape, eye color, jawline, hair texture, skin tone, facial hair, etc.
4. Layout templates work best with faces removed (safety filters) - use detailed text descriptions instead

**EXAMPLE FIX:**
```typescript
// WRONG (inconsistent):
const prompt = "A handsome brown-haired man pointing at logo";

// CORRECT (consistent):
const PERSONA = "28-year-old charismatic male with medium-length, slightly wavy brown hair styled casually with natural volume. He has warm hazel eyes, a strong defined jawline, and a friendly smile showing genuine enthusiasm. His face is oval-shaped with high cheekbones and a straight nose. He has a fit athletic build, stands confidently, and wears a simple black crew-neck t-shirt. His skin tone is lightly tanned (Mediterranean complexion). He has subtle stubble (5 o'clock shadow) giving him a mature, approachable look. His eyebrows are well-defined and expressive.";

const prompt = `${PERSONA} He is pointing at the logo...`;
```

**IMPACT:** After implementing detailed persona descriptions, all 7 batch-generated thumbnails featured the same recognizable person, achieving brand consistency.

**PHASE 1 KEY FINDINGS:**
- ✅ Archetype-only generation works reliably (layout reference images)
- ✅ Detailed persona descriptions ensure character consistency
- ✅ 16:9 aspect ratio config works perfectly
- ✅ Each channel needs unique personas, styles, and layouts for their target audience
- ❌ Reference persona images trigger safety filters (use text descriptions instead)
- ❌ Generic prompts create inconsistent characters

---

## Template Entry Format

**MISTAKE:** [What went wrong]

**ROOT CAUSE:** [Why it happened]

**RULE:** [General principle to prevent this]

**EXAMPLE FIX:** [Concrete code or approach that solves it]

---
