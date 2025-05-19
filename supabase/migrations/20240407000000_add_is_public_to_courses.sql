-- Add is_public column to courses table
ALTER TABLE public.courses
ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Update existing courses to be public by default
UPDATE public.courses
SET is_public = true
WHERE is_public IS NULL; 