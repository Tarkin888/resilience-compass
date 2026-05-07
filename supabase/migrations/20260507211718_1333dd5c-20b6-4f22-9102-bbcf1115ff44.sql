REVOKE SELECT (error_detail, linked_capture_id) ON public.capture_log FROM anon;
REVOKE SELECT (error_detail, linked_capture_id) ON public.capture_log FROM authenticated;

REVOKE SELECT (simulate_failure) ON public.sources FROM anon;
REVOKE SELECT (simulate_failure) ON public.sources FROM authenticated;

GRANT SELECT (id, kri_id, outcome, attempt_at) ON public.capture_log TO anon, authenticated;
GRANT SELECT (id, kri_id, publisher, publication_name, series_landing_page_url, edition_page_url_pattern, update_cadence, file_format, last_known_file_url, updated_at) ON public.sources TO anon, authenticated;