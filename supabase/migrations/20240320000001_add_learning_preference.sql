-- Add learning_preference column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS learning_preference TEXT CHECK (learning_preference IN ('ai_conversations', 'videos')); 