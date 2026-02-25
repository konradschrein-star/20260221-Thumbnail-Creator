# Project Specification

Problem Definition
The tool is an automated, high-volume YouTube thumbnail generation engine designed to service a network of 50+ channels. It allows operators and virtual assistants to produce daily branded thumbnails that maintain strict channel-specific visual consistency without requiring manual graphic design work. Users configure Channel Profiles (defining host personas, brand colors, and logos) and map them to proven structural Archetypes (reference layouts). For each new video, the tool constructs a highly specific, multi-asset payload and sends it to the Google Nano Banana API for single-pass image composition and high-fidelity text rendering. A successful thumbnail accurately preserves the host's identity, cleanly integrates the software logo, matches the spatial layout of the chosen archetype, and renders the requested title text legibly. Finally, the system supports a localization loop to automatically generate translated variants of the approved master thumbnail for international channels, with manual quality control and one-click regeneration handled by a virtual assistant.

Architecture Overview
The system uses a unified monolithic architecture with a clear separation of concerns to minimize infrastructure fragility. The Frontend (Web UI) handles channel configuration, job input, and visual QA review. The API Controller routes requests and manages database transactions. The Payload Engine is the core business logic layer responsible for merging Channel Profiles, Job Configs, and Archetype references into the strict prompt structure required by the AI. The Generation Service manages the external network calls to the Google API, handling retries and explicit error logging. Finally, the Localization Engine triggers a secondary loop to translate text and spin off regional variants of a successful base job.

Tech Stack Recommendation
Frontend & Backend: Next.js (App Router) - Provides a unified React frontend and Node.js backend environment, reducing infrastructure complexity for a solo developer or small team.

Database: SQLite (via Prisma ORM) - Requires zero separate server infrastructure while providing strong relational data integrity for channel profiles and job histories.

AI Integration: @google/genai (Node.js SDK) - The official and most stable method for interacting natively with the Nano Banana multi-image capabilities.

Storage: Local File System (Node.js fs) - Ensures immediate, zero-latency access to reference assets and generated outputs during the generation process before eventual cloud backup.

Module Breakdown
1. Profile Manager
Responsibility: Manages CRUD operations for channel-specific branding assets and rules.

Inputs: Form data (Name, System Prompt, Persona Image, Logo Image).

Outputs: Validated ChannelProfile database record.

Key Functions: createProfile(), getProfileWithAssets(), updateProfile().

Risks: Mishandling of multipart form data for image uploads causing corrupted asset files.

2. Payload Engine
Responsibility: Constructs the exact text prompt and base64 image array for the AI request.

Inputs: ChannelProfile, JobConfig (Topic, Text), ArchetypeReference.

Outputs: Formatted AIRequestPayload.

Key Functions: buildSystemPrompt(), encodeAssetsToBase64(), assemblePayload().

Risks: Exceeding Google API payload size limits with large, unoptimized reference images.

3. Generation Service
Responsibility: Executes the external call to the Google Nano Banana API and handles responses.

Inputs: AIRequestPayload.

Outputs: Saved Image Path or structured APIError.

Key Functions: callNanoBanana(), handleAPIError(), saveOutputBuffer().

Risks: Silent API failures, rate limiting (429), or unauthorized (403) errors hanging the pipeline.

4. Localization Engine
Responsibility: Generates regional variants of a completed master thumbnail.

Inputs: MasterJobRecord, Target Languages array.

Outputs: Array of LocalizedJobRecords.

Key Functions: translatePromptText(), queueVariantGenerations().

Risks: Parallel API limits being hit if all languages are requested simultaneously without concurrency controls.

Data Models
ChannelProfile

id (UUID, Primary Key)

name (String)

defaultPromptStyle (Text)

personaAssetPath (String)

logoAssetPath (String)

createdAt (DateTime)

Archetype

id (UUID, Primary Key)

name (String)

referenceImagePath (String)

layoutInstructions (Text)

GenerationJob

id (UUID, Primary Key)

channelId (UUID, Foreign Key)

archetypeId (UUID, Foreign Key)

videoTopic (String)

thumbnailText (String)

