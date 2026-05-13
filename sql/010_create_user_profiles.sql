-- User profile table required by profile and admin user-management screens.
-- Intel DB already has auth users and user_roles; this creates the missing
-- public profile table expected by the application and backfills existing users.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  department text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.user_profiles (id, email, display_name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data ->> 'name', ''),
    NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
    split_part(u.email, '@', 1)
  ) AS display_name,
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = COALESCE(public.user_profiles.display_name, EXCLUDED.display_name),
  updated_at = now();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage profiles"
  ON public.user_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role = 'admin'
    )
  );
