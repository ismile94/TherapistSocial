-- Enable RLS on comment_reactions table
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own comment reactions" ON comment_reactions;
DROP POLICY IF EXISTS "Users can view all comment reactions" ON comment_reactions;
DROP POLICY IF EXISTS "Users can delete their own comment reactions" ON comment_reactions;
DROP POLICY IF EXISTS "Users can update their own comment reactions" ON comment_reactions;

-- Policy: Users can insert their own reactions
CREATE POLICY "Users can insert their own comment reactions"
ON comment_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view all reactions
CREATE POLICY "Users can view all comment reactions"
ON comment_reactions
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can delete their own reactions
CREATE POLICY "Users can delete their own comment reactions"
ON comment_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own reactions
CREATE POLICY "Users can update their own comment reactions"
ON comment_reactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

