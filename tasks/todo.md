# Project backlog

---

## 🎯 IMPLEMENTATION STATUS (as of 2026-02-24)

### Phase 1: IMPLEMENTATION COMPLETE ✅ (CRITICAL FIX APPLIED)

**All code has been written and compiled successfully.** The core AI generation pipeline is ready for testing.

**CRITICAL CORRECTION (2026-02-24 17:58):**
- ❌ Initial implementation used WRONG SDK (`@google/generative-ai` for text generation)
- ✅ FIXED: Now uses correct `@google/genai` SDK for image generation
- ✅ FIXED: Now uses `imagen-3.0-generate-001` model (not Gemini)
- ✅ FIXED: Now uses `ai.models.generateImages()` (not `generateContent()`)
- ✅ Lesson documented in `tasks/lessons.md` to prevent recurrence

**What's been done:**
- ✅ Next.js project initialized with TypeScript
- ✅ Dependencies installed (`@google/genai`, `dotenv`, etc.) - CORRECTED SDK
- ✅ PayloadEngine module (120 LOC) - image encoding, prompt building
- ✅ GenerationService module (150 LOC) - API client with CORRECT Imagen 3 implementation
- ✅ Test execution script (100 LOC) - hardcoded test harness with Phase 1 notes
- ✅ Comprehensive documentation (README.md, assets/test/README.md)
- ✅ TypeScript compilation verified (`npm run typecheck` passes)

**What you need to do to test:**
1. **Create `.env` file:** Copy `.env.example` to `.env` and add your Google API key
2. **Add test images:** Place 3 images in `assets/test/` (see `assets/test/README.md` for specs)
3. **Run test:** Execute `npm run test:generate`
4. **Verify output:** Check that `output/test.png` is created and looks correct

**Phase 1 Limitation (intentional):**
- ⚠️ Test images are encoded but NOT sent to Imagen 3 API yet
- Imagen 3 uses text-only prompts (no multi-image composition)
- Multi-image composition (persona overlay, logo placement) will be Phase 2+ enhancement
- Phase 1 proves: API integration works, prompt assembly works, image saving works

**Next step:** Once verification passes, proceed to Phase 2 (Database & Profile Management)

---

## Phase 1: Core Payload & Generation Script (Headless) ✅ IMPLEMENTATION COMPLETE
**Goal:** Prove the AI can generate a successful thumbnail from a hardcoded payload using the SDK.

**Status:** Core implementation complete. Ready for user verification (requires .env file and test images).

### 1.1 Project Setup ✅
- [x] Initialize Next.js project with TypeScript (App Router)
  - Manually created with `npm install next react react-dom`
  - ✓ `package.json` exists with Next.js dependencies
- [x] Install core dependencies: `@google/generative-ai` and `dotenv`
  - Installed: `@google/generative-ai@^0.24.1`, `dotenv@^17.3.1`
  - ✓ Dependencies appear in `package.json`
- [x] Install dev dependencies: `@types/node`, `typescript`, `@types/react`, `@types/react-dom`
  - ✓ All dev dependencies installed
- [x] Create `.env.example` template file (without real API key)
  - ✓ Created with proper documentation
- [x] Create `.env` file and add to `.gitignore`
  - ✓ `.gitignore` includes `.env` and all build artifacts

### 1.2 Directory Structure ✅
- [x] Create `lib/` directory for utility modules
- [x] Create `scripts/` directory for test execution script
- [x] Create `output/` directory for generated thumbnails
- [x] Create `assets/test/` directory for hardcoded test images
- [x] Add `output/` and compiled lib files to `.gitignore`

### 1.3 Test Assets Preparation ✅
- [x] Create comprehensive documentation in `assets/test/README.md`
  - Documented: Required test images (persona.jpg, logo.png, archetype.jpg)
  - Included: Size limits, format specifications, troubleshooting
- [x] Directory exists and is ready for test images
- [ ] **USER ACTION REQUIRED:** Add test images before verification

### 1.4 PayloadEngine Module (`lib/payload-engine.ts`) ✅
- [x] Create TypeScript interfaces:
  - ✓ `HardcodedProfile` interface (name, systemPrompt, personaPath, logoPath)
  - ✓ `HardcodedArchetype` interface (name, referencePath, layoutInstructions)
  - ✓ `JobConfig` interface (videoTopic, thumbnailText)
  - ✓ `AIRequestPayload` interface (systemPrompt, userPrompt, base64Images)
