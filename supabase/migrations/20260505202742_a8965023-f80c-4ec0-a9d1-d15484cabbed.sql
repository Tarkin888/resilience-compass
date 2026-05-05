-- Tighten capture_log: anon/authenticated cannot read sensitive columns directly.
DROP POLICY IF EXISTS "capture_log readable via view" ON public.capture_log;

-- Restrict direct table reads entirely; anon goes through the safe view.
REVOKE SELECT ON public.capture_log FROM anon, authenticated;
GRANT SELECT (id, kri_id, outcome, attempt_at) ON public.capture_log TO anon, authenticated;

-- Allow row-level read of the safe columns only.
CREATE POLICY "capture_log safe columns readable"
ON public.capture_log
FOR SELECT
TO anon, authenticated
USING (true);
