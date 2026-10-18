# Sallitna (سلّتنا)

Shared family grocery list — Arabic-first, Egypt first.

## Folders

```
frontend/
  mobile/      the phone app (Expo) — src/, assets/, app.json, .env
  dashboard/   the admin website (Vite + React) — reads frontend/mobile/.env
backend/
  supabase/    database: migrations/, tests/ (security), seed/ (products), config.toml
design/        the screen designs
```

## Commands (from this top folder)

```bash
npm run app        # start the phone app — scan the QR code with Expo Go
npm run dashboard  # admin website on http://localhost:5199
npm run db:push    # send new database changes (backend/supabase/migrations) online
npm run db:test    # run the security tests (everything is rolled back afterwards)
npm run typecheck  # check both apps
```

First time on a new computer: `npm install` inside `frontend/mobile` and `frontend/dashboard`.
Project rules: `CLAUDE.md`. Status: `PROGRESS.md`.