status (Enum: PENDING, SUCCESS, FAILED)

outputPath (String, nullable)

errorMessage (Text, nullable)

VariantJob

id (UUID, Primary Key)

masterJobId (UUID, Foreign Key)

language (String)

translatedText (String)

outputPath (String, nullable)

status (Enum: PENDING, SUCCESS, FAILED)

Implementation Phases
Phase 1: Core Payload & Generation Script (Headless)
Goal: Prove the AI can generate a successful thumbnail from a hardcoded payload using the SDK.

[ ] Initialize Next.js project and install @google/genai and dotenv.

[ ] Create PayloadEngine utility to merge hardcoded profile/archetype image data into base64 arrays.

[ ] Create GenerationService to execute the API call and write the output buffer to output/test.png.

[ ] Wrap the API call in a try/catch block that prints the exact error.response object to the console.

How we verify: Running node scripts/test-generate.js outputs a valid .png that composites the test persona, logo, and text based on the test archetype layout.

Estimated LOC: ~300

Phase 2: Database & Profile Management
Goal: Move from hardcoded configurations to a persistent SQLite database.

[ ] Initialize Prisma with SQLite provider.

[ ] Define the Prisma schema for ChannelProfile, Archetype, and GenerationJob.

[ ] Build Next.js API routes (GET/POST) for creating and retrieving Channel Profiles.

[ ] Implement local file saving for Persona and Logo asset uploads within the Profile creation route.

How we verify: Successfully create and retrieve a ChannelProfile (including valid local image paths) via a REST client or basic test script.

Estimated LOC: ~500

Phase 3: The Generation Dashboard (UI)
Goal: Provide the visual interface for operators to select profiles, input topics, and trigger generations.

[ ] Build a React form to select a ChannelProfile, pick an Archetype, and input video topic/text.

[ ] Wire the form submission to a Next.js Server Action that calls the GenerationService.

[ ] Build an image viewer component to display the resulting image or the errorMessage text on failure.

[ ] Add a "Regenerate" button that re-submits the exact GenerationJob payload for manual QA rejection.

How we verify: An operator can use the web UI to input a prompt, click generate, and visually confirm the resulting image or explicit error banner on screen.

Estimated LOC: ~800

Phase 4: Localization Loop
Goal: Enable multi-language variant generation from a successful master thumbnail.

[ ] Add a language multi-select component to the Generation Dashboard.

[ ] Create the LocalizationEngine module to translate the thumbnailText.

[ ] Implement a sequential loop that iterates through selected languages, calling GenerationService for each and saving a VariantJob record.

How we verify: Selecting English, Spanish, and German produces three distinct thumbnails with localized text, all linked to the parent GenerationJob in the database.

Estimated LOC: ~400

Acceptance Criteria
[ ] The system successfully constructs a Google Nano Banana API payload containing 1 text prompt and up to 3 image assets (Archetype, Persona, Logo) without formatting errors.

[ ] The system persists all generation attempts (both successes and failures) in the SQLite database.

[ ] API errors (e.g., 403 Forbidden, 429 Too Many Requests) are caught, stored in the database's errorMessage field, and displayed cleanly in the UI, actively preventing infinite loading hangs.

[ ] A user can trigger a multi-language generation batch that processes variants sequentially without crashing the application.

[ ] The Virtual Assistant can trigger a manual regeneration for any specific job directly from the UI to overwrite a rejected thumbnail.

Open Questions
Translation Service: What specific translation service or API (DeepL, Google Translate, or Gemini text-only model) should the LocalizationEngine use for translating the thumbnail text?

Answer: Just prompt Nano Banana to make a german version of the thumbnail. It is better at it than any translation service.

Storage Management: Should rejected or orphaned thumbnail image files be purged from the local file system periodically via a cron job to prevent disk bloat?

Answer: Yes. But only if the job is older than 48 hours.

Rate Limits: Are there strict API rate limits for the specific Google Nano Banana tier currently in use that require implementing an intentional setTimeout delay between localization loop requests?

Answer: Not that I know of. But we should implement a retry mechanism with exponential backoff. Just in case.
