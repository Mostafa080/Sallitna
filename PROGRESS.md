# Progress

## Session 1 — 2026-10-11: Project setup + static Home screen

### Done
- Own Git repo for `sallitna` (it used to sit inside the home-folder repo).
- Expo SDK 57 + TypeScript + expo-router. Demo screens removed. Routes live in `src/app/`.
- Libraries added: `@expo-google-fonts/readex-pro`, `lucide-react-native`, `react-native-svg`, `expo-localization`.
- **Theme** — `src/theme/index.ts`: all colors, fonts, font sizes, spacing, radius, sizes, shadow.
- **Fonts** — Readex Pro 400/500/600/700 load at startup (splash stays until ready).
- **RTL forced**:
  - Real builds: `forcesRTL` in `app.json` (expo-localization plugin).
  - Expo Go: root view has `direction: 'rtl'` (Expo Go ignores the app.json setting).
- **i18n** — `src/i18n/{ar,en,hi}.json` + small `t()` helper with Arabic plural rules. `hi` is an English placeholder.
- **Home screen** (`src/app/index.tsx`) — static, fake data from `src/data/fakeHousehold.ts`:
  header + avatars + invite, "Sara at the store" banner, count + filter pills,
  grouped item cards (checkbox, name, "new" badge, voice icon, who/when, quantity pill,
  merged "two people asked" row), bottom bar with floating mic.
- Components: `AppText`, `Avatar`/`AvatarStack`, `ShopperBanner`, `FilterPill`, `ItemRow`, `BottomBar`.

### Next
- Done in session 2 (see below).

### Known issues / open questions
- **Readex Pro draws final "ي" without dots** (e.g. «فى» instead of «في»). The design shows dots. Check which font version/file the design uses.
- **Tokens not in the base palette**: `accentInk` (#B4560F, dark orange text on the "جديد" badge), `darkGround`/`darkSurface` for voice screens. Need confirmation.
- **Eggs "30 كرتون"** in the design means "a carton of 30". The data model has no pack size yet, so fake data shows "1 كرتون".
- Banner hint text depends on the shopper's gender (`hint_f` / `hint_m`). Members need a gender (or neutral copy).
- ESLint isn't installed (starter didn't include it). `npx tsc --noEmit` passes.
- ~~Buttons and checkboxes don't do anything yet~~ — done in session 2.

## Session 2 — 2026-10-11: Home interactions + empty state + item detail

Agreed split for "interactive flow for all screens": **(1) this session**, (2) type-to-add, (3) voice flow.

### Done
- **Shared list store** — `src/store/ListStore.tsx` (React context, in-memory, resets on reload).
  Every change keeps a snapshot so it can be undone (maps to `item_events` later).
- **Home**
  - Tick the circle → green tick, haptic, row slides out, undo bar.
  - Filter pills "الكل" / "أضيف اليوم" work (empty filter shows a message).
  - Swipe a row toward the start side (right in RTL) → "أنا أجيبه" (claim/unclaim, shows "· عليك"), "عدّل", "احذف".
    Only one row open at a time; scrolling closes it. Screen readers get the same actions via the actions menu.
  - Tap a row → Item detail.
  - Undo bar (`UndoToast`) — 6 s, "تراجع" restores the item. Delete copy says who'll notice (e.g. «خالد يشوفها راحت»).
  - Bottom bar / invite → "قريبًا" toast (screens come in later sessions).
- **Empty state** (`EmptyState`) — shows when the list is empty; basics chips add/remove items,
  counter "· N مضافة", then a "شوف القائمة · N" button (not in design — see questions).
- **Item detail** (`src/app/item/[id].tsx`) — back, delete (with undo on Home), category, name,
  helper translations line, quantity stepper, unit choice, note, history (who/when/voice transcript), monthly stats, save.
  Photo and play-recording → "قريبًا".
- Library added: `expo-haptics`. (`expo-clipboard` approved — will be installed in the type-to-add session.)
- Dev-only: **long-press the household name** → empty the list / restore demo data (hidden in production builds).

### Next
- **Session 3: Type-to-add** (design/type-add.png) — search catalog + dialect aliases, add as-is,
  "running low", usual items, paste a WhatsApp list (`expo-clipboard`).
- **Session 4: Voice flow (simulated)** — listening → processing → review → not-understood.
  Agreed: tap mic = normal recording, **long-press mic = noisy recording** (to reach "ما سمعناك زين").
