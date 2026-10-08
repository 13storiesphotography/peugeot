-- Keep Peugeot OAuth warm more often so refresh tokens rarely die
-- (dead refresh → Captcha full login). Safe no-op if job missing.
do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'refresh-peugeot-oauth' limit 1;
  if jid is not null then
    perform cron.alter_job(job_id := jid, schedule := '*/10 * * * *');
  end if;
end $$;
