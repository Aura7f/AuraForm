-- AuraForm email authentication and member role controls.
-- Run this migration in the Supabase SQL Editor after migration 002.

-- Existing accounts become form respondents by default. The fixed, verified
-- fixed, verified account remains the only administrator; organizers are reassigned by it.
DROP TRIGGER IF EXISTS protect_profiles_role_trigger ON public.profiles;

UPDATE public.profiles AS profile
SET role = CASE
  WHEN LOWER(profile.email) = LOWER('arujagadeesh801@gmail.com')
    AND EXISTS (
      SELECT 1
      FROM auth.users AS auth_user
      WHERE auth_user.id = profile.id
        AND auth_user.email_confirmed_at IS NOT NULL
    )
    THEN 'admin'::public.user_role
  ELSE 'user'::public.user_role
END,
updated_at = now();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role := 'user';
BEGIN
  IF LOWER(NEW.email) = LOWER('arujagadeesh801@gmail.com')
    AND NEW.email_confirmed_at IS NOT NULL THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
      role = CASE
        WHEN LOWER(EXCLUDED.email) = LOWER('arujagadeesh801@gmail.com')
          AND NEW.email_confirmed_at IS NOT NULL
          THEN 'admin'::public.user_role
        WHEN LOWER(EXCLUDED.email) = LOWER('arujagadeesh801@gmail.com')
          THEN 'user'::public.user_role
        ELSE public.profiles.role
      END,
      updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_user_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF LOWER(NEW.email) = LOWER('arujagadeesh801@gmail.com')
    AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'admin', updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    RAISE EXCEPTION 'Only the administrator can assign member roles.';
  END IF;
  IF target_role NOT IN ('organizer', 'user') THEN
    RAISE EXCEPTION 'The administrator role is fixed and cannot be assigned.';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'The administrator role cannot be changed.';
  END IF;

  UPDATE public.profiles
  SET role = target_role, updated_at = now()
  WHERE id = target_user_id
    AND LOWER(email) <> LOWER('arujagadeesh801@gmail.com');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found or role cannot be changed.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.set_member_role(UUID, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, public.user_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_form(p_user_id UUID, p_form_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL OR p_form_id IS NULL THEN
    RETURN false;
  END IF;
  IF public.is_admin(p_user_id) THEN
    RETURN true;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'organizer'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = p_form_id AND created_by = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.form_collaborators
    WHERE form_id = p_form_id AND user_id = p_user_id AND role = 'editor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Organizers and Admins can create forms" ON public.forms;
CREATE POLICY "Organizers and Admins can create forms"
  ON public.forms FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

DROP POLICY IF EXISTS "Anyone can submit response to published public forms" ON public.responses;
CREATE POLICY "Google users can submit responses to published public forms"
  ON public.responses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = respondent_id
    AND LOWER(respondent_email) = LOWER(auth.jwt()->>'email')
    AND EXISTS (
      SELECT 1 FROM public.forms
      WHERE forms.id = responses.form_id
        AND forms.status = 'published'
        AND forms.is_public = true
        AND (forms.deadline IS NULL OR forms.deadline > now())
    )
  );

DROP POLICY IF EXISTS "Anyone can submit answers linked to their response" ON public.answers;
CREATE POLICY "Google respondents can submit answers to their response"
  ON public.answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.responses
      JOIN public.questions ON questions.id = answers.question_id
      JOIN public.forms ON forms.id = responses.form_id
      WHERE responses.id = answers.response_id
        AND responses.respondent_id = auth.uid()
        AND questions.form_id = responses.form_id
        AND forms.status = 'published'
        AND forms.is_public = true
    )
  );

DROP POLICY IF EXISTS "Anyone can register for published event forms" ON public.event_registrations;
CREATE POLICY "Google users can register for published event forms"
  ON public.event_registrations FOR INSERT TO authenticated
  WITH CHECK (
    LOWER(participant_email) = LOWER(auth.jwt()->>'email')
    AND EXISTS (
      SELECT 1
      FROM public.responses
      JOIN public.forms ON forms.id = responses.form_id
      WHERE responses.id = event_registrations.response_id
        AND responses.form_id = event_registrations.form_id
        AND responses.respondent_id = auth.uid()
        AND forms.status = 'published'
        AND forms.is_public = true
        AND forms.is_event = true
    )
  );
