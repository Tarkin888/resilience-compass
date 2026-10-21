UPDATE public.sources
SET edition_page_url_pattern = '/data-and-information/publications/statistical/nhs-sickness-absence-rates/{month}-{year}'
WHERE kri_id = 'sickness_absence';

UPDATE public.sources
SET edition_page_url_pattern = '/data-and-information/publications/statistical/nhs-vacancies-survey/april-2015---{month}-{year}-experimental-statistics'
WHERE kri_id = 'vacancy';