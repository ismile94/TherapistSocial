-- Update user_settings table to include new columns for enhanced Settings & Privacy features

-- Add new notification settings columns
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS email_post_reactions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_comments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_mentions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_events BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_post_reactions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_mentions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_events BOOLEAN DEFAULT true;

-- Add 2FA related columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Add privacy control columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS activity_status_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS search_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_view_tracking BOOLEAN DEFAULT true;

-- Add quiet hours columns
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00';

-- Add blocked users array (stores array of user UUIDs)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS blocked_users UUID[] DEFAULT '{}';

-- Create index on blocked_users for faster queries (PostgreSQL array operations)
CREATE INDEX IF NOT EXISTS idx_user_settings_blocked_users ON user_settings USING GIN(blocked_users);

-- Update comment
COMMENT ON COLUMN user_settings.blocked_users IS 'Array of blocked user IDs';
COMMENT ON COLUMN user_settings.two_factor_secret IS 'TOTP secret for two-factor authentication';
COMMENT ON COLUMN user_settings.quiet_hours_start IS 'Start time for quiet hours (no notifications)';
COMMENT ON COLUMN user_settings.quiet_hours_end IS 'End time for quiet hours (no notifications)';

