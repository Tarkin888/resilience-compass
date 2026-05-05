
ALTER TABLE public.thresholds ADD COLUMN IF NOT EXISTS rationale text;
ALTER TABLE public.thresholds ADD COLUMN IF NOT EXISTS trust_override_value numeric;
ALTER TABLE public.thresholds ADD COLUMN IF NOT EXISTS trust_override_source text;
ALTER TABLE public.thresholds ADD COLUMN IF NOT EXISTS trust_override_captured_at timestamptz;

ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS simulate_failure boolean NOT NULL DEFAULT false;

UPDATE public.thresholds SET rationale =
  'Working benchmark of 4.2% reflects the long-run pre-pandemic average for the NHS provider sector (Apr 2009 – Feb 2020). Values above this benchmark indicate sickness absence is running higher than the historical norm; values 20% above (i.e. ≥5.04%) are treated as Critical because they correspond to the upper tail of the pre-pandemic distribution.'
WHERE kri_id = 'sickness_absence';

UPDATE public.thresholds SET rationale =
  'Working benchmark of 8.5% reflects the average quarterly vacancy rate across the eight pre-pandemic quarters (2018/19 Q1 – 2019/20 Q4). Values above this benchmark indicate vacancies are running higher than the historical norm; values 20% above (i.e. ≥10.2%) are treated as Critical.'
WHERE kri_id = 'vacancy';
