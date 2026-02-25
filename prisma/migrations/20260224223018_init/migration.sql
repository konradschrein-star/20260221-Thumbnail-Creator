-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "personaDescription" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "archetypes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "layoutInstructions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "archetypes_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "archetypeId" TEXT NOT NULL,
    "videoTopic" TEXT NOT NULL,
    "thumbnailText" TEXT NOT NULL,
    "customPrompt" TEXT,
    "outputUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "generation_jobs_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "generation_jobs_archetypeId_fkey" FOREIGN KEY ("archetypeId") REFERENCES "archetypes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "generation_jobs_channelId_idx" ON "generation_jobs"("channelId");

-- CreateIndex
CREATE INDEX "generation_jobs_archetypeId_idx" ON "generation_jobs"("archetypeId");

-- CreateIndex
CREATE INDEX "generation_jobs_status_idx" ON "generation_jobs"("status");
