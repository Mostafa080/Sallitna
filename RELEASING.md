# Releasing Sallitna

How a change gets from this repo to people's phones, safely. Two copies of everything:

| | **Test** | **Live (real families)** |
|---|---|---|
| Supabase project | a second, free project | `flqmhjzgekunnaxubjyj` |
| App build (EAS) | `preview` (TestFlight / internal testing) | `production` (App Store / Google Play) |
| Instant updates (EAS Update) | channel `preview` | channel `production` |

---

## One-time setup

### 1. The test Supabase project
1. supabase.com → **New project** (name: `sallitna-test`, same region as live). Keep the database password.
2. In the new project, copy the settings that live in the dashboard (not in migrations):
   - Authentication → Sign In / Providers → **Email**: on, «Minimum password length» **8**, «Secure password change» **off**,
     email OTP length **6**, expiry **600** seconds.
   - Authentication → **SMTP**: the same Resend settings as live (sender `no-reply@sallitna.online`).
   - Authentication → **Email templates** («Confirm signup» and «Magic link»): paste
     `backend/supabase/templates/sign-in-code.html`.
   - Authentication → **URL configuration**: Site URL `https://admin.sallitna.online`.
3. On your Mac, add these two lines to `~/.zshrc` (they stay on your computer, never in GitHub), then open a new
   Terminal window:
   ```
   export SUPABASE_TEST_REF='<test project ref — the part before .supabase.co>'
   export SUPABASE_TEST_DB_URL='<Project Settings → Database → Connection string → URI, with the password filled in>'
   ```
4. Fill it: `npm run db:push:test`, `npm run db:test:test` (all passed), `npm run functions:deploy:test`.

### 2. EAS (builds and instant updates)
1. Apple Developer account and Google Play Console account ready.
2. expo.dev → project **sallitna** → **Environment variables**: add `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_KEY` (the **publishable** key — never the secret one):
   - environment **preview** → the **test** project's URL and key;
   - environment **production** → the **live** project's URL and key.
3. Store links: once the app is published, put them in the live database (SQL Editor):
   ```sql
   update public.app_config set ios_store_url = 'https://apps.apple.com/app/id…',
                                android_store_url = 'https://play.google.com/store/apps/details?id=com.mostafa.sallitna';
   ```

---

## Every new feature

1. **Build it** — plan, code, tests (as in CLAUDE.md). Merged into `main`.
2. **Test copy** — if it has database changes: `npm run db:push:test` → `npm run db:test:test`.
   If it changed `backend/supabase/functions/notify`: `npm run functions:deploy:test`.
3. **Try it on your phone** (from `frontend/mobile`):
   - only screens / text / logic → `npx eas-cli update --channel preview --environment preview -m "what changed"`,
     then close and reopen the TestFlight app (twice);
   - a new library with native parts, a new permission, an icon change, or an Expo SDK upgrade →
     `npx eas-cli build --profile preview --platform all`, then install from TestFlight / the internal test link.
4. **Go live** (same order every time — the database first):
   1. `npm run db:push` → `npm run db:test` (all passed);
   2. `npm run functions:deploy` (if the function changed);
   3. the app:
      - instant update → `npx eas-cli update --channel production --environment production -m "what changed"`;
      - new version → bump `version` in `frontend/mobile/app.json` (e.g. 1.0.0 → 1.1.0), then
        `npx eas-cli build --profile production --platform all` and `npx eas-cli submit --platform all`.

### Rules that keep live phones working
- **Database changes only add.** Never rename or delete a table, column or function an older app still uses — people
  update over days. Remove old things one release later.
- **Instant updates only for the same app version.** Anything native needs a new store version (step 3, second case).
- **Something broke after an instant update?** `npx eas-cli update:rollback` (or republish the previous one).
- **An old version must stop working?** Only after the fixed version is in both stores:
  `update public.app_config set min_version = '1.1.0';` — older apps then show «حدّث سلّتنا».
