-- Allow admins and organizers who can manage a form to correct its answers.
-- Response IDs, submission timestamps, and respondent identity remain unchanged.

CREATE OR REPLACE FUNCTION public.update_form_response_answers(
  target_response_id UUID,
  target_answers JSONB
)
RETURNS VOID AS $$
DECLARE
  response_form_id UUID;
  answer_entry RECORD;
  target_question_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to edit responses.';
  END IF;
  IF target_answers IS NULL OR jsonb_typeof(target_answers) <> 'object' THEN
    RAISE EXCEPTION 'Response answers must be a JSON object.';
  END IF;

  SELECT response.form_id
  INTO response_form_id
  FROM public.responses AS response
  WHERE response.id = target_response_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Response not found.';
  END IF;
  IF NOT public.can_manage_form(auth.uid(), response_form_id) THEN
    RAISE EXCEPTION 'You are not allowed to edit responses for this form.';
  END IF;

  FOR answer_entry IN
    SELECT entry.key, entry.value
    FROM jsonb_each(target_answers) AS entry
  LOOP
    BEGIN
      target_question_id := answer_entry.key::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid question id in response answers.';
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM public.questions AS question
      WHERE question.id = target_question_id
        AND question.form_id = response_form_id
    ) THEN
      RAISE EXCEPTION 'Question does not belong to this response form.';
    END IF;

    UPDATE public.answers AS answer
    SET value = answer_entry.value
    WHERE answer.response_id = target_response_id
      AND answer.question_id = target_question_id;

    IF NOT FOUND THEN
      INSERT INTO public.answers (response_id, question_id, value)
      VALUES (target_response_id, target_question_id, answer_entry.value);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.update_form_response_answers(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_form_response_answers(UUID, JSONB) TO authenticated;
