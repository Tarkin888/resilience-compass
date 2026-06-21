CREATE OR REPLACE VIEW public.sources_public AS
SELECT id,
       kri_id,
       publisher,
       publication_name,
       series_landing_page_url,
       edition_page_url_pattern,
       update_cadence,
       file_format,
       last_known_file_url,
       updated_at
FROM public.sources;

-- The view runs with the privileges of its owner so row visibility does not depend on the caller.
ALTER VIEW public.sources_public OWNER TO postgres;

-- Allow public roles to read only the restricted view.
GRANT SELECT ON public.sources_public TO anon, authenticated;

-- Prevent public roles from reading the admin-only column through the base table.
REVOKE SELECT ON public.sources FROM anon, authenticated;
REVOKE ALL ON public.sources FROM anon, authenticated;