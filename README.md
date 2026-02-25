# 🎨 YouTube Thumbnail Generator

A production-grade thumbnail generation system powered by Google's Nano Banana API (gemini-3-pro-image-preview). Built to service 50+ YouTube channels with consistent, persona-driven thumbnails.

## ✨ Features

- **Multi-Channel Support**: Manage unlimited channels, each with unique personas and styles
- **Character Consistency**: Advanced persona system ensures the same character appears across all thumbnails
- **Archetype Templates**: 7+ pre-built layout styles (Educational, Dramatic, Modern, etc.)
- **Web Dashboard**: Full-featured UI for channel/archetype management and generation
- **Drag & Drop Upload**: Easy archetype reference image management
- **Job Tracking**: Complete history with filtering and thumbnail previews
- **Type-Safe**: Built with TypeScript for reliability
- **Fast Generation**: 15-20 second thumbnail generation via Google AI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Google AI API key with access to `gemini-3-pro-image-preview`

### Installation

```bash
# Clone repository
git clone https://github.com/konradschrein-star/thumbnail-tool.git
cd thumbnail-tool

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# Initialize database
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Start development server
npm run dev
```

Visit http://localhost:3000 to access the dashboard!

## 📖 Usage

### Creating Your First Channel

1. Navigate to the **Channels** tab
2. Click **Create Channel**
3. Enter a name and detailed persona description (200+ words recommended)
4. Include specific attributes: age, hair, eyes, facial structure, build, clothing, etc.

**Example Persona:**
```
The host is a 28-year-old charismatic male with medium-length, slightly wavy
brown hair styled casually with natural volume. He has warm hazel eyes, a
strong defined jawline, and a friendly smile showing genuine enthusiasm...
[continue with 15+ specific physical attributes]
```

### Adding Archetypes

1. Switch to the **Archetypes** tab
2. Select your channel from the dropdown
3. Click **Create Archetype**
4. Upload a reference image (layout template with face removed)
5. Add layout instructions describing the style

### Generating Thumbnails

1. Go to the **Generate** tab
2. Select a channel and archetype
3. Enter video topic and thumbnail text
4. Click **Generate Thumbnail**
5. Preview and download the result

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Prisma 5 + SQLite
- **AI**: Google Gemini (`@google/genai`)
- **Language**: TypeScript (strict mode)
- **Styling**: Inline styles (zero dependencies)

### Project Structure

```
├── app/
│   ├── api/              # RESTful API routes
│   │   ├── channels/     # Channel CRUD
│   │   ├── archetypes/   # Archetype CRUD
│   │   ├── generate/     # Thumbnail generation
│   │   ├── jobs/         # Job history
│   │   └── upload/       # File upload handler
│   └── dashboard/        # Web UI
│       ├── components/   # React components
│       ├── hooks/        # Custom hooks
│       └── styles.ts     # Design system
├── lib/
│   ├── payload-engine.ts      # AI payload assembly
│   └── generation-service.ts  # Nano Banana API client
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Initial data
└── public/
    └── generated/        # Generated thumbnails (gitignored)
```

## 🔐 Security Best Practices

### Environment Variables

Never commit `.env` files. Required variables:

```env
GOOGLE_API_KEY=your_api_key_here
DATABASE_URL="file:./dev.db"
```

### File Upload Security

- ✅ File type validation (JPG, PNG, WEBP only)
- ✅ File size limit (5MB max)
- ✅ Sanitized filenames
- ✅ Stored in public directory (not /tmp)

### API Security

- ✅ Input validation on all endpoints
- ✅ Error messages don't leak sensitive data
- ✅ Prisma parameterized queries (SQL injection protection)
- 🔜 Rate limiting (recommended for production)
- 🔜 Authentication (recommended for production)

## 📊 Database Schema

### Core Models

**Channel**: Represents a YouTube channel
- `id`: Unique identifier
- `name`: Channel name
- `personaDescription`: Detailed character description (200+ words)
- `archetypes[]`: Associated layout templates
- `generationJobs[]`: Thumbnail generation history

**Archetype**: Layout template for thumbnails
- `id`: Unique identifier
- `name`: Template name
- `channelId`: Parent channel
- `imageUrl`: Reference image path
- `layoutInstructions`: Style description

