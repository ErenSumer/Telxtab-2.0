-- Add last_sign_in_at column to profiles table
ALTER TABLE public.profiles
ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX idx_profiles_last_sign_in_at ON public.profiles(last_sign_in_at);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.last_sign_in_at IS 'Timestamp of the user''s last sign in, updated by auth trigger';

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;

-- Create a function to update last_sign_in_at
CREATE OR REPLACE FUNCTION public.handle_user_auth_sign_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_sign_in_at = now()
  WHERE id = new.id;
  RETURN new;
END;
$$;

-- Create a trigger on auth.users table
CREATE TRIGGER on_auth_user_signed_in
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
WHEN (old.last_sign_in_at IS DISTINCT FROM new.last_sign_in_at)
EXECUTE FUNCTION public.handle_user_auth_sign_in(); 