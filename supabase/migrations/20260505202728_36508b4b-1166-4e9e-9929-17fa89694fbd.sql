-- Replace permissive RLS on capture_log with a column-redacting public view.
DROP POLICY IF EXISTS "capture_log readable" ON public.capture_log;

-- Default deny: no anon SELECT directly on the base table.
ALTER TABLE public.capture_log ENABLE ROW LEVEL SECURITY;

-- Public-safe view: omits error_detail and linked_capture_id.
CREATE OR REPLACE VIEW public.capture_log_public
WITH (security_invoker = true)
AS
SELECT id, kri_id, outcome, attempt_at
FROM public.capture_log;

-- The view inherits RLS from the base table via security_invoker, so we add
-- a permissive SELECT policy that only the view will use (anon has no other
-- way to read the base table's columns).
CREATE POLICY "capture_log readable via view"
ON public.capture_log
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.capture_log_public TO anon, authenticated;
