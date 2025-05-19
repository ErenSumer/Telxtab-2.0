-- Migration to award XP for completed lessons
-- This will grant 100 XP for each completed lesson to users who haven't received them yet

-- First, let's ensure the xp column exists in the profiles table (in case it was added after some users were created)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'xp') THEN
        ALTER TABLE public.profiles ADD COLUMN xp INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Create a temporary table to store the total XP to award each user
CREATE TEMP TABLE xp_to_award AS
SELECT 
    user_id,
    COUNT(*) * 100 AS xp_amount
FROM 
    public.user_progress
WHERE 
    completed = true
GROUP BY 
    user_id;

-- Update the profiles table to add XP for completed lessons
UPDATE public.profiles p
SET xp = COALESCE(p.xp, 0) + t.xp_amount
FROM xp_to_award t
WHERE p.id = t.user_id;

-- Log the XP awards for auditing purposes
CREATE TABLE IF NOT EXISTS public.xp_award_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert records into the log table
INSERT INTO public.xp_award_logs (user_id, amount, reason)
SELECT 
    user_id,
    xp_amount,
    'Migration: Award for previously completed lessons'
FROM 
    xp_to_award;

-- Drop the temporary table
DROP TABLE xp_to_award;

-- Create or replace the increment_user_xp function to ensure it exists for future XP awards
CREATE OR REPLACE FUNCTION public.increment_user_xp(
    p_user_id UUID,
    p_xp_amount INTEGER
) RETURNS void AS $$
BEGIN
    -- Update the user's XP
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + p_xp_amount
    WHERE id = p_user_id;
    
    -- Log the XP award
    INSERT INTO public.xp_award_logs (user_id, amount, reason)
    VALUES (p_user_id, p_xp_amount, 'Lesson completion');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_user_xp(UUID, INTEGER) TO authenticated; 