- After that: Supabase (tables + RLS, phone OTP auth), replace the in-memory store.

### Known issues / open questions
- **Swipe direction**: actions appear on the left (as in home-actions.png) by swiping **right** — the iOS RTL convention.
  The hint text in the design says «اسحب … لليسار» (swipe left). Which one is intended?
- **"شوف القائمة · N" button** on the empty state isn't in the design — needed so people can pick several basics first. Please design it.
- **Claimed state** ("· عليك" / "· على سارة" in blue) isn't in the design — please confirm the look.
- **Hindi text** uses the phone's system font (Noto Sans Devanagari not loaded yet).
- In Expo Go, screen push/back animation slides like LTR; real builds will slide RTL.
- Expo Go's floating gear button can cover the "تراجع" button while testing — it's not part of the app.

## Session 3 — 2026-10-11: Type-to-add

### Done
- **Type-to-add screen** — `src/app/add.tsx`, opens from "اكتب" on Home (slides up, keyboard ready).
  - Search as you type over a fake catalog with **dialect aliases** (`src/data/fakeCatalog.ts`):
    «عيش» → رز بسمتي, «مويه» → ماء, «فاين» → مناديل. Forgiving spelling (أ/ا, ة/ه, ى/ي) via `src/lib/arabic.ts`.
  - Each result shows "bought N times this month" and "on the list ×N". `+` adds it; Return adds the top result.
  - «أضف "…" كما هو» adds free text (goes to a new "أغراض ثانية" category).
  - **قرب يخلص؟** — an item the household buys regularly that's due (from fake habits).
  - **عادةً تشترون** — most-bought items not already on the list.
  - **الصق** — reads a copied WhatsApp list and splits it (`src/lib/parseList.ts`): lines/commas/bullets,
    numbering, emoji, title lines, Arabic digits (٣), quantities and unit words (كيلو، كيس، كرتونة، كيلوين…).
- **No duplicates**: adding something already on the list raises its quantity («زدنا "حليب" · صار 3×»).
- Undo now also removes newly added items (one "تراجع" undoes a whole pasted list).
- Library added: `expo-clipboard`.

### Next
- **Session 4: Voice flow (simulated)** — listening → processing → review → not-understood.
  Tap mic = normal recording, long-press = noisy recording. The mic inside the type-to-add search field opens it too.

### Known issues / open questions
- iOS asks "Allow Paste?" the first time "الصق" is tapped — that's an iOS privacy rule, can't be removed.
- When a quantity is raised on an existing item, it doesn't get the "جديد" badge or record who asked for more
  (needs `item_events` from Supabase).
- Catalog and habits are fake and small (~19 items). Real ones come with Supabase.

## End of day 1 — 2026-10-11: summary, design review, current status

### Done today (sessions 1–3)
- Project set up (Expo SDK 57, TypeScript, expo-router), own Git repo, theme, Readex Pro, forced RTL, i18n (ar/en/hi).
- Home: interactive list, filters, swipe actions, undo bar, empty state with basics.
- Item detail: quantity, unit, note, save, delete.
- Type-to-add: dialect-aware search, add as-is, running low, usual items, paste a WhatsApp list.
- Everything runs on fake in-memory data (resets on reload). Typecheck passes. Tested in the iOS Simulator.

### Design review
24 new screens were added to `/design` (33 total). Grouped:
- **Sign-up / joining:** welcome, verify, code-error, household, join, join-setup
- **Family:** invite, invite-expired, members, member-detail, settings
- **Shopper mode:** start-trip, shopper, shopper-empty, not-found, answer, split, end-early, trip-done, offline
- **Microphone:** mic-permission, mic-denied
- **Other:** helper (English, LTR), notifications

### Next (suggested order)
1. **Voice flow (simulated)** — listening → processing → review → not-understood, plus mic-permission / mic-denied.
   Tap mic = normal recording, long-press = noisy recording.
2. **Shopper mode** — start-trip → shopper → not-found / answer → end-early → trip-done, plus shopper-empty, split, offline.
   Replaces the "قريبًا" on «أنا في السوق».
3. **Family** — members, member-detail, invite, settings.
4. **Helper view** — English/Hindi, LTR layout, Noto Sans Devanagari.
5. **Supabase + sign-in** — tables with RLS, phone OTP; welcome, verify, household, join.
6. **Notifications** — needs a development build (Expo Go is limited for push).

