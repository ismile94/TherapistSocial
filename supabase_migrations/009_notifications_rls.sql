-- Enable RLS and add policies for notifications table

-- Enable Row Level Security on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can insert notifications'
  ) THEN
    DROP POLICY "Users can insert notifications" ON notifications;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view their notifications'
  ) THEN
    DROP POLICY "Users can view their notifications" ON notifications;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update their notifications'
  ) THEN
    DROP POLICY "Users can update their notifications" ON notifications;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can delete their notifications'
  ) THEN
    DROP POLICY "Users can delete their notifications" ON notifications;
  END IF;
END $$;

-- Allow any authenticated user to insert a notification (sender-side)
CREATE POLICY "Users can insert notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view only their notifications
CREATE POLICY "Users can view their notifications"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update only their notifications (mark read/clicked)
CREATE POLICY "Users can update their notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to delete only their notifications
CREATE POLICY "Users can delete their notifications"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