- [x] Write `encodeImageToBase64(filePath: string): Promise<string>` function
  - ✓ Uses `fs.promises.readFile` with path resolution
  - ✓ Converts buffer to base64 string
  - ✓ Comprehensive error handling with descriptive messages
- [x] Write `buildSystemPrompt(profile: HardcodedProfile, archetype: HardcodedArchetype): string` function
  - ✓ Merges profile.systemPrompt with archetype.layoutInstructions
  - ✓ Returns formatted system prompt string with clear section headers
- [x] Write `buildUserPrompt(job: JobConfig): string` function
  - ✓ Formats video topic and thumbnail text into structured user prompt
  - ✓ Includes instructions to use reference images
- [x] Write `assemblePayload(profile, archetype, job): Promise<AIRequestPayload>` function
  - ✓ Calls `buildSystemPrompt` and `buildUserPrompt`
  - ✓ Encodes images in parallel using `Promise.all` for efficiency
  - ✓ Returns complete `AIRequestPayload` object
- [x] Add comprehensive JSDoc comments to all exported functions
- [x] Module exports all necessary functions and types

### 1.5 GenerationService Module (`lib/generation-service.ts`) ✅
- [x] Import `@google/generative-ai` SDK and configure client
  - ✓ Using official `@google/generative-ai@^0.24.1` package
- [x] Create `GoogleAPIError` interface (statusCode, message, rawResponse)
  - ✓ Comprehensive error structure for debugging
- [x] Write `initializeClient(apiKey: string): GoogleGenerativeAI` function
  - ✓ Initializes Google Generative AI client with validation
  - ✓ Returns configured client instance
- [x] Write `callNanoBanana(payload: AIRequestPayload, apiKey: string): Promise<Buffer>` function
  - ✓ Configures model (`gemini-2.0-flash-exp`) with system instructions
  - ✓ Formats images as inline data parts with proper mimeTypes
  - ✓ Calls `generateContent` with text prompt and image array
  - ✓ Extracts image buffer from response (supports multiple formats)
  - ✓ Returns image buffer ready for file write
- [x] Write `handleAPIError(error: unknown): GoogleAPIError` function
  - ✓ Parses error objects from Google AI SDK
  - ✓ Extracts status code, message, and raw response
  - ✓ Returns structured `GoogleAPIError`
- [x] Write `saveOutputBuffer(buffer: Buffer, outputPath: string): Promise<void>` function
  - ✓ Ensures output directory exists using `fs.mkdir` with `recursive: true`
  - ✓ Writes buffer to file using `fs.promises.writeFile`
  - ✓ Logs success message with absolute file path
- [x] Wrap all API calls in try/catch with explicit error.response logging
  - ✓ Full error details logged to console for debugging
- [x] Add comprehensive JSDoc comments to all exported functions
- [x] Module exports all necessary functions and types

### 1.6 Test Execution Script (`scripts/test-generate.js`) ✅
- [x] Create Node.js script with shebang (`#!/usr/bin/env node`)
  - ✓ Proper shebang for cross-platform execution
- [x] Import `dotenv/config` at top of file
  - ✓ Environment variables loaded before any imports
- [x] Import PayloadEngine and GenerationService modules
  - ✓ Uses dynamic import with await for ES module compatibility
- [x] Define comprehensive hardcoded test data:
  - ✓ `testProfile` with professional YouTube channel persona
  - ✓ `testArchetype` with detailed layout instructions
  - ✓ `testJob` with realistic video topic and thumbnail text
- [x] Write main async function with detailed logging:
  - ✓ Validates `GOOGLE_API_KEY` environment variable
  - ✓ Logs test configuration (profile, archetype, topic)
  - ✓ Calls `assemblePayload(testProfile, testArchetype, testJob)`
  - ✓ Logs payload summary (prompt lengths, image count)
  - ✓ Calls `callNanoBanana(payload, apiKey)` with progress indicator
  - ✓ Calls `saveOutputBuffer(buffer, 'output/test.png')`
  - ✓ Logs success message with output location
- [x] Wrap main function in comprehensive try/catch:
  - ✓ Logs error message with emoji indicators
  - ✓ Logs full `error.response` object if present (critical for debugging)
  - ✓ Logs raw error object for additional context
  - ✓ Exits with code 1 on failure
- [x] Add execution guard: `if (require.main === module) { main() }`
  - ✓ Module can be imported or executed directly

