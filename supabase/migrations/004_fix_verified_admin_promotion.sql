-- Allow the trusted auth.users verification trigger to promote only the
-- designated, verified administrator while keeping client role changes locked.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email := OLD.email;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF LOWER(NEW.email) = LOWER('arujagadeesh801@gmail.com') AND NEW.role <> 'admin' THEN
      RAISE EXCEPTION 'The designated administrator role cannot be changed.';
    END IF;
    IF NEW.role = 'admin' AND LOWER(NEW.email) <> LOWER('arujagadeesh801@gmail.com') THEN
      RAISE EXCEPTION 'Only the designated account can be an administrator.';
    END IF;

    IF auth.uid() IS NULL THEN
      IF NOT (
        LOWER(NEW.email) = LOWER('arujagadeesh801@gmail.com')
        AND NEW.role = 'admin'
        AND EXISTS (
          SELECT 1
          FROM auth.users
          WHERE id = NEW.id
            AND email_confirmed_at IS NOT NULL
        )
      ) THEN
        NEW.role := OLD.role;
      END IF;
    ELSIF NOT public.is_admin(auth.uid()) THEN
      NEW.role := OLD.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profiles_role_trigger ON public.profiles;
CREATE TRIGGER protect_profiles_role_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
