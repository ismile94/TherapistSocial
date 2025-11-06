-- Add missing columns to notifications table for enhanced notification system

-- Add type column (e.g., 'post_reaction', 'comment', 'comment_reaction', 'connection_request', etc.)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add related_entity_type column (e.g., 'post', 'comment', 'user')
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_entity_type TEXT;

-- Add related_entity_id column (stores the ID of the related post, comment, or user)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_entity_id UUID;

-- Add metadata column for additional JSON data (e.g., comment_id, post_id, parent_comment_id)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add title column for notification title
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS title TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN notifications.type IS 'Type of notification: post_reaction, comment, comment_reaction, connection_request, etc.';
COMMENT ON COLUMN notifications.related_entity_type IS 'Type of related entity: post, comment, user, etc.';
COMMENT ON COLUMN notifications.related_entity_id IS 'UUID of the related entity (post_id, comment_id, user_id, etc.)';
COMMENT ON COLUMN notifications.metadata IS 'Additional JSON metadata for the notification';
COMMENT ON COLUMN notifications.title IS 'Notification title/heading';
