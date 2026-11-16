-- Restrict viewing and changing member roles to administrators.
-- Apply this migration to projects that already ran migration 005.

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email := OLD.email;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF LOWER(OLD.email) = LOWER('arujagadeesh801@gmail.com') AND NEW.role <> 'admin' THEN
      RAISE EXCEPTION 'The designated administrator role cannot be changed.';
    END IF;
    IF NEW.role = 'admin' AND LOWER(OLD.email) <> LOWER('arujagadeesh801@gmail.com') THEN
      RAISE EXCEPTION 'Only the designated account can be an administrator.';
    END IF;

    IF auth.uid() IS NULL THEN
      IF NOT (
        LOWER(OLD.email) = LOWER('arujagadeesh801@gmail.com')
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

CREATE OR REPLACE FUNCTION public.set_member_role(
  target_user_id UUID,
  target_role public.user_role
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can assign member roles.';
  END IF;
  IF target_role NOT IN ('organizer', 'user') THEN
    RAISE EXCEPTION 'The administrator role is fixed and cannot be assigned.';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own role.';
  END IF;

  UPDATE public.profiles
  SET role = target_role, updated_at = now()
  WHERE id = target_user_id
    AND LOWER(email) <> LOWER('arujagadeesh801@gmail.com')
    AND (public.is_admin(auth.uid()) OR role <> 'admin');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found or role cannot be changed.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.set_member_role(UUID, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, public.user_role) TO authenticated;
