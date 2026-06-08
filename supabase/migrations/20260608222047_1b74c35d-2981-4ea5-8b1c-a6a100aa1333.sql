
CREATE UNIQUE INDEX IF NOT EXISTS kri_captures_unique_period
  ON public.kri_captures (kri_id, period_date)
  WHERE period_date IS NOT NULL;