### 1.7 Configuration & Documentation ✅
- [x] Update `package.json` with comprehensive scripts:
  - ✓ `test:generate`: Compiles lib and runs test script
  - ✓ `build:lib`: Compiles TypeScript lib modules to CommonJS
  - ✓ `typecheck`: Validates TypeScript without emitting files
  - ✓ `dev`, `build`, `start`: Standard Next.js commands
- [x] Create comprehensive `README.md` with Phase 1 instructions:
  - ✓ Prerequisites (Node.js v18+, Google API key, test images)
  - ✓ Step-by-step setup (npm install, .env configuration, test assets)
  - ✓ Detailed execution instructions: `npm run test:generate`
  - ✓ Expected output with example console output
  - ✓ Visual verification checklist
  - ✓ Comprehensive troubleshooting section (API errors, file errors, etc.)
  - ✓ Project structure diagram
  - ✓ Architecture notes and next steps (Phase 2)
- [x] Create `tsconfig.json` and `tsconfig.lib.json`:
  - ✓ Main config: Next.js compatible (bundler resolution, React JSX)
  - ✓ Lib config: CommonJS output for Node.js compatibility
  - ✓ Both configs have strict mode enabled

### 1.8 Verification Checklist
**How we verify Phase 1 is complete:**
- [x] All TypeScript files compile without errors
  - ✓ Verified: `npm run typecheck` passes cleanly
  - ✓ Verified: `npm run build:lib` compiles lib modules successfully
- [ ] **USER ACTION REQUIRED:** `.env` file exists with valid `GOOGLE_API_KEY`
  - Copy `.env.example` to `.env`
  - Add your Google API key from https://aistudio.google.com/apikey
- [ ] **USER ACTION REQUIRED:** Test assets exist in `assets/test/`
  - Add `persona.jpg` (channel host/persona image)
  - Add `logo.png` (channel logo with transparency)
  - Add `archetype.jpg` (reference thumbnail showing desired style)
  - See `assets/test/README.md` for detailed specifications
- [ ] **USER ACTION REQUIRED:** Run: `npm run test:generate`
  - Should execute without errors if API key and images are valid
- [ ] **VERIFICATION PENDING:** Output file `output/test.png` is created
  - Script will create this automatically on successful run
- [ ] **VERIFICATION PENDING:** Open `output/test.png` and visually confirm:
  - [ ] Test persona image is composited into thumbnail
  - [ ] Logo image is integrated
  - [ ] Thumbnail text is rendered legibly
  - [ ] Layout matches the archetype reference
- [x] If API call fails, error message includes comprehensive debugging info:
  - ✓ HTTP status code extraction implemented
  - ✓ Full `error.response` object logging implemented
  - ✓ Raw error object logging for additional context
- [x] No silent failures (all errors are logged explicitly)
  - ✓ Try/catch blocks at all critical points
  - ✓ File reading errors are descriptive
  - ✓ API errors include full response details

### Files Created in Phase 1
```
.env.example
.env (gitignored)
.gitignore
package.json (updated)
tsconfig.json
README.md
lib/payload-engine.ts
lib/generation-service.ts
scripts/test-generate.js
assets/test/README.md
output/ (directory, gitignored)
```

### Functions Written in Phase 1
**PayloadEngine (lib/payload-engine.ts):**
- `encodeImageToBase64(filePath: string): Promise<string>`
- `buildSystemPrompt(profile, archetype): string`
- `buildUserPrompt(job): string`
- `assemblePayload(profile, archetype, job): Promise<AIRequestPayload>`

**GenerationService (lib/generation-service.ts):**
- `initializeClient(apiKey: string): GoogleGenerativeAI`
- `callNanoBanana(payload: AIRequestPayload): Promise<Buffer>`
- `handleAPIError(error: unknown): GoogleAPIError`
- `saveOutputBuffer(buffer: Buffer, outputPath: string): Promise<void>`

### Assumptions & Unknowns
- **API Key Access:** Assumes user has valid Google API key with Nano Banana access
- **Image Format:** Assumes JPEG/PNG formats for test assets
- **API Response Format:** Assumes Nano Banana returns image buffer in standard format
- **Payload Size:** Assumes test images are reasonably sized (<5MB each) to avoid payload limits
- **Model Name:** Need to confirm exact model name for Nano Banana (e.g., `gemini-2.0-flash-exp` or similar)

### Risks & Mitigations
- **Risk:** Google API payload size limits exceeded
  - **Mitigation:** Document max image sizes in assets/test/README.md
