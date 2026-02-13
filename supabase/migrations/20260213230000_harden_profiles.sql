-- =====================================================================
-- PART 1: Create profiles table with full schema
-- =====================================================================

-- Create profiles table if missing (minimal schema for initial creation)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================================
-- PART 1.1: Schema alignment (safe for existing tables)
-- =====================================================================
-- Add all expected columns if they don't exist
-- This ensures the migration works both for new and existing tables

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS baby_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS baby_dob date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS baby_height_cm integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS baby_weight_kg numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free';

-- Add CHECK constraint for language (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_language_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_language_check
    CHECK (language IN ('ru', 'en', 'es'));
  END IF;
END $$;

-- =====================================================================
-- PART 1.2: Enable RLS and create policy (idempotent)
-- =====================================================================

-- Enable RLS (safe to run multiple times)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users manage own profile'
  ) THEN
    CREATE POLICY "Users manage own profile"
    ON profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- =====================================================================
-- PART 2: Automatic profile creation trigger
-- =====================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (new.id, now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- PART 3: Create index for language column (idempotent)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_language 
ON profiles(language);

-- =====================================================================
-- PART 4: Ensure existing users have profiles
-- =====================================================================

-- Backfill profiles for any existing users without a profile
INSERT INTO public.profiles (id, created_at, updated_at)
SELECT 
  au.id,
  now(),
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
