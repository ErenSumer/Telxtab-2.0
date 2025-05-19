-- Add study_hours column to profiles table
ALTER TABLE public.profiles
ADD COLUMN study_hours INTEGER DEFAULT 0 NOT NULL;

-- Create a function to increment study hours
CREATE OR REPLACE FUNCTION increment_study_hours(
    user_id UUID,
    seconds_studied INTEGER
)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET study_hours = study_hours + (seconds_studied / 3600)
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 