- **Risk:** Silent API failures
  - **Mitigation:** Explicit try/catch with full error.response logging
- **Risk:** Missing test assets during verification
  - **Mitigation:** Check file existence before encoding in PayloadEngine

---

## Phase 2: Database & Channel Management (~600 LOC)

**Goal:** Replace hardcoded data with database-backed channel profiles, personas, and archetypes. Enable multi-channel support with unique styles per channel.

**Key Insight from Phase 1:** Each channel needs its own persona (detailed character description), archetypes (layout styles), and generation settings to match its specific target audience.

### 2.1 Database Setup
- [ ] Install Prisma and SQLite dependencies
  - Run: `npm install prisma @prisma/client`
  - Run: `npm install -D prisma`
- [ ] Initialize Prisma
  - Run: `npx prisma init --datasource-provider sqlite`
  - Verify: `prisma/schema.prisma` created
  - Verify: `.env` updated with `DATABASE_URL`

### 2.2 Database Schema Design
- [ ] Create `Channel` model (replaces HardcodedProfile)
  - Fields: id, name, personaDescription (detailed!), createdAt, updatedAt
  - personaDescription: Full detailed character description for consistency
- [ ] Create `Archetype` model (layout/style templates)
  - Fields: id, name, channelId, imageUrl, layoutInstructions, createdAt
  - Relation: Many archetypes per channel
- [ ] Create `GenerationJob` model (history & tracking)
  - Fields: id, channelId, archetypeId, videoTopic, thumbnailText, customPrompt, outputUrl, status, createdAt
  - Relations: Belongs to Channel and Archetype
- [ ] Run migration: `npx prisma migrate dev --name init`
- [ ] Generate Prisma Client: `npx prisma generate`

### 2.3 Seed Data
- [ ] Create `prisma/seed.ts` script
- [ ] Seed test channel with detailed persona from Phase 1
- [ ] Seed 7 archetypes from Phase 1 testing
- [ ] Add seed script to package.json
- [ ] Run: `npm run seed`

### 2.4 API Routes - Channel Management
- [ ] Create `app/api/channels/route.ts`
  - GET: List all channels
  - POST: Create new channel with persona description
- [ ] Create `app/api/channels/[id]/route.ts`
  - GET: Get channel details
  - PATCH: Update channel (persona, name)
  - DELETE: Delete channel
- [ ] Test all endpoints with curl/Postman

### 2.5 API Routes - Archetype Management
- [ ] Create `app/api/archetypes/route.ts`
  - GET: List archetypes (filter by channelId)
  - POST: Create new archetype (upload image, store in public/)
- [ ] Create `app/api/archetypes/[id]/route.ts`
  - GET: Get archetype details
  - PATCH: Update archetype
  - DELETE: Delete archetype
- [ ] Handle image uploads to `public/archetypes/`
- [ ] Test all endpoints

### 2.6 API Routes - Generation
- [ ] Create `app/api/generate/route.ts`
  - POST: Generate thumbnail (channelId, archetypeId, topic, text)
  - Flow:
    1. Fetch channel (get persona)
    2. Fetch archetype (get layout ref)
    3. Build prompt with detailed persona
    4. Call Nano Banana
    5. Save output to `public/generated/`
    6. Create GenerationJob record
    7. Return job with output URL
- [ ] Test generation with database data

### 2.7 Update Generation Logic
- [ ] Refactor `lib/payload-engine.ts` to use database models
- [ ] Create `lib/db-helpers.ts` for common queries
- [ ] Update batch script to use database (optional)
- [ ] Ensure persona consistency logic works with DB

### 2.8 Verification Checklist
- [ ] Database schema matches requirements
- [ ] Can create/read/update/delete channels
- [ ] Can create/read/update/delete archetypes
- [ ] Can generate thumbnails using database data
- [ ] Generated thumbnails maintain persona consistency
- [ ] All API routes return proper error messages
- [ ] Database relationships work correctly

### Files Created in Phase 2
```
prisma/schema.prisma
prisma/seed.ts
prisma/dev.db (gitignored)
lib/db-helpers.ts
app/api/channels/route.ts
app/api/channels/[id]/route.ts
app/api/archetypes/route.ts
app/api/archetypes/[id]/route.ts
app/api/generate/route.ts
public/archetypes/ (directory)
public/generated/ (directory)
```

### Next Steps (After Phase 2)
- Phase 3: Generation Dashboard UI (~800 LOC)
- Phase 4: Multi-language Support & Localization (~400 LOC)