### Decisions needed
- **Filipino** appears as a language in join / join-setup / helper, but CLAUDE.md lists only ar/en/hi. Add it?
- **Dialect list** in the screens: Saudi, Emirati, Kuwaiti, Egyptian, Levantine, Fusha/other.
  CLAUDE.md says "Saudi, Egyptian, Gulf, Levantine". Plan: follow the screens unless told otherwise.
- **Claimed items:** split.png shows claimed items in their own sections with an orange «أنا أجيبه» button.
  Home currently shows a blue «· عليك» label — align with the design?
- **Swipe direction** on Home: swipe right (iOS RTL convention) vs. the «لليسار» hint text.
- **«شوف القائمة · N»** button on the empty state still has no design.
- **New colors** needed: yellow warning banner (offline.png: background, border, text).
  Settings toggles can reuse `success`; the «في السوق» chip can use `accentTint` + `accentInk`.
- **Recordings:** mic-permission says recordings are deleted once understood, but settings has
  «احفظ التسجيلات 7 أيام». OK if that switch is off by default?

### Known issues (open)
- **Scrolling doesn't work on the user's iPhone** (Home, Item detail, Type-to-add) — not reproduced:
  scrolling works in the simulator after a fresh start. Likely cause: the phone loaded the app mid-edit and
  only hot-reloaded since (the gesture handler root added by hot reload needs a full restart).
  Fix to try: fully close Expo Go from the app switcher and reopen. If it still fails, note the iPhone model
  and whether rows slide sideways when swiped.
- **Readex Pro draws final «ي» without dots** («فى»); designs show dots. Check the design's font file.
- **Pack size** is missing from the data model — designs show «كرتون 30» / «Tray of 30».
- **Phone code length:** verify.png shows 4 digits; Supabase phone OTP is usually 6 — check when building sign-in.
- **Hindi** uses the system font until Noto Sans Devanagari is loaded.
- In Expo Go, screen push/back slides like LTR; real builds will slide RTL.
- ESLint isn't installed; `npx tsc --noEmit` passes.
- iOS asks «Allow Paste?» the first time «الصق» is tapped (iOS rule).

## Session 4 — 2026-10-12: Voice flow (simulated)

### Done
- **Voice screen** — `src/app/voice.tsx`, opens from the big mic on Home and from the mic in type-to-add.
  Plays a pretend recording (no real microphone or speech-to-text yet):
  - **mic-permission** (first time only) → «اسمح بالمايك» / «بعدين».
  - **listening** — transcript appears phrase by phrase, understood items underlined orange, «شيل» dashed,
    moving sound bars, «خلّصت» or stops by itself after 2 s.
  - **processing** — spinner, cards fill in, then moves to review by itself.
  - **review** — cards checked against the live list: تحديث (already on list, edit with ✎), جديد (stepper),
    تأكيد «عيش» (rice / bread), حذف with تراجع. «أضف للقائمة» applies everything with one undo;
    «سجّل مرة ثانية» records again; ✕ closes.
  - **not-understood** — long-press the mic on Home. «أضفه» adds the one word caught, «جرّب مرة ثانية»,
    «اكتبها بدالها» opens type-to-add.
  - **mic-denied** — test menu (long-press household name) → «شاشة المايك المقفّل». «افتح الإعدادات» opens phone settings.
- Items added by voice show the mic icon and keep the transcript (visible in item detail).
- Voice sets a quantity ("حليب ثنتين" → 2), it doesn't add to it — matches «بنخليه 2 بدل 1» in review.png.
- **Scrolling fix attempt:** row swipe now only starts on a clear sideways swipe in the opening direction,
  and any small vertical movement hands the touch to the list. A drag that starts sideways then goes up now scrolls.
- No new libraries.

### Next
- **Session 5: Shopper mode** — start-trip → shopper → not-found / answer → end-early → trip-done,
  plus shopper-empty, split, offline. Replaces «قريبًا» on «أنا في السوق».

### Known issues / open questions
- **Scrolling on the user's iPhone** — please re-test after this session's swipe change.
- Voice is simulated: always the same sentence. Real recording needs expo-audio + a Supabase Edge Function
  for speech-to-text and parsing (secrets stay server-side).
- The «عيش» explanation always says "In the Gulf…" — should depend on the speaker's dialect (Egyptian «عيش» = bread).
- «جرّب: …» tip chips on the listening screen are not tappable (just examples, like the design).
- «تحديث» cards use set-quantity; if the person meant "more", they can fix it in review.
