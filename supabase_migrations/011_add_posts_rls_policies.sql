-- Add RLS policies for posts table to allow read access

-- Enable RLS on posts table (if not already enabled)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Anyone can view posts'
  ) THEN
    DROP POLICY "Anyone can view posts" ON posts;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Users can insert their posts'
  ) THEN
    DROP POLICY "Users can insert their posts" ON posts;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Users can update their posts'
  ) THEN
    DROP POLICY "Users can update their posts" ON posts;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'posts' AND policyname = 'Users can delete their posts'
  ) THEN
    DROP POLICY "Users can delete their posts" ON posts;
  END IF;
END $$;

-- Allow anyone (authenticated or not) to view posts
CREATE POLICY "Anyone can view posts"
ON posts
FOR SELECT
USING (true);

-- Allow authenticated users to insert their own posts
CREATE POLICY "Users can insert their posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Users can update their posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their posts"
ON posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure profiles table also has proper read access
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Anyone can view profiles'
  ) THEN
    DROP POLICY "Anyone can view profiles" ON profiles;
  END IF;
END $$;

-- Allow anyone to view profiles (needed for posts.user:profiles(*) join)
CREATE POLICY "Anyone can view profiles"
ON profiles
FOR SELECT
USING (true);