**GenerationJob**: Thumbnail generation tracking
- `id`: Unique identifier
- `channelId`: Source channel
- `archetypeId`: Used template
- `videoTopic`: Video subject
- `thumbnailText`: Text overlay
- `outputUrl`: Generated thumbnail path
- `status`: pending | processing | completed | failed
- `errorMessage`: Error details (if failed)

## 🎯 API Endpoints

### Channels

```http
GET    /api/channels          # List all channels
POST   /api/channels          # Create channel
GET    /api/channels/[id]     # Get single channel
PATCH  /api/channels/[id]     # Update channel
DELETE /api/channels/[id]     # Delete channel (cascade)
```

### Archetypes

```http
GET    /api/archetypes?channelId=xxx  # List archetypes
POST   /api/archetypes                # Create archetype
GET    /api/archetypes/[id]           # Get single archetype
PATCH  /api/archetypes/[id]           # Update archetype
DELETE /api/archetypes/[id]           # Delete archetype
```

### Generation

```http
POST   /api/generate          # Generate thumbnail
GET    /api/jobs              # List jobs (with filters)
POST   /api/upload            # Upload reference image
```

## 🧪 Testing

```bash
# Type checking
npx tsc --noEmit

# Database management
npx prisma studio              # Open visual editor (port 5555)

# Batch generation test (Phase 1)
npm run test:generate

# API testing
npm run test:api
```

## 📝 Development Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm start                # Start production server

# Database
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create/apply migrations
npx prisma db seed       # Seed initial data
npx prisma studio        # Open database UI

# Type checking
npx tsc --noEmit         # Check TypeScript errors
```

## 🐛 Troubleshooting

### "Model not found" or 403 errors

- Verify `GOOGLE_API_KEY` is set in `.env`
- Confirm Google Cloud billing is enabled
- Check API key has access to `gemini-3-pro-image-preview`

### Inconsistent characters across thumbnails

- Ensure persona description is 200+ words
- Include 15+ specific physical attributes
- Same exact persona text is used for all generations

### Database connection errors

- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate dev` to apply migrations
- Check `prisma/dev.db` exists and has correct permissions

### Upload errors

- Verify `public/archetypes/` directory exists
- Check file permissions
- Ensure files are under 5MB
- Only JPG/PNG/WEBP formats supported

## 🔧 Known Limitations

- **Safety Filters**: Persona photos (real people) trigger content blocks. Use text-only descriptions with archetype-only reference images.
- **Generation Time**: 15-20 seconds per thumbnail (Google API latency)
- **No Real-time Updates**: Refresh job history to see status changes
- **Single User**: No authentication system (add before production deployment)

## 📚 Key Learnings

### Lesson 1: SDK Confusion
- ❌ Wrong: `@google/generative-ai` (text generation)
- ✅ Correct: `@google/genai` (image generation)

### Lesson 2: Character Consistency
- ❌ Vague descriptions = inconsistent results
- ✅ 200-word detailed descriptions = consistent character

### Lesson 3: Safety Filters
- ❌ Persona photos = content blocks
- ✅ Archetype-only + text descriptions = success

### Lesson 4: Prisma Version
- Prisma 7 requires complex adapter configuration
- Downgraded to Prisma 5 for simpler SQLite integration

## 🚢 Deployment Checklist

Before deploying to production:

- [ ] Add authentication (NextAuth.js recommended)
- [ ] Implement rate limiting (express-rate-limit or similar)
- [ ] Add error tracking (Sentry or similar)
- [ ] Set up monitoring (Vercel Analytics or similar)
- [ ] Configure CORS properly
- [ ] Add database backups
- [ ] Set up CI/CD pipeline
- [ ] Review and harden API security
- [ ] Add logging (Winston or Pino)
- [ ] Configure CSP headers

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Google AI for the Nano Banana API (gemini-3-pro-image-preview)
- Next.js team for the amazing framework
- Prisma team for the excellent ORM

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review CLAUDE.md for technical details

---

Built with ❤️ for YouTube creators who need consistent, high-quality thumbnails at scale.
