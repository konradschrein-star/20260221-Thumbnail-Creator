-- =============================================================================
-- AI Thumbnail Rendering Farm - Database Initialization
-- =============================================================================
-- This script runs on container startup to initialize the PostgreSQL database
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Try to enable pgvector (may not be available in all environments)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available, similarity search will be disabled';
END $$;

-- =============================================================================
-- Jobs Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS thumbnail_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    video_title TEXT NOT NULL,
    video_description TEXT,
    reference_thumbnail_url TEXT,
    num_variants INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    message TEXT,
    error TEXT,
    metadata JSONB DEFAULT '{}',
    variants JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    is_regeneration BOOLEAN DEFAULT FALSE,
    original_job_id VARCHAR(255)
);

-- Indexes for jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_status ON thumbnail_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_channel ON thumbnail_jobs(channel_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON thumbnail_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON thumbnail_jobs(status, created_at);

-- =============================================================================
-- Generated Thumbnails Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS generated_thumbnails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(255) NOT NULL REFERENCES thumbnail_jobs(job_id) ON DELETE CASCADE,
    variant_id VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, variant_id)
);

-- Indexes for thumbnails table
CREATE INDEX IF NOT EXISTS idx_thumbnails_job ON generated_thumbnails(job_id);
CREATE INDEX IF NOT EXISTS idx_thumbnails_created ON generated_thumbnails(created_at);

-- =============================================================================
-- Channels Table (for caching channel info)
-- =============================================================================
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id VARCHAR(255) UNIQUE NOT NULL,
    channel_name VARCHAR(500),
    logo_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);

-- =============================================================================
-- Updated At Trigger Function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
DROP TRIGGER IF EXISTS update_thumbnail_jobs_updated_at ON thumbnail_jobs;
CREATE TRIGGER update_thumbnail_jobs_updated_at
    BEFORE UPDATE ON thumbnail_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Views for Monitoring
-- =============================================================================

-- Job statistics view
CREATE OR REPLACE VIEW job_statistics AS
SELECT
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) 
        FILTER (WHERE status = 'completed') as avg_processing_time_seconds,
    MAX(created_at) as last_job_created
FROM thumbnail_jobs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Channel activity view
CREATE OR REPLACE VIEW channel_activity AS
SELECT
    channel_id,
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
    MAX(created_at) as last_activity
FROM thumbnail_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY channel_id
ORDER BY last_activity DESC;

-- =============================================================================
-- Grant Permissions (if using dedicated user)
-- =============================================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO thumbnail_farm_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO thumbnail_farm_user;
