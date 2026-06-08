
-- 1. kri_captures: period date + backfill flag
ALTER TABLE public.kri_captures
  ADD COLUMN IF NOT EXISTS period_date date,
  ADD COLUMN IF NOT EXISTS is_backfill boolean NOT NULL DEFAULT false;

-- 2. thresholds: effective-dating (forward-proofing)
ALTER TABLE public.thresholds
  ADD COLUMN IF NOT EXISTS valid_from date NOT NULL DEFAULT DATE '2018-01-01',
  ADD COLUMN IF NOT EXISTS valid_to date;

-- 3. score_history table
CREATE TABLE IF NOT EXISTS public.score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('kri','indicator','pillar','dashboard')),
  entity_id text NOT NULL,
  snapshot_date date NOT NULL,
  raw_value numeric,
  normalised_score numeric NOT NULL,
  rag_band text NOT NULL CHECK (rag_band IN ('red','amber','green')),
  target numeric,
  min_threshold numeric,
  method_version text NOT NULL DEFAULT 'v1-2026-06',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, snapshot_date, method_version)
);

CREATE INDEX IF NOT EXISTS score_history_lookup_idx
  ON public.score_history (entity_type, entity_id, snapshot_date);

GRANT SELECT ON public.score_history TO anon, authenticated;
GRANT ALL ON public.score_history TO service_role;

ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_history readable"
  ON public.score_history FOR SELECT
  TO public
  USING (true);
