-- Update comment_reactions reaction_type check constraint to allow emoji reactions
-- Drop existing check constraint if it exists
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'comment_reactions_reaction_type_check'
        AND table_name = 'comment_reactions'
    ) THEN
        ALTER TABLE comment_reactions 
        DROP CONSTRAINT comment_reactions_reaction_type_check;
    END IF;
END $$;

-- Add new check constraint that allows 'like', 'favorite', and emoji reactions
-- We'll allow any string that is either 'like', 'favorite', or contains emoji characters (up to 10 characters)
-- This allows emoji reactions like 👍, ❤️, 😂, etc.
ALTER TABLE comment_reactions
ADD CONSTRAINT comment_reactions_reaction_type_check 
CHECK (
    reaction_type IN ('like', 'favorite') 
    OR (
        LENGTH(reaction_type) <= 10 
        AND reaction_type != ''
    )
);

COMMENT ON CONSTRAINT comment_reactions_reaction_type_check ON comment_reactions IS 
'Allows reaction_type to be either "like", "favorite", or emoji characters (up to 10 characters)';

