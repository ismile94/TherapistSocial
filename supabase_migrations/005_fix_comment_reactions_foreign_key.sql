-- Fix comment_reactions foreign key constraint
-- The foreign key currently references post_replies, but should reference post_comments

-- First, drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_reactions_comment_id_fkey'
        AND table_name = 'comment_reactions'
    ) THEN
        ALTER TABLE comment_reactions 
        DROP CONSTRAINT comment_reactions_comment_id_fkey;
    END IF;
END $$;

-- Clean up orphaned records: Delete reactions that reference comments not in post_comments
DELETE FROM comment_reactions
WHERE comment_id NOT IN (
    SELECT id FROM post_comments
);

-- Now add the correct foreign key constraint to post_comments
ALTER TABLE comment_reactions
ADD CONSTRAINT comment_reactions_comment_id_fkey 
FOREIGN KEY (comment_id) 
REFERENCES post_comments(id) 
ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate reactions (if not exists)
DO $$ 
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_reactions_user_comment_reaction_unique'
        AND table_name = 'comment_reactions'
    ) THEN
        -- Add unique constraint on (user_id, comment_id, reaction_type)
        ALTER TABLE comment_reactions
        ADD CONSTRAINT comment_reactions_user_comment_reaction_unique 
        UNIQUE (user_id, comment_id, reaction_type);
    END IF;
END $$;

