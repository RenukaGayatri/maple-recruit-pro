CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS education_status text;

CREATE TABLE IF NOT EXISTS public.assessment_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  education_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.assessment_candidates(id) ON DELETE CASCADE,
  assessment_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS public.assessment_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  selected_answer text,
  is_correct boolean NOT NULL DEFAULT false,
  time_taken integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  score integer,
  percentage integer,
  ai_score integer,
  recommendation text,
  strengths text[],
  weaknesses text[],
  summary text,
  skill_level text,
  suitable_job_roles text[]
);

CREATE INDEX IF NOT EXISTS assessment_candidates_email_idx ON public.assessment_candidates (email);
CREATE INDEX IF NOT EXISTS assessment_attempts_candidate_status_idx ON public.assessment_attempts (candidate_id, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS assessment_answers_attempt_question_idx ON public.assessment_answers (attempt_id, question_id);
CREATE INDEX IF NOT EXISTS assessment_scores_attempt_idx ON public.assessment_scores (attempt_id);

ALTER TABLE public.assessment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.assessment_candidates TO service_role;
GRANT ALL ON public.assessment_attempts TO service_role;
GRANT ALL ON public.assessment_answers TO service_role;
GRANT ALL ON public.assessment_scores TO service_role;

CREATE POLICY assessment_candidates_service_role_policy ON public.assessment_candidates
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY assessment_attempts_service_role_policy ON public.assessment_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY assessment_answers_service_role_policy ON public.assessment_answers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY assessment_scores_service_role_policy ON public.assessment_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);
