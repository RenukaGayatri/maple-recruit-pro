
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  role text,
  mcq_answers jsonb,
  descriptive_answer text,
  mcq_score integer,
  descriptive_score integer,
  total_score integer,
  percentage numeric,
  status text,
  ai_evaluation jsonb,
  ai_summary text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE INDEX candidates_created_at_idx ON public.candidates (created_at DESC);
