-- Add last_activity_date column to streaks table
ALTER TABLE public.streaks 
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows
UPDATE public.streaks 
SET last_activity_date = updated_at 
WHERE last_activity_date IS NULL;

-- Modify the update_updated_at_column trigger function to also update last_activity_date
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_activity_date = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql'; 