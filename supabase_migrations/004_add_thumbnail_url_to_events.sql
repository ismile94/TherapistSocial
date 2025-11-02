-- Add thumbnail_url column to events table if it doesn't exist
-- This migration ensures the thumbnail_url column exists even if the initial migration
-- was run before this column was added, or if the schema needs to be updated

ALTER TABLE events
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN events.thumbnail_url IS 'Optional thumbnail image URL for the event';

