DROP VIEW IF EXISTS public.sources_public;

-- Reset public-role access to the sources table, then grant only the non-admin columns.
REVOKE ALL ON public.sources FROM anon, authenticated;
GRANT SELECT (id, kri_id, publisher, publication_name, series_landing_page_url, edition_page_url_pattern, update_cadence, file_format, last_known_file_url, updated_at) ON public.sources TO anon, authenticated;
GRANT ALL ON public.sources TO service_role;

-- Also remove any lingering public-role privilege on the admin-only column.
REVOKE SELECT (simulate_failure) ON public.sources FROM public;
REVOKE SELECT (backfill_file_url) ON public.sources FROM public;