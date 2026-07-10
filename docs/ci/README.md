# CI-filer som må flyttes manuelt

`supabase-deploy.yml` her er den oppdaterte versjonen av `.github/workflows/supabase-deploy.yml`
(med shadow-DB-validering per PR). PAT-en som brukes fra Cowork mangler `workflow`-scope,
så flytt innholdet på plass via GitHub-web: åpne `.github/workflows/supabase-deploy.yml` → Edit → lim inn → commit til denne branchen.
Slett deretter denne mappen.
