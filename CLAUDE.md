# Sallitna (سلّتنا) — project rules for Claude

## What this app is
A shared family grocery list. Arabic-first, add items by voice in dialect
(Saudi first, then Emirati/Kuwaiti/Egyptian/Levantine, plus Fusha/other). One list per household, live sync,
"I'm at the store" shopper mode, helpers (driver/maid) see the list in their language.

## About me
I'm a product designer, not a developer.
- Explain what you're about to do in simple words before any big change.
- Ask me before installing a new library or changing the project structure.
- Keep changes small. One feature per session.
- When done, tell me exactly how to test it on my phone.

## Folders
- `frontend/mobile` — the Expo app (run Expo/npm commands for the app here)
- `frontend/dashboard` — the admin website (uses the same public keys from `frontend/mobile/.env`)
- `backend/supabase` — migrations, security tests, seed data (run Supabase CLI commands from `backend/`)
- Shortcuts in the top-level `package.json`: `npm run app | dashboard | db:push | db:test | typecheck`
  (+ `db:push:test | db:test:test | functions:deploy | functions:deploy:test` for the test copy)
- Releasing (test copy → live, instant updates vs store versions): see `RELEASING.md`

## Stack
- Expo (current SDK) + TypeScript + expo-router
- Supabase: Postgres, Auth (email OTP — 6-digit code sent through Resend from sallitna.online), Realtime, Storage, Edge Functions
- npm as package manager

## Design (match the screens in /design)
- Arabic-first, RTL. Helpers may use English/Hindi (LTR).
  Never hardcode left/right — use start/end.
- Fonts: Readex Pro (Arabic + Latin), Noto Sans Devanagari (Hindi)
- Colors:
  ground #F6F4EF · surface #FFFFFF · ink #1D1B18 · muted #615C53
  line #E6E1D6 · accent #E8731A · accent-tint #FDEBD8
  success #2E7A4E · info #2F5D8A · danger #9B2C1F
- Radius: cards 18, buttons/pills 999. Touch targets at least 44px.
- Keep all colors/fonts/spacing in one theme file. No random values.
- All UI text goes in i18n files (ar, en, hi). No hardcoded strings.

## Security rules — never break these
- No API keys or secrets inside the app. Secrets live only in
  Supabase Edge Function environment variables.
- Every database table has Row Level Security: members can only
  read/write their own household's data.
- Never commit .env files.

## Working rules
- Plan first, show me the plan, then code.
- Don't touch working code that isn't part of the current task.
- At the end of every session, update PROGRESS.md with:
  what's done, what's next, known issues.

## Target data model
households, members (role: owner/member/helper, view_language, dialect),
items (qty, unit, status: open/in_cart/bought/not_found/removed,
added_by, added_via, claimed_by, trip_id), catalog + aliases (dialect
synonyms), trips, questions (shopper ↔ family), item_events (activity +
undo), voice_jobs (transcript, parse result, corrections).
