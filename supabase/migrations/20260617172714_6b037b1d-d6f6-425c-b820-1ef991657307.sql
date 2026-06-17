-- Ensure required extensions (idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any prior versions of these jobs so re-running is idempotent
do $$
begin
  if exists (select 1 from cron.job where jobname = 'fetch_nhs_vacancy_weekly') then
    perform cron.unschedule('fetch_nhs_vacancy_weekly');
  end if;
  if exists (select 1 from cron.job where jobname = 'fetch_nhs_sickness_absence_weekly') then
    perform cron.unschedule('fetch_nhs_sickness_absence_weekly');
  end if;
end $$;

-- Vacancy: every Monday 06:00 UTC
select cron.schedule(
  'fetch_nhs_vacancy_weekly',
  '0 6 * * 1',
  $$
  select net.http_post(
    url     := 'https://rkjkhcesxxmghizufacj.supabase.co/functions/v1/fetch_nhs_vacancy',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-password', (select decrypted_secret from vault.decrypted_secrets where name = 'admin_password')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Sickness absence: every Monday 06:15 UTC (staggered)
select cron.schedule(
  'fetch_nhs_sickness_absence_weekly',
  '15 6 * * 1',
  $$
  select net.http_post(
    url     := 'https://rkjkhcesxxmghizufacj.supabase.co/functions/v1/fetch_nhs_sickness_absence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-password', (select decrypted_secret from vault.decrypted_secrets where name = 'admin_password')
    ),
    body    := '{}'::jsonb
  );
  $$
);
