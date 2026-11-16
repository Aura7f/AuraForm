-- Let regular users request organizer access and let only admins review requests.

CREATE TABLE IF NOT EXISTS public.organizer_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizer_access_requests_one_pending_per_user
  ON public.organizer_access_requests(user_id)
  WHERE status = 'pending';

ALTER TABLE public.organizer_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own organizer access requests" ON public.organizer_access_requests;
CREATE POLICY "Users can view own organizer access requests"
  ON public.organizer_access_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

REVOKE ALL ON public.organizer_access_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.organizer_access_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.request_organizer_access()
RETURNS UUID AS $$
DECLARE
  new_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in before requesting organizer access.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'user'
  ) THEN
    RAISE EXCEPTION 'Only regular users can request organizer access.';
  END IF;

  BEGIN
    INSERT INTO public.organizer_access_requests (user_id)
    VALUES (auth.uid())
    RETURNING id INTO new_request_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You already have a pending organizer access request.';
  END;

  RETURN new_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.request_organizer_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_organizer_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.review_organizer_access_request(
  target_request_id UUID,
  should_approve BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can review organizer access requests.';
  END IF;

  SELECT request.user_id
  INTO target_user_id
  FROM public.organizer_access_requests AS request
  WHERE request.id = target_request_id
    AND request.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending organizer access request not found.';
  END IF;

  IF should_approve THEN
    UPDATE public.profiles AS profile
    SET role = 'organizer', updated_at = now()
    WHERE profile.id = target_user_id
      AND profile.role = 'user';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'The requester is no longer eligible for organizer access.';
    END IF;
  END IF;

  UPDATE public.organizer_access_requests AS request
  SET status = CASE WHEN should_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE request.id = target_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.review_organizer_access_request(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_organizer_access_request(UUID, BOOLEAN) TO authenticated;
