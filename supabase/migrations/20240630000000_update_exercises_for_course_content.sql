-- Migration to update the database schema for exercises integrated within the course content

-- 1. Add course_id to exercises table
ALTER TABLE public.exercises
ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- Backfill course_id using the lesson relationship
UPDATE public.exercises e
SET course_id = (
  SELECT course_id 
  FROM public.lessons l 
  WHERE l.id = e.lesson_id
);

-- Create index for faster lookups
CREATE INDEX idx_exercises_course_id ON public.exercises(course_id);

-- 2. Create course_content table to track the order of all content (lessons and exercises)
CREATE TABLE public.course_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  content_id UUID NOT NULL, -- Can be a lesson_id or exercise_id
  content_type TEXT NOT NULL CHECK (content_type IN ('lesson', 'exercise')),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add index for faster lookup
CREATE INDEX idx_course_content_course_id ON public.course_content(course_id);
CREATE INDEX idx_course_content_content_id ON public.course_content(content_id);
CREATE INDEX idx_course_content_order_index ON public.course_content(order_index);

-- Add triggers for updated_at
CREATE TRIGGER update_course_content_updated_at
  BEFORE UPDATE ON public.course_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Seed the course_content table with existing lessons
INSERT INTO public.course_content (course_id, content_id, content_type, order_index)
SELECT 
  course_id, 
  id AS content_id, 
  'lesson' AS content_type, 
  order_index
FROM public.lessons
ORDER BY course_id, order_index;

-- 4. Add order_index to exercises if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercises' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.exercises ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 5. Set up RLS policies
ALTER TABLE public.course_content ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view course content
CREATE POLICY "Anyone can view course content" 
  ON public.course_content 
  FOR SELECT 
  USING (true);

-- Only allow admins to insert, update, or delete course content
CREATE POLICY "Only admins can modify course content" 
  ON public.course_content 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Grant permissions
GRANT SELECT ON public.course_content TO public;
GRANT ALL ON public.course_content TO authenticated; 