-- Add last_sign_in_at column to profiles table
ALTER TABLE public.profiles
ADD COLUMN last_sign_in_at timestamp with time zone NULL DEFAULT NULL;

-- Create an index for better query performance
CREATE INDEX idx_profiles_last_sign_in_at ON public.profiles(last_sign_in_at);

-- Comment on the new column
COMMENT ON COLUMN public.profiles.last_sign_in_at IS 'Timestamp of the user''s last sign in'; 