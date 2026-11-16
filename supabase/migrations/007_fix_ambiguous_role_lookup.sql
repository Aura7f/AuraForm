-- Avoid PL/pgSQL argument names colliding with table columns in role checks.
-- Apply this migration to existing projects before creating forms.

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF $1 IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = $1
      AND profile.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $migration$
DECLARE
  argument_names TEXT[];
BEGIN
  SELECT proargnames
  INTO argument_names
  FROM pg_proc
  WHERE oid = 'public.can_manage_form(uuid,uuid)'::regprocedure;

  IF argument_names IS NULL OR array_length(argument_names, 1) < 2 THEN
    RAISE EXCEPTION 'Could not determine can_manage_form argument names.';
  END IF;

  EXECUTE format($function$
    CREATE OR REPLACE FUNCTION public.can_manage_form(%I UUID, %I UUID)
    RETURNS BOOLEAN AS $body$
    BEGIN
      IF $1 IS NULL OR $2 IS NULL THEN
        RETURN false;
      END IF;

      IF public.is_admin($1) THEN
        RETURN true;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        WHERE profile.id = $1
          AND profile.role = 'organizer'
      ) THEN
        RETURN false;
      END IF;

      RETURN EXISTS (
        SELECT 1
        FROM public.forms AS form
        WHERE form.id = $2
          AND form.created_by = $1
      ) OR EXISTS (
        SELECT 1
        FROM public.form_collaborators AS collaborator
        WHERE collaborator.form_id = $2
          AND collaborator.user_id = $1
          AND collaborator.role = 'editor'
      );
    END;
    $body$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
  $function$, argument_names[1], argument_names[2]);
END;
$migration$;
