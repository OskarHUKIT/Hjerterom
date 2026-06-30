# Boly

Boly er en digital plattform for boligformidling mellom kommune og private utleiere.

Primær kildekode vedlikeholdes i [OskarHUKIT/Boly](https://github.com/OskarHUKIT/Boly). Dette depotet (`Hjerterom`) speiles fra Boly for sikkerhetskopi og videre arbeid.

## Prosjektstruktur

```
├── frontend/     # Next.js-app (bolynorge.no)
├── supabase/     # Database, migrasjoner og edge-funksjoner
├── docs/         # Dokumentasjon (GDPR, drift, juridisk)
└── tests/        # Tester
```

## Kom i gang

Se [QUICK_START.md](./QUICK_START.md) for lokal utvikling og deploy.

```bash
npm run install:all
npm run dev:frontend
```

Appen kjører på http://localhost:3000

## Synkronisering fra Boly

GitHub Actions-workflowen `sync-from-boly` henter siste `main` fra Boly og oppdaterer dette depotet. Krever `MIRROR_TOKEN` (PAT med `repo`-tilgang til Boly) under **Settings → Secrets → Actions**.

Manuell kjøring: **Actions → Sync from Boly → Run workflow**.

## Teknologistack

- Frontend: Next.js, React, Tailwind CSS
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions)
- Deploy: Vercel (frontend), Supabase Cloud (backend)
