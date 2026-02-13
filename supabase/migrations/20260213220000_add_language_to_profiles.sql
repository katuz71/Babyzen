-- Add language column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS language text 
DEFAULT 'en' 
CHECK (language IN ('ru', 'en', 'es'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_language 
ON profiles(language);
