-- Update notifications table to add clicked_at field for tracking notification clicks

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on clicked_at
CREATE INDEX IF NOT EXISTS idx_notifications_clicked_at ON notifications(clicked_at);

-- Comment
COMMENT ON COLUMN notifications.clicked_at IS 'Timestamp when notification was clicked (for 24-hour reminder feature)';

