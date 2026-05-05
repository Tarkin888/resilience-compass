
-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- sources
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id text UNIQUE NOT NULL,
  publisher text NOT NULL,
  publication_name text NOT NULL,
  series_landing_page_url text NOT NULL,
  edition_page_url_pattern text NOT NULL,
  update_cadence text NOT NULL,
  file_format text NOT NULL DEFAULT 'xlsx',
  last_known_file_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources readable" ON public.sources FOR SELECT USING (true);
CREATE TRIGGER trg_sources_updated BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- thresholds
CREATE TABLE public.thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id text NOT NULL REFERENCES public.sources(kri_id) ON DELETE CASCADE,
  threshold_type text NOT NULL DEFAULT 'less_than',
  threshold_value numeric NOT NULL,
  units text NOT NULL DEFAULT 'percent',
  methodology_label text NOT NULL,
  methodology_long text,
  methodology_window_start text,
  methodology_window_end text,
  methodology_n integer,
  is_official_nhs_target boolean NOT NULL DEFAULT false,
  qualifier_label text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thresholds readable" ON public.thresholds FOR SELECT USING (true);
CREATE TRIGGER trg_thresholds_updated BEFORE UPDATE ON public.thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- kri_captures
CREATE TABLE public.kri_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id text NOT NULL,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  edition_label text NOT NULL,
  edition_page_url text NOT NULL,
  file_source_url text,
  file_size_bytes integer,
  file_sha256 text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  headline_value numeric,
  headline_unit text,
  prior_value numeric,
  raw_extract jsonb
);
CREATE INDEX idx_kri_captures_kri_captured ON public.kri_captures(kri_id, captured_at DESC);
ALTER TABLE public.kri_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kri_captures readable" ON public.kri_captures FOR SELECT USING (true);

-- capture_log
CREATE TABLE public.capture_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id text NOT NULL,
  attempt_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL,
  error_detail text,
  linked_capture_id uuid REFERENCES public.kri_captures(id) ON DELETE SET NULL
);
CREATE INDEX idx_capture_log_kri_attempt ON public.capture_log(kri_id, attempt_at DESC);
ALTER TABLE public.capture_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capture_log readable" ON public.capture_log FOR SELECT USING (true);

-- kri_definitions
CREATE TABLE public.kri_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id text UNIQUE NOT NULL,
  display_name text NOT NULL,
  is_live boolean NOT NULL DEFAULT false,
  illustrative_value numeric,
  illustrative_target numeric,
  illustrative_status text,
  illustrative_trend text,
  description text,
  display_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.kri_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kri_definitions readable" ON public.kri_definitions FOR SELECT USING (true);

-- Seed data
INSERT INTO public.sources (kri_id, publisher, publication_name, series_landing_page_url, edition_page_url_pattern, update_cadence, file_format) VALUES
('vacancy', 'NHS England (NHS Digital)', 'NHS Vacancy Statistics, England — Experimental Statistics',
 'https://digital.nhs.uk/data-and-information/publications/statistical/nhs-vacancies-survey',
 '/nhs-vacancies-survey/april-2015---{month}-{year}-experimental-statistics', 'quarterly', 'xlsx'),
('sickness_absence', 'NHS England (NHS Digital)', 'NHS Sickness Absence Rates',
 'https://digital.nhs.uk/data-and-information/publications/statistical/nhs-sickness-absence-rates',
 '/nhs-sickness-absence-rates/{month}-{year}', 'monthly', 'xlsx');

INSERT INTO public.thresholds (kri_id, threshold_value, methodology_label, methodology_window_start, methodology_window_end, methodology_n, qualifier_label) VALUES
('vacancy', 8.5,
 'Pre-pandemic mean of NHS England vacancy rate, 2018/19 Q1 – 2019/20 Q4 (8 quarters)',
 '2018/19 Q1', '2019/20 Q4', 8,
 'Working threshold (pre-pandemic mean) — not an official NHS target'),
('sickness_absence', 4.2,
 'Pre-pandemic mean of England monthly sickness absence rate, Apr 2009 – Feb 2020 (131 months)',
 'April 2009', 'February 2020', 131,
 'Working threshold (pre-pandemic mean) — not an official NHS target');

INSERT INTO public.kri_definitions (kri_id, display_name, is_live, illustrative_value, illustrative_target, illustrative_status, illustrative_trend, description, display_order) VALUES
('vacancy', 'Staff Vacancies', true, NULL, NULL, NULL, NULL, 'NHS England total workforce vacancy rate (%).', 1),
('sickness_absence', 'Sickness Absence Rate', true, NULL, NULL, NULL, NULL, 'NHS England monthly sickness absence rate (%).', 2),
('training_compliance', 'Training Compliance', false, 78, 95, 'Warning', 'worsening', 'Mandatory training compliance (%). Illustrative value.', 3),
('staff_engagement_score', 'Staff Engagement Score', false, 6.4, 7.5, 'Watch', 'steady', 'Staff engagement score (0–10). Illustrative value.', 4),
('voluntary_turnover', 'Voluntary Turnover', false, 13.1, 10, 'Warning', 'worsening', 'Voluntary turnover rate (%). Illustrative value.', 5);
