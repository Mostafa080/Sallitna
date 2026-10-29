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

## Session 5 — 2026-10-12: Shopper mode (simulated)

### Done
- **«أنا في السوق»** now opens **start-trip** (bottom sheet): where (supermarket / grocery / pharmacy / bakery),
  and — because سارة is already shopping — split with her or "I'll get everything".
- **shop** (`src/app/shop.tsx`): dark header, progress bar «X من Y في السلة», list sorted by aisle,
  tap to put in cart (and back out), «في السلة» section, «خلّصت التسوق» / «شي ما لقيته».
  - **Live addition (simulated):** 5 s into a trip خالد adds «هيل» by voice — appears highlighted at the top with a toast.
  - **Not found:** long-press a row, or «شي ما لقيته» → pick the item → sheet: ask the person who added it
    (with notification preview), leave for next time, or remove.
  - **Split mode:** «ما أحد أخذه» with orange «أنا أجيبه», «عليك», «على سارة» (bought / looking).
  - **Offline (test):** long-press the screen title → yellow «ما فيه شبكة» banner + «بانتظار الإرسال».
    Long-press again to come back online.
  - **Empty list:** «ما فيه شي تشتريه» → «اسأل العائلة» / «اطلع من وضع التسوق».
- **end-early** sheet when items are left: keep the rest on the list, or ask someone to finish.
- **trip-done**: bought / not found / added-meanwhile, notes for each not-found item (including the family's reply),
  optional amount paid, «شارك الملخص» (system share sheet), back to the list with a toast.
- **answer** (family's side): test menu → «ردّ على السؤال (كأنك خالد)». Replying "yes" swaps the item to the
  alternative (هيل → هيل مطحون) and puts it back on the shopper's list; "no" removes it; "later" keeps it for next time.
- Home banner shows «أنتي في السوق الحين» during your own trip; tap it to go back to shopping.
  Items in the cart are hidden from Home.
- New colors: `live` (green dot on dark), `warningTint` / `warningLine` / `warningInk` (offline banner), `scrim`.
- Store: trips, questions, trip summary and offline state added to `ListStore` (`src/store/tripTypes.ts` mirrors
  the planned `trips` and `questions` tables). No new libraries.

### Next
- **Session 6: Family** — members, member-detail, invite, invite-expired, settings.
- Then helper view (EN/HI, LTR, Noto Sans Devanagari), then Supabase + sign-in.

### Known issues / open questions
- In split mode the partner's progress is simulated: dairy is "theirs" (one bought), produce is "yours".
- The blue «· عليك» label on Home (session 2) is still there; split.png handles claims inside shopper mode.
  Keep both, or drop the Home label?
- Amount paid isn't saved anywhere yet (needs the `trips` table). Receipt photo → «قريبًا».
- «ردّ بصوتك» on the answer screen → «قريبًا».
- Only one phone: the family's side (answer) is reached from the test menu, not a real notification.
- Ending a trip early with "ask someone to finish" only shows a toast (no real notification yet).

## Session 6 — 2026-10-14: Family (members, member detail, invite, expired invite, settings)

### Done
- **أهل البيت** (`src/app/members.tsx`) — opens by tapping the faces next to the household name on Home.
  Each person with role · language (your own row also shows your dialect), «في السوق» while shopping,
  the helper explainer, and **آخر نشاط** built from the list itself (who added what, by voice or typing, plus a fake
  past trip «سارة اشترت 11 غرض»). Gear → settings, «ادعُ شخص» → invite.
- **Member detail** (`src/app/member/[id].tsx`) — only the manager (مسؤولة) can open it; you can't open yourself.
  Role (مسؤول / عضو / مساعد), «يشوف القائمة بـ» (pick one) and «يتكلّم بـ» (pick several) in bottom sheets,
  «حفظ» with undo. Making someone مسؤول asks first, then hands it over (you become عضو).
  «شيل … من البيت» asks first, removes them, undo brings them back. Their items stay on the list.
- **Invite** (`src/app/invite.tsx`) — the Home «+person» button now opens it. «أرسل الدعوة على الواتساب» opens the
  phone's share sheet with a ready message; «انسخ الرابط» copies `https://sallitna.app/j/8KD2` (fake).
  List of who joined (green «انضم/انضمت») and who hasn't yet («بانتظاره» — a fake invite for «أبو خالد»).
- **Expired invite** (`src/app/invite-expired.tsx`) — test menu → «رابط دعوة منتهي». «اطلب رابط جديد» opens the
  share sheet; «ابدأ قائمة جديدة بدالها» → «قريبًا».
- **Settings** (`src/app/settings.tsx`) — list name (tap to rename, manager only), my dialect, display language,
  4 notification switches, 2 voice/privacy switches (remembered while the app is open),
  help → «قريبًا», «اطلع من …» asks first → «قريبًا».
- Store: members, pending invites, list name and settings now live in `ListStore`, so changes show everywhere
  (Home faces, banner, list name). Members got `view_language`, `speaks`, `dialect`, `joined_at`.
- Shared parts in `src/components/family/FamilyParts.tsx` (round header button, card rows, on/off switch,
  status pill, pick-from-list sheet). New sizes `avatarLarge`, `avatarHero`. No new libraries.

### Next
- **Session 7: Helper view** — Rahul's side in English/Hindi (LTR), Noto Sans Devanagari, translated item names.
  This is also when «لغة العرض» will really switch the app's language.
- Then Supabase (tables + RLS, phone OTP sign-in), real invite links (Edge Function, 7-day expiry), notifications.

### Known issues / open questions
- **Display language** is saved but doesn't translate the app yet (comes with the helper view).
- **Invite screen** in the design has onboarding bits (the 3-dash step indicator and «تقدر تدعوهم بعدين…» hint).
  Opened from Home, I left those out and «ابدأ القائمة» just goes back. They'll return in the sign-up flow.
- **Pending invites** aren't shown on «أهل البيت» (the design doesn't show them there). Should they be?
- **«يتكلّم بـ» sheet** uses the same round radio circles even though you can pick several. Want checkboxes instead?
- Leaving the household, help and «ابدأ قائمة جديدة» need real accounts → «قريبًا».
- Everything resets when the app reloads (still in-memory).
- The Expo Go gear button sits on top of «تراجع» on the members screen while testing — not part of the app.

## Session 7 — 2026-10-14: Helper view

### Done
- **Helper's list** (`src/app/helper.tsx`) — test menu (long-press the household name) → «شوف القائمة كأنك Rahul».
  - English and Hindi are **left-to-right**, Arabic right-to-left. Only this screen flips; the rest of the app stays RTL.
  - «Show the list in» switch: English / हिन्दी / العربية — saved to Rahul's `view_language` (the members screen updates too).
  - Each item: translated name (from the catalog), the Arabic original underneath for matching in the shop,
    "added by Umm Khalid + Khalid" / "added by you", quantities in his language (2 kg, 6 pcs, ×2), "New" badge for fresh items.
    Items without a translation show the Arabic name.
  - Tick → bought, undo bar in his language; it disappears from the family's list too. «7 of 12 left to buy».
  - «Speak» and «I'm going to the store» → "Coming soon" (agreed).
  - Tap Rahul's face → back to the family's list (test only, no sign-in yet).
- **Hindi font**: Noto Sans Devanagari (`@expo-google-fonts/noto-sans-devanagari`, approved). `AppText` picks it
  automatically for any text written in Hindi script, so «हिन्दी» in pickers also looks right now.
- `AppText` now follows the screen's reading direction (`LayoutDirectionContext` in `src/lib/direction.ts`).
- i18n: `tIn(language, key)` translates into a chosen language; `formatQuantity` takes a language.
  English units shortened (×2, 6 pcs) and real Hindi units added. Members and the household have English/Hindi name spellings.

### Next
- **Display language for the whole app** (settings «لغة العرض») — switching the app to English/Hindi needs the app
  to restart left-to-right. Its own session.
- Then Supabase (tables + RLS, phone OTP sign-in), real invite links, notifications.

### Known issues / open questions
- **Hindi text was written by me** — please have a Hindi speaker check it (`src/i18n/hi.json`, the `helper` and `units` parts).
  The rest of `hi.json` is still the English placeholder.
- **Eggs "Tray of 30"** in the design — still "1 carton" (no pack size in the data yet).
- Toasts in the helper view: the "Coming soon" and "bought" ones are in his language; other toasts that can appear
  there (e.g. something the family did) would still be Arabic.
- Expo Go: screen open/close animations still slide like LTR (real builds are fine).

## Session 8 — 2026-10-14: Sign-up and joining (simulated)

### Done
- **Start a new list** (path A): test menu → «ابدأ من جديد (تسجيل)», or «ابدأ قائمة جديدة بدالها» on the expired-invite screen.
  - **welcome** (`src/app/welcome.tsx`) — voice → list example, three chips, «ابدأ قائمة جديدة» / «عندي دعوة من العائلة».
  - **verify** (`src/app/verify.tsx`) — +966 Saudi number (9 digits, starts with 5, formatted as you type) →
    4 code boxes (phone can auto-fill from the text message), 0:30 resend countdown, «أرسل الرمز على الواتساب بدلها».
    **The test code is 1234** (a toast shows it). Wrong code → code-error look: red boxes, «باقي لك محاولتين»,
    new code / WhatsApp / wrong number. After 3 wrong tries: «خلصت المحاولات» and the boxes lock.
  - **household-setup** (`src/app/household-setup.tsx`) — «سمّ بيتك»: list name, your name, «أنا: امرأة / رجل», dialect cards.
  - **setup-invite** — the invite screen with all 3 dashes and «تقدر تدعوهم بعدين من أهل البيت».
    «ابدأ القائمة» → your new, empty household (you're the manager) with «قائمتك جاهزة».
- **Join from an invite** (path B): test menu → «افتح رابط دعوة», or «عندي دعوة من العائلة» on welcome.
  - **join** (`src/app/join.tsx`) — «أم خالد تدعوك», the family's faces + a dashed "+", phone, list language → code.
  - **join-setup** (`src/app/join-setup.tsx`) — «أهلًا …», name, «أنا», dialect chips, list language, tips card.
    The wording switches to feminine once «امرأة» is picked (انضميتي، تشوفين، اضغطي، ادخلي).
    «ادخل القائمة» → the demo household with you as a new member and «أهلًا … في بيت أبو خالد».
- **Who "you" are** now lives in the shared store (was fixed to أم خالد), so a new person can sign up.
  Screens now look people up from the store, not the fixed demo list.
- **6 dialects** everywhere (agreed): سعودية، إماراتية، كويتية، مصرية، شامية، فصحى / أخرى. CLAUDE.md updated.
- **Filipino** left out for now (agreed) — only العربية / English / हिन्दी.
- Home shows at most 4 faces, then «+N», so the title stays on one line.
- Shared parts: `src/components/onboarding/OnboardingParts.tsx` (logo, step dashes, field, phone field, code boxes,
  chips, dialect cards). New theme sizes `codeBox`, `stepDash`, `layout.heroCardWidth`, `layout.twoColumnBasis`.
  No new libraries.

### Next
- **Session 9: Notifications screen** (notifications.png).
- **Session 10: Display language for the whole app** (English/Hindi left-to-right after a restart).
- Then Supabase: tables + Row Level Security, phone OTP sign-in (replaces the 1234 code), real invite links, live sync.

### Known issues / open questions
- The app still **opens on the demo list**, not on welcome — sign-up is reached from the test menu until there are
  real accounts (Supabase). Then: new phone → welcome; signed-in phone → the list.
- The design numbers the invite as step 3 of 3, and «سمّ بيتك» as step 3 too — I show «سمّ بيتك» as step 3
  (current) and the invite with all 3 dashes done. Which steps should the 3 dashes be?
- «الشروط» and «سياسة الخصوصية» aren't links yet (no pages to open).
- After 3 wrong codes the real wait isn't timed — restart the flow to try again.
- The «+N» face on Home is drawn small — check it looks right on your phone.

## Session 9 — 2026-10-15: Notifications (simulated lock screen)

### Done
- **notifications** (`src/app/notifications.tsx`) — test menu → «شاشة التنبيهات». A lock-screen look-alike
  (dark green, as in notifications.png) built from what's happening in the app (agreed: simulated, no new library):
  - **«سارة تسألك عن هيل»** — opening the screen makes Sara (who's shopping) ask about cardamom
    («هيل خلصان. أجيب هيل مطحون؟»). Cardamom is put on the list as yours if it isn't there.
    «إيه جيبيه» swaps it to هيل مطحون on the list, «لا خلاص» removes it, «رد» (or tapping the card) opens the
    answer screen from session 5. The card goes away after replying, with «وصل ردّك لسارة».
  - **«سارة في السوبرماركت»** — «أضف بالصوت» opens the voice screen.
  - **«خالد أضاف غرضين»** — the latest person (not you) who added things in the last 24 hours, with the names.
  - «افتح القائمة» → back to the list.
- Replying to a question now updates the list even when it's someone else's trip (before, only your own trip did).
- New colors: `lockScreen`, `notification`, `notificationOld`, `onDarkSubtle`.

### Next
- **Session 10: Display language for the whole app** (English/Hindi left-to-right after a restart).
- Then Supabase: tables + RLS, phone OTP sign-in, live sync, real invite links and **real push notifications**
  (expo-notifications — the buttons on these cards become notification actions).

### Known issues / open questions
- **«إيه جيبيه» vs «إيه جيبه»**: the design says «إيه جيبه» to Sara; I used the feminine «جيبيه» (and «جيبه» for a man). OK?
- Sara asks only once per demo session — reload the app to see the question again.
- The design shows «خالد أضاف 3 أغراض» (حليب ×2، خبز صامولي، رز بسمتي); the demo data has Khalid adding 2 recent things,
  so it shows «خالد أضاف غرضين · بصل أحمر، خبز صامولي».
- The design shows «الهيل الحب خلصان» — our catalog calls it «هيل», so it reads «هيل خلصان. أجيب هيل مطحون؟».

## Session 10 — 2026-10-15: Database (Supabase)

Agreed: skip the "whole app in English/Hindi" session (Hindi stays where it is) and start the database.
Plan: **10 database** → 11 sign-in (phone, create/join household) → 12 live list + sync → 13 trips, questions, push notifications.

### Done
- Supabase project **flqmhjzgekunnaxubjyj** (online; no Docker on this Mac, so no local copy).
  The Supabase command-line tool runs through `npx` — nothing added to the app. You logged in once (`npx supabase login`).
- `supabase/` folder (project-structure change, approved):
  - `migrations/20261015090000_core_schema.sql` — tables: households, members, invites, catalog, catalog_aliases,
    trips, items, questions, item_events, voice_jobs.
  - `migrations/20261015090100_seed_catalog.sql` — the 21 catalog items + 43 dialect words, generated from
    `src/data/fakeCatalog.ts` («عيش» = rice only for Saudi/Emirati/Kuwaiti).
  - `tests/rls_test.sql` — security tests (see below).
- **Row Level Security on every table.** You only see and change your own household. Only the manager renames the
  list, changes roles or removes people; helpers can add and buy but can't invite or manage. Who added an item
  can't be changed later. History (`item_events`) is written automatically by the database, nobody can write it by hand.
- **Safe doors** (functions that check who's asking): `create_household`, `create_invite` (8-letter codes, 7 days,
  member or helper), `get_invite` (what the join screen shows — works before sign-in), `join_household`,
  `set_member_role` (making someone manager hands it over), `remove_member` / `restore_member` (undo),
  `leave_household` (the manager must hand over first).
- Removed members are kept (marked as left) so old items still show who added them.
- **Tests: 38 / 38 pass** — signed-out visitor, manager, member, helper and a stranger from another household.
  They run in a transaction that's rolled back, so nothing stays behind.
  Run again any time: `npx supabase db query --linked -f supabase/tests/rls_test.sql`
- Supabase security checker (`npx supabase db advisors --linked`): no errors; only warnings that the safe doors
  are callable — on purpose, each one checks permissions itself.

### Next
- **Session 11: Sign-in.** Install `@supabase/supabase-js` (+ storage for the login session) — will ask first.
  Turn on phone sign-in with **test numbers** (fixed codes, no SMS cost), connect the session-8 screens:
  verify → real code, «سمّ بيتك» → `create_household`, invite → real link, join → `get_invite` / `join_household`.
  The app's public Supabase address and public key go in `.env` (git ignores it).

### Known issues / open questions
- **Invite codes are 8 letters** (e.g. `K7MP2QXA`), not 4 like the design's «8KD2» — 4 letters could be guessed.
- No push notifications, realtime or voice audio storage yet (sessions 12–13).
- Real SMS (Twilio, paid) needed before launch; until then only the test numbers can sign in.

## Session 11 — 2026-10-15: Real sign-in (Supabase)

### Done
- Libraries (approved): `@supabase/supabase-js`, `@react-native-async-storage/async-storage` (stay signed in).
- `.env` holds only the **public** address + publishable key (git ignores it). `.env.example` is the empty template.
  `src/lib/supabase.ts` = the one connection; `src/lib/api.ts` = everything the app asks the database for.
- **Phone sign-in is on** in the Supabase project with **test numbers** (no SMS, no cost):
  +966 **500000001 … 500000004**, code **123456**. Codes are **6 digits** (Supabase can't do 4) — boxes and text updated.
  Real SMS: a placeholder Twilio entry in `supabase/config.toml`; fill in before launch.
- **The app now opens on the real flow:** not signed in → welcome; signed in → your household; signed in without a
  household → «سمّ بيتك». It remembers you after closing the app.
  - Start a new list: phone → real code → «سمّ بيتك» creates the household (you're the manager) → invite with a
    **real 8-character code** (e.g. `sallitna.app/j/K39SL6EV`, plus the code in the WhatsApp message) → empty list.
  - Already have a household (e.g. new phone)? After the code you go straight back to it.
  - Join: «عندي دعوة من العائلة» → type the invite code → the family's real name, inviter and faces → phone → code →
    name, «أنا», dialect, language → you're in. Expired codes open the expired screen with the family's name.
  - Family screens use the database: members list, roles (hand-over can't be undone from the toast), remove + undo,
    languages, dialect, list name (manager only), notification/voice switches. A failed save says so and reloads.
  - Settings → «تسجيل الخروج». Test menu → «تسجيل الخروج».
- **Hidden demo:** long-press the «سلّتنا» logo on welcome → the fake household from sessions 1–9 (shopper mode,
  notifications, helper view…). «اطلع من التجربة» in settings goes back. The demo resets when the app restarts.
- Tested on the simulator end-to-end with two test numbers (create «Test Home», join it, settings saved);
  test accounts deleted afterwards. Security tests still **38 / 38**.

### Next
- **Session 12: the live list.** Items read from and saved to the database (add, tick, edit, delete, undo, claim),
  **live sync** between phones (Supabase Realtime), «آخر نشاط» from `item_events`, catalog + dialect words from the database.

### Known issues / open questions
- **The list itself isn't saved yet** — items you add in a real household disappear on restart (session 12).
- Invite **links** don't open the app yet (needs a website/universal link); for now people type the 8-character code,
  which is included in the invite message.
- Sign-in only works with the 4 test numbers until real SMS (Twilio) is set up — paid; needed before launch.
- After 3 wrong codes the app locks the boxes; Supabase also limits tries on its side.
- «الإرسال على الواتساب» for codes → «قريبًا» (needs a WhatsApp Business account).
- Shopper mode, notifications screen and helper view only have data in the demo for now (sessions 12–13).

## Session 11b — 2026-10-15: Tabs, «حسابي» and profile (your request)

### Done
- **Bottom bar = 2 tabs + the mic in the middle** (agreed): «القائمة» · big orange mic «اضغط وتكلّم» · «حسابي».
  Built with Expo Router's own tabs (`expo-router/ui`) — no new library. Files moved: `src/app/index.tsx` →
  `src/app/(tabs)/index.tsx`, `src/app/settings.tsx` → `src/app/(tabs)/account.tsx`; new `src/app/(tabs)/_layout.tsx`.
- **List screen:** «اكتب غرض…» field under the header (opens type-to-add), and a dark **«أنا في السوق» pill** under the
  family faces (agreed: header pill). During your own trip it says «كمّل التسوق». The old bar's «اكتب» and
  «أنا في السوق» buttons are gone.
- **«حسابي» tab** (agreed: merged with settings): your card (face, name, role · dialect · language) → profile;
  «البيت»: أهل البيت + ادعُ شخص; list name (manager); notifications; voice & privacy; help; sign out / leave.
  The gear on «أهل البيت» is removed.
- **Profile screen** (`src/app/profile.tsx`): name, «أنا», color (6), dialect, list language, languages you speak → saved
  to the database (`updateProfile`), toast «انحفظ ملفك».
- **Loading:** the «سلّتنا» logo with a spinner instead of a blank screen while the app checks who you are.
- **Demo badge:** «تجربة» next to the household name in the demo; tap → leave the demo or keep trying.

### Known issues
- The phone hadn't loaded session 11 yet (only the simulator had). Rescan the QR code in Expo Go.
- Changing your list language in the profile still doesn't translate the app (only the helper view switches).

## Session 11c — 2026-10-15: Several lists + calmer list screen (your request)

### Done
- **Several lists, each with its own people** (agreed): «البيت»، «الشغل»، «الأصدقاء»… Each list is its own household
  in the database (own members, invite code, items) — no database change needed.
  - Tap the **list name** at the top → «قوائمي» sheet (`src/app/lists.tsx`): your lists with member counts, ✓ on the
    open one, «＋ قائمة جديدة». Also in «حسابي» → «قوائمي».
  - **New list** (`src/app/new-list.tsx`): name + suggestion chips (البيت، الشغل، الأصدقاء، الاستراحة، الرحلة، بيت أهلي) →
    created with you as manager (your profile is reused) → straight to its invite screen.
  - The app remembers the last list you opened (saved on the phone) and reopens it.
  - Joining someone's invite adds that list to yours; it doesn't replace your other lists.
  - In the demo, «قائمة جديدة» explains that lists need an account.
- **Calmer «القائمة» screen** (agreed layout):
  - The list's **name is the title** (with ▾) — the extra «قائمة البيت» line is gone. Long names shrink to fit.
  - Only the faces on the end side; the invite button moved out (it's in «حسابي» and «أهل البيت»).
  - **One action row:** «اكتب غرض…» field + a round dark **cart button** («أنا في السوق»; orange during your trip).
  - «سارة في السوق الحين» is now a **slim one-line bar** (tap → start/continue shopping).
  - Filters are quiet text: «12 غرض … الكل · اليوم 3».
- If the app can't reach the server on launch but you're signed in, it keeps the logo and retries (instead of
  showing welcome).
- Tested on the simulator: sign in → «Home» → new list «الشغل» → switch back → restart reopens «Home».
  Test account deleted afterwards.

### Known issues
- Items are still not saved (session 12), so every list starts empty after a restart.
- Leaving or deleting a list isn't available yet («اطلع من …» still says «قريبًا»).

## Session 11d — 2026-10-15: New sign-up flow, no tabs, floating mic (your request)

### Done
- **Sign-up flow** (after the phone code), 3 steps with dashes:
  1. **«عرّفنا عليك»** (`src/app/about-you.tsx`, was household-setup): name, «أنا», dialect — saved with the sign-in
     account (Supabase user data) until the first list exists, so closing the app mid-way doesn't lose it.
  2. **«أنشئ قائمتك الأولى»** (`src/app/first-list.tsx`): empty state with one button → **«سمّ قائمتك»** (new-list).
  3. **Add members**: the invite screen (WhatsApp / copy link), button «التالي».
  → lands on the empty list «السلة فاضية».
  Back on step 1 = sign out; back on step 2 = step 1. A returning user goes straight to their list.
- **No more tabs** (agreed). List screen header: list name ▾ (switch lists) on the right, **your avatar on the left**
  → «حسابي» (profile, lists, household, settings, sign out) as its own screen with a back button.
  Family faces + «N أفراد» under the list name (agreed) → «أهل البيت».
- **«اضغط وتكلّم» = floating orange mic, no text, bottom-left**. Long-press still = noisy-recording test.
- Signing out from anywhere closes open screens and shows welcome.
- If the saved sign-in points to a deleted account, the app clears it and shows welcome (fixes the
  "can't save «سمّ بيتك»" problem from earlier — it wasn't Arabic typing; typing Arabic is verified working).
- Removed: `src/app/(tabs)/`, `src/components/BottomBar.tsx`. Moved `account.tsx` and `index.tsx` back to `src/app/`.
- Tested on the simulator: sign out → welcome → 500000002 → عرّفنا عليك → أنشئ قائمتك الأولى → «البيت» →
  invite (code made) → «السلة فاضية». Test account 500000002 («Sara», «البيت») left in place for you to try.

### Known issues
- The list items are still not saved (session 12).
- Supabase had two short outages today (522); the app now retries while signed in.

## Session 12 — 2026-10-15: The live list

### Done
- **List items are saved in the database** and load when a list opens: add (type, basics chips, pasted list,
  voice review), tick «bought», delete (→ status «removed», kept for history), edit qty/unit/note, «أنا أجيبه».
  Each change shows on screen immediately, then saves; a failed save says «ما انحفظ…» and reloads the real list.
  New items get their real database id on the phone, so the live echo never duplicates them.
- **Live sync** (Supabase Realtime): others' changes appear by themselves. Others' additions show a small note
  «خالد أضاف «حليب»» (agreed); ticks and edits update quietly. Someone who joined after the list was opened is
  fetched automatically (name on the row + face in the header).
- **Undo** puts the old version back in the database; undoing a brand-new addition marks it «removed».
- **«آخر نشاط»** on «أهل البيت» now comes from the real item history (`item_events`): who added / bought what.
- «أضيف اليوم», «جديد» badges use the real times. Bought items are kept (agreed) — needed later for habits.
- Trip actions (cart, bought at the end of a trip, claims) also save the item changes; the trip itself
  (questions, summary) is still simulated until session 13.
- **Database changes** (`supabase/migrations/`):
  - `…120000_items_realtime.sql` — live updates for items.
  - `…121000_items_realtime_no_old_rows.sql` + `…121500_items_no_delete.sql` — **security fix found in testing**:
    realtime sends *delete* events without checking permissions, so a stranger listening could see a deleted
    item's name. Now delete events carry no data, and items can't be deleted at all (undo marks them removed).
  - `…122000_item_refs_check_changed_only.sql` — **bug fix found in testing**: deleting an account that had added
    items failed. Now works; their items stay with «who added» cleared.
- **Tests:** security tests now **41 / 41** (new: nobody can delete items; deleting an account with items works).
  Live test with three sessions: a member sees additions / ticks / undo live; a stranger receives nothing and
  can't read the list. In the app (simulator): items survive a restart; another person's additions appear live
  with their name; tick and undo saved. Test accounts 500000003/4 deleted afterwards.

### Next
- **Session 13: trips, questions and push notifications** — «أنا في السوق» saved as a real trip (others see
  «سارة في السوق»), «ما لقيته» questions between phones, trip summary, real notifications (needs `expo-notifications`
  and a development build — will ask).

### Known issues
- In Expo Go the floating Expo tools button (gear) sits on top of «تراجع» — drag it away; not in the real app.
- Type-to-add's catalog and dialect words still come from the app's built-in copy (same data as the database).
- Items with no translation show the Arabic name in the helper view (as before).

## Session 13 (Part A) — 2026-10-15: Live trips and questions

Agreed: trips + questions now, real push notifications in their own session (needs accounts — see Next).

### Done
- **«أنا في السوق» is a real trip** in the database. Everyone else in the list sees «سارة في السوق الحين» live,
  plus a note «سارة راحت السوبرماركت · ناقصك شي؟». «خلّصت» / leaving shopping ends it for everyone.
- Items the family adds during my trip appear on my shopping screen as «أضافه للتو» (live).
- **Questions between phones:** «ما لقيته» → «اسأل خالد» saves a real question. Khalid sees an **orange card at the
  top of his list** (agreed) «سارة تسألك · حليب خلصان. أجيب حليب قليل الدسم؟» with 3 quick replies
  (or tap → the full answer screen). The shopper gets «خالد ردّ: …» live and the item swaps / goes / waits.
- **Reopening the app mid-trip** returns to shopping mode (cart button orange, banner «أنتِ في السوق»).
- Trip summary: «كم دفعت؟» amount is saved on the trip.
- Start-trip sheet: «سارة تتسوق من 10 دقايق» now uses the real person and real minutes.
- Database: `…130000_trips_questions_realtime.sql` (live trips/questions) and
  `…131000_trip_question_checks_changed_only.sql` (**bug found in testing**: deleting an account that had shopped or
  asked a question failed — fixed like items in session 12).
- **Bug found in testing:** the «حليب مو موجود؟» sheet opened a bit short and then grew, pushing «أرسل السؤال» off the
  bottom of the screen. It now opens at its full size.
- **Tests: 52 / 52** security tests (new: only the person asked can answer; you can't ask or start a trip as someone
  else; strangers see no trips/questions; trips and questions can't be deleted; account deletion with trips works).
  Live test on the simulator (Sara) + a second account (Khalid): his trip → Sara's banner; his question → Sara's card;
  Sara's answer saved; Sara's trip → Khalid notified; Khalid adds milk during Sara's trip → appears on her screen;
  Sara asks → Khalid answers → Sara sees it live; Sara finishes → Khalid sees it end. Test account deleted afterwards.

### Next
- **Session 14: real push notifications** — needs from you: a free **Expo account** (expo.dev) and an
  **Apple Developer account** ($99/year) for a real iPhone; then libraries `expo-notifications` + `expo-device`
  (will ask), a development build of the app (Expo Go can't receive push), and a small Supabase function that sends them.

### Known issues
- After reopening the app mid-trip, items added before the restart no longer show as «انضافت وقتها» in the summary.
- Split shopping (two shoppers at once) uses the live trips, but who-takes-which-aisle is still simple (each claims items).
- Your «البيت» list (Sara, 500000002) has «طماطم، ماء، بصل» bought in a trip at 2:41pm — that wasn't me; probably you
  testing on your phone. 

## Session 13b — 2026-10-15: Voice paused (your request)

Real voice (speech → items) was planned, then cancelled before any code was written. Nothing installed.

### Done
- **All mic buttons hidden** behind one switch: `src/lib/features.ts` → `voice: false`.
  Hidden: the floating orange mic on the list, the mic inside «اكتب غرض…», «أضف بالصوت» on the demo
  notifications screen, and «الميكروفون مقفول» in the test menu.
- The voice screens themselves are kept. To bring voice back, change `voice: false` to `voice: true`.
- **Cleaner welcome screen** (`src/app/welcome.tsx`), no voice promise:
  - The voice bubble, arrow and example list card are gone: just the logo, title, text and benefits.
  - New body text: «كل العائلة تضيف للقائمة وتشوفها لحظتها. بدون فوضى مجموعة الواتساب.»
  - The 3 chips became 3 clear benefit lines with icons: «تتحدّث عند الكل لحظتها» · «تعرف مين في السوق الحين» ·
    «السايق والعاملة يشوفونها بلغتهم».
  - Text updated in ar/en/hi; the unused `heroCardWidth` was removed from the theme.

### Next
- Pick the next feature: real helper view, catalog from the database, known-issue fixes,
  or push notifications (session 14, needs the Expo + Apple accounts).

### Known issues
- Items that were added by voice in the demo still show a small mic next to the name.

## Session 13c — 2026-10-15: App text in Egyptian dialect (your request)

Agreed: replace the Saudi wording everywhere (one Arabic version for everyone).

### Done
- `src/i18n/ar.json` rewritten in Egyptian: 462 of 718 lines changed, same keys, same `{{placeholders}}`,
  plural and ـf/ـm forms kept. Examples: «وش ناقص البيت؟» → «البيت ناقصه إيه؟», «الحين» → «دلوقتي»,
  «أنا أجيبه» → «أنا هجيبه», «ما فيه» → «مفيش», «أمس» → «امبارح», «غرض» → «حاجة», «جوال» → «موبايل»,
  «رابط/رمز» → «لينك/كود», «العائلة» → «العيلة», «السائق والعاملة» → «السواق والمساعدة».
- List suggestions: «الأصدقاء» → «الصحاب», «الاستراحة» → «المصيف».
- Checked on the simulator (welcome + demo list).

### Known issues / decisions needed
- **Still Saudi-specific (left on purpose, they're not wording):** phone numbers must be Saudi (+966, «رقم سعودي
  يبدأ بـ5»), and the trip amount is in «ر.س». Switching to Egyptian numbers (+20) and «ج.م» is a separate change.
- **Product names** come from the catalog, not the text file: «حليب» (Egyptians say «لبن»), «خبز» («عيش»), etc.
  The Egyptian dialect words are already in the catalog for search; the display names are still Gulf-style.
- The paused voice demo sentence is still Saudi («نبي حليب ثنتين…»), hidden while voice is off.

## Session 13d — 2026-10-15: Norsal font (your request)

### Done
- **Norsal replaces Readex Pro** for Arabic + Latin. Hindi still uses Noto Sans Devanagari.
- Your file `Resources/Fonts/norsal/norsal.ttf` is a *variable* font whose default is the heaviest weight (Black 900);
  React Native can't reliably pick weights from it. So four fixed weights were cut from it (same 4 the app uses):
  `assets/fonts/Norsal-Regular.ttf` (400), `-Medium` (500), `-SemiBold` (600), `-Bold` (700), ~90 KB each.
  New folder: `assets/fonts/`. Loaded in `src/app/_layout.tsx`; names in `src/theme/index.ts` (`fonts`).
- The font tool (fontTools) ran in a temporary folder only — nothing new in the app's libraries.

### Known issues / decisions
- **Final «ي» sometimes shows without dots on iPhone** («فى», «تانى», «عندى»), mostly in medium/bold text.
  Same as with Readex Pro before (see session 1). The font files themselves are fine: drawn directly by macOS, every
  weight shows the dots. Needs its own investigation (likely how iOS shapes the text, not the font).
- `@expo-google-fonts/readex-pro` is still installed but unused — can be uninstalled (will ask).
- CLAUDE.md still says "Fonts: Readex Pro" — update it if Norsal is the final choice.
- Please check Norsal's license (by Baianat) allows embedding in an app.

## Session 13e — 2026-10-15: Three tabs with Apple's native tab bar (your request)

Agreed: «بالسوق» shows a start-shopping page before a trip; «قوايمي» opens straight to the current list.

### Done
- **Native iOS tab bar** (Liquid Glass on iOS 26) via expo-router's built-in `NativeTabs` — no new library.
  Apple icons (SF Symbols): list · cart (filled when selected) · person. Orange tint. Shrinks while scrolling down.
  Hidden while signed out / loading (welcome and sign-up open over it).
- **Project structure:** `src/app/(tabs)/` with `_layout.tsx` (the tab bar), `index.tsx` (list, moved),
  `market.tsx` (new), `account.tsx` (moved, no back button now).
- **«قوايمي»**: the list screen without the avatar (now the «حسابي» tab) and without the round cart button
  (now the «بالسوق» tab). The «… في السوق دلوقتي» banner opens «بالسوق».
- **«بالسوق»**: before a trip → full page «رايحة السوق؟» (store, split with whoever's shopping, «ابدأ التسوق»);
  during my trip → the live shopping screen (`src/components/shop/ShopView.tsx`, was `app/shop.tsx`).
  «رجوع للقائمة» switches to «قوايمي». A badge dot shows while anyone in the family is shopping.
  The old start-trip sheet became `src/components/shop/StartTripView.tsx`; routes `/shop` and `/start-trip` are gone.
- After the trip summary («بلّغ العيلة وارجع للقائمة») the app returns to «قوايمي».
- Theme: `size.tabBar` (64) — room kept above the tab bar for footers, toasts and the list's last row.
- Tab names in ar/en/hi: «قوايمي · بالسوق · حسابي».
- Tab bar is forced right-to-left (works in Expo Go too): «قوايمي» on the right. Labels use Norsal
  (medium, semibold + orange when selected). Apple mirrors the list/cart icons for RTL by itself.

### Known issues
- Starting/finishing a trip from the new tab wasn't run end-to-end on the simulator (it was signed in to your
  «البيت» list and I didn't want to start a real trip there). Typecheck passes; please try it in the demo.
- The empty list still says «دوس الزرار وقول…» (talk to the mic) although voice is paused.

## Session 13f — 2026-10-15: «قوايمي» overview (your request)

Agreed: the «+» on a card invites someone to that list.

### Done
- **«قوايمي» tab opens on an overview** (`src/app/(tabs)/index.tsx`): title «قوايمي», one card per list with
  its name, its people's faces (up to 5, then «+N»), «N أفراد», a dashed «+» (invite to that list) and a chevron;
  then a dashed «قائمة جديدة» card (→ name a new list → invite). Demo: «قائمة جديدة» explains it needs an account.
- **Tap a card → that list** opens full screen over the tabs (`src/app/list.tsx`, the old list screen); the tab bar
  is hidden there (it has a back arrow; swipe back works too). The list loads first (small spinner on the card).
  Header is one row: back arrow · list name · up to 3 faces (then «+N») · dashed «+» to invite.
- The overview is now the app's gate (logo while loading, welcome when signed out, sign-up without a list).
- The old list-switcher sheet (`app/lists.tsx`) is gone; «قوايمي» in «حسابي» opens the tab.
  «رجوع للقائمة» while shopping and the end of a trip go to the open list.
- Lists now load with their members (names + colors) for the faces — same tables and security rules, no migration.
- Fixes: the hidden «بالسوق» tab turned the clock white during a trip; the tab badge is orange now.
- New text (ar/en/hi): `lists.cardA11y`, `lists.inviteA11y`, `lists.backA11y`. Theme: `opacity.pressed`.

### Known issues
- Faces on the cards refresh when lists reload (opening / switching a list), not live when someone joins.
- Your «الشغل» list (Sara) has a shopping trip running — started earlier on your phone, not by me.
- **«بالسوق» shopping screen restyled like the list screen** (your request: no black header): light page background,
  big dark title «إنتي في السوق», muted line under it, a small white «● العيلة عارفة إنك هنا» pill (green dot),
  progress bar on light colors (gray track, orange fill). No back arrow (it's a tab). `ShopHeader` / `LivePill` /
  `ProgressBar` in `src/components/shop/ShopParts.tsx`; the shop screen no longer switches the status bar to white.
  Checked in the demo (start a trip → tick an item → bar fills).
- The simulator is now in the demo (I signed Sara out to try a pretend trip without touching your real lists).
- **Swipe items while shopping** (your request; agreed: only the «بالسوق» screen). Physical directions:
  swipe **left** → green «✓ اشتريتها» (into the cart); swipe **right** → orange «ملقتهاش» (opens «… مش موجود؟»:
  ask / next time / remove). Let go past ~1.5 row-actions (or flick) to act; a short drag springs back; a light
  vibration when it's far enough. Works on my items and on «محدش أخده» items (left = take it + in the cart).
  Tapping the circle still works; screen readers get both actions. `SwipeShopRow` in `ShopParts.tsx`.
  The shop list now uses the gesture-friendly ScrollView. New text: `shop.swipeBought`, `shop.swipeNotFound`.
- **Fix:** the floating tab bar covered the bottom of the shopping sheets («ابعت السؤال»). It now hides while a
  sheet is open on «بالسوق» (`src/lib/tabBar.tsx`, `useHideTabBar`).
- **Shopping footer removed** (your request): no more «خلصت التسوق» / «حاجة ملقتهاش» buttons at the bottom.
  Agreed replacement: a small dark **«خلصت»** pill next to the title (same as before: asks «ماشية قبل ما تخلصي؟»
  if items are left, otherwise opens the summary). «ملقتهاش» = swipe right. The «● العيلة عارفة إنك هنا» pill and
  the «إيه اللي ملقتهوش؟» picker sheet were removed (unused now). New text: `shop.doneShort`.

## Session 13g — 2026-10-15: Quick fixes for Egypt (your request)

Agreed: phone numbers Egypt only (+20).

### Done
1. **Empty list** no longer says «دوس الزرار وقول…» while voice is off: «اكتب اللي ناقص البيت في الخانة اللي فوق.»
   and the voice examples are hidden (they come back with `features.voice`). New text `empty.subtitleType`.
2. **Dotless «ي» fixed.** Cause: the font says its letters go down to -195, but the dots of «ي» go to about -455,
   so iOS cut them off. The 4 Norsal files in `assets/fonts/` now declare enough room (descender 470).
   «في، دلوقتي، عندي» show their dots in every weight and size. Lines are a little taller as a result.
3. **Egypt: phone +20 and money ج.م.** The phone field takes 10 digits starting with 10/11/12/15 («10 0000 0001»);
   typing the local 0 («010…») or pasting «+20 …» works. Trip summary shows «ج.م» (EGP in en/hi).
   **New test numbers** (no SMS, code 123456): **+20 1000000001 … 1000000004** — pushed to Supabase
   (`supabase/config.toml`), checked by signing in once from a script.
   (Cleaned up 2026-10-16: the old Saudi test accounts منى and Sara and their 5 lists were deleted.)
4. **Product names in Egyptian:** لبن كامل/خالي الدسم (was حليب), عيش فينو / عيش توست (was خبز), مياه, زبادي,
   بن, جبنة, مسحوق غسيل, حبهان. Old names still find them in search. «عيش» = bread in Egypt (and still rice for
   Gulf dialects); «لبن» = milk in Egypt (yogurt for Gulf/Levant). Quick-add chips: لبن، عيش، مياه….
   Database: `migrations/20261015140000_catalog_egyptian_names.sql`, `…141000_catalog_egyptian_translations.sql`
   (English/Hindi names follow: Fino bread, Coffee, Laundry detergent). Items already on lists keep their names.

### Known issues
- The hidden voice demo sentence is still Saudi (voice is paused).
5. **«بالسوق» start page redesigned** (your request; agreed: list card + store tiles):
   - A white **list card**: the list you're shopping for, its faces, «N حاجات» and the first 3 items («طماطم · بيض ·
     عيش · +1»); an empty list says «القائمة فاضية دلوقتي — العيلة تقدر تضيف وإنت في السوق.». With more than one
     list, a «▾» appears and tapping the card opens a bottom sheet «أنهي قائمة؟» (each list with its faces,
     ✓ on the open one; the tab bar hides while it’s open) to switch.
   - **Stores as a 2×2 grid of tiles** with icons (cart, shop, pill, croissant) — nothing runs off the screen anymore;
     the chosen one gets a dark border and an orange icon.
   - New text: `market.whichList`, `market.more`, `market.emptyHint`.
6. **Remove a list** (your request; agreed: delete for everyone, «…» menu on each card):
   - Each card in «قوايمي» has a «…» button → sheet with the list's name and one action:
     - the **manager** sees «امسح القائمة · هتختفي عند كل اللي فيها» → confirm «تمسح «X»؟» → gone for everyone;
     - **others** see «اخرج من القائمة · هتختفي عندك بس…» → only they lose it.
   - Toasts «اتمسحت «X»» / «خرجت من «X»». If it was the open list, the next one opens; with none left → «أنشئ قائمتك الأولى».
     Not shown in the demo.
   - Database: `migrations/20261015150000_delete_household.sql` — new safe door `delete_household` (manager only).
     **Soft delete**: nothing is erased; the list is marked deleted, everyone is moved out (so the security rules
     hide it), running trips end, invite codes stop working, `get_invite` / `join_household` refuse deleted lists.
   - **Tests: 60 / 60** (8 new). Also checked live with two throwaway test accounts (deleted afterwards):
     a member can't delete, can leave; the manager deletes; nobody sees it; the old code can't rejoin.

### Known issues
- (fixed) «حسابي» bottom row now works: manager → «امسح القائمة», others → «اطلع من …» (same as the «…» menu).
- The manager can't just *leave* a list that has other people (they'd have to hand over first) — only delete it.

## Session 14 — 2026-10-15: Real helper view (driver / maid)

Agreed: join steps in the helper's language; helpers can tick «bought» and add items by typing.

### Done
- **Inviting a helper** (family side): «ادعي السواق أو المساعدة» on the invite screen → its own *helper* invite code,
  shared with a message in English + Hindi.
- **Joining as a helper**: on «عندي دعوة من العيلة», a helper code switches the screen to English (Hindi / Arabic
  one tap away) and left-to-right; the code and «about you» steps follow (no Arabic-dialect question; tips: tick when
  bought, add by typing). Welcome has a small English line for drivers / helpers.
- **The helper's own home** (`src/components/helper/HelperHome.tsx`) instead of the family tabs, whole app in their
  language: list in English / Hindi with the Arabic name underneath, «N of M left to buy», tick = bought (saved live),
  **«Add an item…»** with search in their language («milk» → «Full-fat milk · لبن كامل الدسم», «tomat» → Tomatoes),
  language switch (saved to their profile), avatar → sign out. Demo «شوف القائمة كأنك Rahul» still works (`app/helper.tsx`).
- Database: `migrations/20261015160000_get_invite_role.sql` (`get_invite` also returns the role). **Tests 61/61.**
- Hindi translations for sign-in / join / helper texts (please have a Hindi speaker check them).
- Checked on the simulator with test accounts: +20 1000000003 (أم علي, list «بيت التجربة», manager) and
  +20 1000000004 (Rahul, helper): join in English/Hindi → helper home → add Tomatoes → tick «Malk» → saved.

### Known issues
- After «Open the list» it takes ~8 seconds before the helper's list appears (loading the list) — to speed up.
- In Expo Go, moving screen files can break the live reload («Requiring unknown module») — fully restart Expo Go.
- The family side shows a helper's items as normal (no change needed), but a helper can't yet edit quantity or say
  «not found»; no voice (paused).
- Test data left for you to try: list «بيت التجربة» (owner 1000000003, helper 1000000004, code 123456).

## Session 15 — 2026-10-16: Admin dashboard (part 1: users)

Agreed: a web page on the computer; see new sign-ups, block / unblock, delete users; a small admin team.
Part 2 (later): editing the product list (needs the app to read products from the database first).

### Done
- **New folder `dashboard/`** — a small website (Vite + React + TypeScript + supabase-js, installed inside
  `dashboard/` only). Arabic, right-to-left, the app's colors and Norsal font. Start it with `npm run dashboard`,
  open http://localhost:5199. It reads the app's `.env` (public key only — no secret keys anywhere).
- **Sign in** with phone + code (same as the app). Only people on the admin list get in; others see «الحساب ده مش مسؤول».
- **نظرة عامة**: users (total · today · 7 days · 30 days · active · blocked), lists (active · with a helper), helpers,
  items added (today · week), trips this week, money spent this week, a 14-day sign-up chart, the 10 most-added items.
  «Today» counts in Egypt time.
- **المستخدمين**: everyone, newest first — name, phone partly hidden («+20 10•• ••• 0001»), signed up, last sign-in,
  lists + role, items added; search, filters «جداد (7 أيام)» / «محظورين»; **block / unblock** (signed out
  everywhere, «User is banned» on sign-in) and **delete** (account + lists only they're in), each asks first.
- **المسؤولين**: the team; add by phone (must have used the app once), remove. First admin: +20 1000000001.
- Database: `migrations/20261016090000_admin_dashboard.sql` (+ `…091000` Egypt time & phone format,
  `…092000` block date). Admin list lives in the private schema; every admin door checks the caller first.
  **Tests 78/78** (17 new: signed-out and normal users are refused everything; admins can; can't block/delete
  yourself; phones hidden). Checked live: block → «User is banned», unblock → signs in again.
- App `tsconfig.json` excludes `dashboard/`; `.claude/launch.json` has a «dashboard» entry.

### Known issues
- Runs only on this computer for now (putting it online, e.g. Vercel, is a later step).
- Delete is permanent; blocked users still appear in their lists for the family (they just can't sign in).

## Session 16 — 2026-10-16: Quick polish

Agreed: (1) faster opening, (2) helper «Not found» by swipe (same as shopping), (3) rename a list.

### Done
1. **Faster opening of lists.** Main cause found: **the database is in Seoul (`ap-northeast-2`)**, so every request
   takes ~0.3–1 s from Egypt. Opening a list made 3 requests in a row; now `api.loadMyLists()` gets my lists, their
   people and the open list in **one** request (measured 309–427 ms instead of 663–1412 ms), and the stale-sign-in
   check runs at the same time instead of first. (`loadMembership` / `listMyHouseholds` are now shortcuts to it.)
2. **Helper «Not found».** On the helper's list: swipe left = «Got it» (bought), swipe right = «Not found».
   The swipe is now one shared piece (`src/components/SwipeActions.tsx`) used by both the shopping screen and the
   helper. The family sees an orange card at the top of their list — «ملقوهاش في المحل · N» with «رجّعها» (back on
   the list) / «شيلها» (remove) per item (`src/components/NotFoundCard.tsx`) — and a live note «"X" ملقوهاش في المحل».
   No database change (the `not_found` status already existed).
3. **Rename a list**: «…» on a card → «غيّر الاسم» (manager only) → name field + «حفظ»; the card and the open list
   update at once (`renameList` in the store). Sheets now rise above the keyboard (`Sheet.tsx`).
- Checked: typecheck; rename sheet on the simulator (opened, not saved — the simulator was on your account);
  not-found → family sees it live → put back, and rename (helper refused) with the test accounts.

### Known issues / decision for you
- **Move the database closer to Egypt** (e.g. Frankfurt `eu-central-1`) would make *everything* 2–3× faster.
  Supabase can't move a project: it means a new project + copying the data (a session of its own).
- The helper's swipe and the family's «ملقوهاش» card weren't tried on the simulator screen (only the data side).

## Session 17 — 2026-10-16: Dashboard part 2 — the product list

Agreed: removing a product hides it (items already on lists keep working; it can be brought back).

### Done
- **The app reads products from the database** (`api.loadCatalog` / `loadCachedCatalog`, `setCatalog` in
  `src/data/fakeCatalog.ts`): the built-in list is only a first-launch backup; the phone keeps the last list
  (instant + offline) and fetches the latest when the app opens. Words follow my dialect: shared words + my
  dialect's only («عيش» = bread for Egyptians, rice for Gulf dialects). Hidden products are skipped in search.
- **Dashboard «المنتجات» page** (`dashboard/src/pages/Products.tsx`): all products with category, usual quantity,
  English / Hindi names, «suggest instead» product and the words that find them; search, category filter,
  show hidden; **add / edit** (form), **hide / bring back**, **add / remove words** (all dialects or one dialect).
- Database: `migrations/20261016100000_admin_products.sql` — `catalog.hidden`, `catalog.updated_at`, admin-only
  doors `admin_save_product`, `admin_set_product_hidden`, `admin_add_alias`, `admin_remove_alias`.
  **Tests 88/88** (normal users can only read; admins can add/edit/hide and manage words; names stay unique).
- Checked live: added «جبنة رومي» (dairy, 1 kilo, Roumi cheese, word «رومي») in the dashboard → the app found it
  when typing «رومي», no app update.
- **Bug found and fixed**: the launch speed-up from session 16 ran the "is this sign-in still valid" check at the
  same time as loading, which signed out a phone whose sign-in was over an hour old. Now the sign-in is renewed
  first (`api.freshSession`), then both run together. (The simulator was signed out once by it — signed back in.)

### Known issues
- Product changes reach a phone the next time the app is opened (not while it's open).
- The «عادةً بتشتروا / قرّب يخلص» suggestions still use example habits (real buying history is a later feature).
- **Starter product set added** (your request, done by Claude through the admin doors as the admin test account):
  **85 everyday Egyptian groceries** + 119 search words → **107 products, 185 words** in total. Source file:
  `supabase/seed/starter_products.json` (produce 22, dairy 8, bakery 5, pantry 29, meat/frozen/baby 10 under
  «حاجات تانية», cleaning 11). No duplicates with the existing products. Hindi names should be checked by a speaker.
- **200 more products added** (your request) through the admin doors: `supabase/seed/more_products_200.json`
  (produce 39, dairy 17, bakery 17, pantry 66, meat/frozen/baby/pets/household 33 under «حاجات تانية», personal care
  & cleaning 28) + 141 search words. **Totals now: 307 products, 326 words.** Checked for duplicates against the
  database first (none). Hindi names should be checked by a speaker.

## Session 18 — 2026-10-16: Full test on two simulators

Phone A = سلمى (iPhone 17 Pro), Phone B = أم علي, then Rahul (helper), then أم علي again (iPhone 17).

### Passed
- Invite → join on the other phone (Arabic join screen, wrong-code error, Egyptian dialect default) → both phones
  show the shared list with faces and «فردين».
- Live sync: items added on one phone appear on the other in ~3 s with «جديد» + toast; ticks sync and disappear.
- Shopping trip: start → the other phone gets «أم علي في السوق دلوقتي» + tab dot; family adds during the trip →
  shopper sees it highlighted («سلمى لسه ضايفاه»); tick → progress bar; swipe right → «مش موجود؟» sheet → ask →
  family gets the question card → answer → shopper gets the reply; «خلصت» → finish sheet → summary → banner clears.
- Helper (Rahul): helper screen in English, add by typing (suggestions), swipe right = not found, swipe left =
  bought, switch to Hindi — all saved in the database. Family (owner) sees «ملقوهاش في المحل» card → «رجّعها» works.
- Create list («الرحلة» chip) → invite screen → delete list with confirmation. Sign out → back to Arabic welcome.

### Fixed this session
- Code boxes: after a wrong code you couldn't type a new one. Now the next digit starts a fresh code.

### Bugs found (1, 3, 5 handled later the same day — see below)
1. **Helper lands on the family «حسابي» screen** after signing in, if that tab was open when the last person signed
   out (half English / half Arabic, with family-only rows). A restart shows the right helper screen.
2. **Trip summary says «جبنا X بداله»** when the family answered "yes, bring anything close" — even if the shopper
   never ticked it (it's still open on the list). `ListStore` records it as "swapped" with the same name.
3. **Main bottom buttons need two taps** while the text field is active («ابعت الكود», «اعمل القائمة»): the first
   tap only closes the keyboard. Will happen on real phones.
4. **List looks empty while loading** after a restart («0 of 0 · Nothing left to buy»), then fills in. Should show
   loading, not the empty state.
5. **App doesn't refresh when it comes back** (open overnight / network changed → list showed empty or missing an
   item until restart). Also new members don't appear on other phones until restart.
6. «الصوت والخصوصية» settings still show in «حسابي» although voice is off.

### Small wording issues
- «سلمى (إنت)» and «أهلًا بيك» use the masculine form for women (should follow the person's gender).
- Delete confirmation says «عند الكل (فرد واحد)» on a one-person list.
- On a «سيبه للمرة الجاية» answer pending, the shopper's section title reads «للمرة الجاية» while still waiting.
- Helper toast «Added "طماطم شيري"» shows the Arabic name instead of the helper's language.
- The Expo dev gear button covers buttons on the simulator (dev only — not in the real app).

### Not tested
- Leaving a list (would undo the test join), real SMS (needs Twilio), push notifications (not built), dashboard
  (tested in sessions 16–17).

### Follow-up the same day: bugs 1, 3, 5
- **Bug 1 fixed**: signing out goes back to «قوايمي» first, so whoever signs in next starts there
  (`(tabs)/account.tsx`). Safety net: a helper who lands on «بالسوق» or «حسابي» is sent to their helper screen
  (`(tabs)/account.tsx`, `(tabs)/market.tsx`). Checked: «حسابي» → sign out → sign in as Rahul → helper screen.
- **Bug 3 was not a real bug**: the test tapped the button a split second after typing, before it turned on.
  With a normal pause, «ابعت الكود» and «اعمل القائمة» work on the first tap. No change.
- **Bug 5 fixed**: when the app comes back from the background, it loads the list again (items, trips,
  questions, the people and the other lists) and reconnects the live updates (`ListStore.tsx`, `resync`).
  Checked: Phone A in the background → أم علي added «زبادي» → Phone A back → it's there; then «بيض» arrived live.
- Still open: bugs 2, 4, 6 and the wording issues above. New members still only appear live after the other
  phone comes back to the app (no live "someone joined" yet).

## Session 19 — 2026-10-16: The rest of the test bugs (2, 4, 6) + wording

### Done
- **Bug 2 fixed** — trip summary: «جبنا X بداله» only if X really went in the cart. If the family said "bring
  something close" but it wasn't ticked, the summary says «X — رجع للقائمة» with their reply underneath
  (`ListStore.tsx`, `finishTrip`). Checked on the simulators with a real trip.
- **Bug 4 fixed** — while a list's items are still loading, the family list and the helper screen show a spinner
  instead of the empty state («0 of 0 · Nothing left to buy»). If loading fails, the spinner stops and live changes
  still arrive (`ListStore.tsx` `itemsLoading`, `list.tsx`, `HelperHome.tsx`).
- **Bug 6 fixed** — «الصوت والخصوصية» is hidden in «حسابي» while voice is off (`features.voice`).
- **Wording** — «(إنت)/(إنتي)» and «أهلًا بيك/بيكي» follow the person's gender (new `_m`/`_f` keys in ar/en/hi).

### Next
- Remaining wording: «عند الكل (فرد واحد)» on a one-person list; the «للمرة الجاية» section title while still
  waiting for an answer; the helper's "Added" toast shows the Arabic name.
- Live "someone joined" (today new members appear when the app comes back to the front).

### Known issues
- The loading spinner is quick on a good connection, so it was checked in the code, not seen on screen.

## Session 20 — 2026-10-17: Product photos («صوّرها عشان ميغلطش»)

Agreed: a family's photo goes on the item **and** becomes that family's picture of the product (other families
never see it); admins set official product pictures in the dashboard; new library `expo-image-picker` (approved).

### Done
- **Item screen**: «صوّرها عشان ميغلطش» → «صوّر دلوقتي» / «اختار من الصور» → the photo shows on the item with
  «صورة العيلة · هتظهر كل مرة تضيفوها»; «غيّر الصورة» / «شيل الصورة». Photos are cropped 4:3 and compressed.
- **Lists**: a small photo on the row (family list, shopping list, helper screen); tap → full screen.
  Which picture shows: the item's own photo → the family's photo of that product → the official picture.
- **Dashboard «المنتجات»**: a «صورة» column, and «صورة المنتج» in the edit form (upload / change / remove, max 5 MB).
- **Database** (`20261016120000_product_photos.sql`, `20261017090000_product_photos_admin_list.sql`):
  - `family-photos` storage (private): files under `<household id>/…`, only that household can see/add/remove.
  - `product-photos` storage (public to view): only admins upload/replace/remove.
  - `items.photo_path` (must be in the household's own folder), `catalog.image_path`,
    `household_product_photos` table (one picture per product per family), `admin_set_product_image`.
  - **Security tests 104/104** (16 new: strangers can't see/add/replace another family's photos or point an item at
    them; non-admins can't upload or set official pictures; admins can).
- Checked on the simulators: أم علي picked a gallery photo for «بيض» → saved → سلمى (same family) saw it on her list
  and opened it full screen; saved as the family's picture of «بيض». Dashboard: uploaded a test picture to «باجيت»,
  then removed it (file deleted too).
- **Bug found and fixed while testing**: removing a picture in the dashboard left the file in storage (admins
  couldn't "see" the files, which Storage needs to delete). Fixed with the second migration.

### Known issues
- The camera itself can't be tested on the simulator (no camera) — only "choose from photos". Try the camera on a phone.
- No official pictures are uploaded yet — products show no picture until an admin adds one or a family takes one.
- On the real App Store build the camera/photos permission text is the one in `app.json` (Arabic + English).
- Noticed in the data: a shopping trip as سلمى started at 22:33 yesterday is still open, and «زبادي» was removed at
  the same time (not from my test steps) — «خلصت» on Phone A will close it.

### Follow-up: family photos as suggestions (your request — "images not updated in dashboard")
Your «عيش فينو» photo was saved correctly, but the dashboard only showed official pictures. Agreed: family photos
show up as suggestions, and an admin approves one to make it official for everyone.
- Database (`20261017100000_photo_suggestions.sql`): admins can *look at* families' product photos (not change or
  remove them); `admin_photo_suggestions()` lists them (photos from deleted lists are left out).
  **Security tests 109/109.**
- Dashboard «المنتجات»: «صور مقترحة (N)» filter, «صورة مقترحة» badge on the product, and «صور من العائلات» in the
  edit form with «من «اسم القائمة»» and «اعتمدها» (copies the photo into the official pictures).
- Checked: your «عيش فينو» photo appeared as a suggestion → «اعتمدها» made it official → removed again afterwards
  (it's a flowers test photo). Both family photos are kept.
- Note: an approved picture reaches phones the next time the app is opened.
- Privacy: admins can see family product photos to review them — this should be mentioned in the privacy policy.

## Session 21 — 2026-10-18: Project folders (frontend / backend)

Agreed: `frontend/mobile` (phone app), `frontend/dashboard` (admin website), `backend/supabase` (database);
design and notes stay at the top. Also your standard for future projects.

### Done
- Moved everything with git (history kept). No code behaviour changed; the online database is untouched.
- Fixed the paths that pointed to the old places: dashboard keys and fonts (now from `frontend/mobile`),
  the app's typecheck settings, `.gitignore`, preview settings.
- New top-level `package.json` with shortcuts only (no libraries): `npm run app`, `dashboard`, `db:push`, `db:test`,
  `typecheck`. README and CLAUDE.md describe the new layout.
- Checked: both apps typecheck; security tests 109/109 from `backend/`; all 19 database changes match online;
  the app runs on the simulators from `frontend/mobile` (same address exp://192.168.1.39:8081); the dashboard runs
  with its font and live numbers.

### Known issues
- Your old «expo server» terminal tab was stopped (it ran from the old folder). The app now runs in the
  «app server» tab — start it next time with `npm run app` from the top folder.
- Noticed in the data (not from the move): on 17/10 at 14:07–14:08 سلمى deleted «المصيف», «بيت أهلي», «الشغل» and
  created «الصحاب». The «بيت أهلي» photo suggestions no longer show in the dashboard (deleted lists are left out).

## Session 22 — 2026-10-19: Dashboard on Vercel + official pictures in the app

### Done
- **Dashboard online** at https://sallitna.vercel.app/ (Vercel, Root Directory `frontend/dashboard`, Vite).
  Two variables in Vercel: `EXPO_PUBLIC_SUPABASE_URL` (no `/rest/v1/` at the end) and `EXPO_PUBLIC_SUPABASE_KEY`
  (publishable key only). Supabase "integration" in Vercel was skipped on purpose (it would add the secret key).
  Every change merged to main republishes it. Checked: the build works with the keys coming from Vercel.
- **Bug fixed — official pictures didn't show in the app** (found with «باجيت»): the latest product list arrived
  but the screen wasn't redrawn, so pictures added in the dashboard stayed invisible. Now the list redraws when the
  product list arrives, and the product list is downloaded again when the app comes back to the front
  (`ListStore.tsx`). App typecheck passes.

### Next
- Remaining wording from session 21 (one-person list, «للمرة الجاية» title, helper toast in Arabic).
- Hindi translations (only ~130 of ~750 texts are in Hindi so far).

### Known issues
- Not yet seen on a phone: a picture approved in the dashboard should now appear after switching back to the app.
- A family's own photo of a product still wins over the official picture (by design).

## Session 23 — 2026-10-19: One photo per product in each list (agreed: option A)

Agreed: a list keeps **one** photo per product — the latest one. Anyone in the list can replace it, and the new photo
shows for everyone in that list. Photos never reach other lists; the dashboard's main picture is the fallback when a
list has no photo; family photos stay suggestions in the dashboard. (Sharing the latest photo with *all* lists was
dropped: privacy of home photos, and no one would check them first.)

### Done
- This was already how the app works; added one line under the photo buttons on the item screen so people know:
  «الصورة الجديدة هتظهر لكل أعضاء القائمة مكان القديمة» (ar/en/hi, new key `detail.photoChangeHint`).
  App typecheck passes.

### Known issues
- When a photo is replaced, the old file stays in storage (not visible anywhere). Worth a cleanup later.
- Not seen on a phone yet.

## Session 24 — 2026-10-19: Upload many product pictures at once (dashboard)

Agreed: a bulk upload in the dashboard for all ~285 products; pictures in one consistent style (source still open —
AI-generated recommended).

### Done
- Dashboard «المنتجات» → **«رفع صور كتير»**:
  1. **«نزّل القائمة»**: a spreadsheet (opens in Excel, Arabic OK) of every visible product: the file name its picture
     should have (from the English name, e.g. `baguette.jpg`; the id is added when two products share a name), Arabic
     and English names, category, whether it has a picture, and a ready **AI prompt** in one style (plain cream
     background #F6F4EF, no brands, 4:3).
  2. Pick or drag the images → each is matched by file name (list name, Arabic name, or product id), with a preview
     table: ready / already has a picture (kept unless «استبدل الصور اللي موجودة» is ticked) / no matching product /
     second picture for the same product.
  3. **«ارفع N صورة»**: pictures are shrunk to 1200px JPEG in the browser first, uploaded 3 at a time with progress;
     failed ones can be retried with the same button.
- Uses the admin sign-in like the single upload (same code now shared: `setProductImage` in `supabase.ts`).
  No database changes, no new libraries.
- Checked: dashboard typecheck + build; clicked through in a browser with sample products and fake uploads
  (matching by English/Arabic/id, duplicates, keep vs replace, a failed upload + retry, a 3000px PNG shrunk).

### Next
- Make the pictures (run the prompts from the spreadsheet), then upload them with «رفع صور كتير».

### Known issues
- Not tried against the real database from here (no access from the cloud workspace) — first real run is yours.
- Products added later need their picture added the same way (download the list again).

## Session 25 — 2026-10-21: Sign in with email (instead of phone)

Agreed: email only — a 6-digit code by email (free, through Resend), no SMS. New domain **sallitna.online**
(Namecheap): the dashboard is now at **https://admin.sallitna.online** (CNAME `admin` → Vercel), and emails come
from **no-reply@sallitna.online** (Resend, Ireland; DNS records `resend._domainkey`, `send`, `rsend`, `_dmarc`).
Supabase: custom SMTP = Resend, email rate limit 100/h, site URL = the dashboard.
(Default product pictures: 306 illustrated icons made and uploaded through «رفع صور كتير»; the zip is in
`design/sallitna-default-pictures/` on your Mac.)

### Done
- **App:** «إيميلك» instead of «رقم موبايلك» on the sign-in and join screens (email keyboard, no capitals, the
  address reads left-to-right inside Arabic). Same 6-digit code boxes; «بعتنا الكود على إيميلك», a Spam tip, resend
  after 60 s (Supabase allows one email a minute), «الإيميل غلط؟ عدّله». WhatsApp/SMS buttons and the test-number
  hint are gone. Texts in ar/en/hi; sign-out and demo messages say «ترجعلها بإيميلك».
- **The email** (`backend/supabase/templates/sign-in-code.html`): Arabic first, app colours, big code, valid 10 minutes,
  a short English + Hindi line for helpers.
- **Dashboard:** sign in by email (only people who already use the app — no new accounts from here); users page shows a
  hidden email («mo•••@gmail.com», older phone accounts still show a hidden number); «ضيف مسؤول» takes an email.
- **Database** (`20261021090000_email_sign_in.sql`): hidden email for admins, admins added by email (any capitals or
  spaces). **Security tests 111/111** (new: emails are hidden, adding by email, unknown email refused).
- `config.toml` now matches the Supabase dashboard (Resend SMTP with the key from an env var, 6-digit code, 10 minutes,
  the email, phone sign-in off, test numbers and the Twilio placeholder removed).
- Checked here: app + dashboard typecheck; all migrations + tests on a local Postgres copy; sign-in, wrong code and
  joining (member and helper) clicked through in a browser with Supabase faked; the email rendered.

### Your steps (in this order)
1. Merge the pull request (Vercel updates the dashboard).
2. On your Mac: `git pull origin main`, then `npm run db:push` and `npm run db:test` (expect 111 passed).
3. Supabase → Authentication → **Sign In / Providers → Email**: "Email OTP Length" **6**, "Email OTP Expiration" **600**.
   **Phone**: switch off.
4. Supabase → Authentication → **Emails → Templates**: in «Confirm signup» and «Magic Link», set the subject
   `كود الدخول لسلّتنا · Your Sallitna code` and paste the whole of `backend/supabase/templates/sign-in-code.html`.
5. Restart the app (`npm run app`), sign up with your email.
6. Make yourself admin once — Supabase → SQL Editor:
   `insert into private.admins (user_id) select id from auth.users where email = 'YOUR@EMAIL' on conflict do nothing;`
   Then sign in at https://admin.sallitna.online with the same email.
- Don't run `supabase config push` unless `SUPABASE_AUTH_SMTP_PASS` is set in the terminal (it would blank the key).

### Known issues
- Old phone accounts (the 4 test numbers) can't sign in any more; everyone signs up once with email.
- Not tried against the real Supabase from here (no access) — the first real code email is your test.
- One old test line ran two checks at once and passed only by luck of order; split into two checks.
- Follow-up: «the new admin is on the team» counted exactly 2 admins, but the real database also has the old
  phone test admin (+20 1000000001), so it failed (110/111). It now checks that Khalid is on the team.

## Session 25b — 2026-10-21: Invite links that work (sallitna.online/j/CODE)

The invite screen showed `sallitna.app/j/CODE` — a placeholder domain we don't own (the code itself was real).

### Done
- **App:** invite links are now `https://sallitna.online/j/CODE` (`invite.tsx`, for family and helper invites).
- **New folder `frontend/invite`** (plain web pages, no libraries — agreed): the public site for sallitna.online.
  - `/j/CODE`: «اتدعيت لقائمة البيت على سلّتنا», the code in big letters with «انسخ الكود», **«افتح سلّتنا»**
    (opens the installed app on its join screen with the code filled in: `sallitna://join?code=CODE`), steps for
    people without the app («عندي دعوة من العيلة» → type the code), and an English + Hindi card for helpers.
    A broken link shows «اللينك ده ناقص».
  - `/`: a simple front page («قريبًا على App Store وGoogle Play»). Later: privacy policy + support (stores need them).
- Checked here: app typecheck; both pages at phone size with a local copy of Vercel's address rule.

### Your steps
1. Vercel → **Add New → Project** → the same GitHub repo → Root Directory **`frontend/invite`**, Framework **Other**,
   no build command, no environment variables → Deploy.
2. That project → Settings → **Domains** → add **`sallitna.online`** (and `www.sallitna.online` → redirect to it).
3. Namecheap → Advanced DNS: **delete** the parking records (`www` → parkingpage.namecheap.com and the `@` URL
   Redirect), then add the records Vercel shows (usually an **A** record `@` and a **CNAME** `www`).
   Keep `admin`, `send`, `rsend`, `resend._domainkey` and `_dmarc` as they are.

### Known issues
- «افتح سلّتنا» needs the real installed app; Expo Go can't be opened this way — there, type the code instead.
- Opening the app straight from the link (no page in between) needs the App Store / Play build + two small files on
  sallitna.online — do it with publishing.

## Session 26 — 2026-10-21: «بلّغ العيلة» follows who the list is for

Agreed: ask when creating a list — «القائمة دي لمين؟» العيلة · الصحاب · الشغل · غير كده (changeable later).

### Done
- **Database** (`20261021120000_list_kind.sql`): `households.kind` (family / friends / work / other; existing lists =
  family). Only the manager changes it; `create_household` takes it. **Security tests 117/117** (6 new).
- **Create list:** a «القائمة دي لمين؟» chip row under the name; picking a suggested name also picks its group
  («البيت» → العيلة, «الشغل» → الشغل, «الصحاب» → الصحاب).
- **«حسابي» → القائمة:** the manager can change it with the same chips; others see it.
- **Wording follows the open list** (ar/en/hi), through two automatic words in the texts:
  `{{group}}` العيلة / صحابك / زمايلك / الكل and `{{members}}` أهل البيت / الصحاب / الزمايل / أعضاء القائمة.
  E.g. «بلّغ صحابك وارجع للقائمة», «اسأل زمايلك», «ادعي الصحاب», «بلّغنا الكل إنك هنا». Sentences were reworded so the
  group is never the subject (no «العيلة عارفة / صحابك عارفين» agreement problem).
- Texts before a list exists (welcome, join, «عرّفنا عليك») still say «العيلة». Helper texts and «صورة العيلة» became
  neutral («أي حاجة تتضاف للقائمة…», «صورتكم»).
- Checked: app typecheck; every group in ar/en/hi printed; create-list screen in a browser.

### Your steps
1. Merge the pull request; on your Mac: `git pull origin main`, `npm run db:push`, `npm run db:test` (expect 117).
2. Restart the app. Make a list called «الصحاب» → the shopping buttons say «اسأل صحابك» / «بلّغ صحابك».

### Known issues
- Invite previews (before joining) don't know the list's group yet, so join screens keep «العيلة».

## Session 26b — 2026-10-21: The invite page shows the real list

The page said «اتدعيت لقائمة البيت» for every invite (it only knew the code).

### Done
- **Database** (`20261021150000_get_invite_kind.sql`): the invite lookup also returns who the list is for.
  **Security tests 118/118.**
- **Invite site:** a small Vercel function `frontend/invite/api/invite.js` (`/api/invite?code=…`) asks Supabase with the
  public key (kept in Vercel's settings, not in the page) and returns only: list name, inviter, kind, member count +
  initials, expired. The page then shows «احمد حسن بيدعيك · انضم لقائمة «الشغل»», the member circles, «قائمة الشغل ·
  فيها 3 أفراد». Expired codes: «الدعوة دي خلصت — اطلب من سارة لينك جديد». Unknown code or no answer: the neutral
  «اتدعيت لقائمة على سلّتنا» (never the wrong list). Names are inserted as text only.
- Checked here with a fake Supabase: work list, expired, unknown, a malicious list name (nothing ran).

### Your steps
1. Merge the pull request.
2. Vercel → **sallitna-invite** → Settings → **Environment Variables**: add `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_KEY` (same values as the dashboard; publishable key only) → Redeploy.
3. On your Mac: `git pull origin main`, `npm run db:push`, `npm run db:test` (expect 118).
4. Open the app's invite link → the page shows the list's real name.

## Session 27 — 2026-10-21: Landing page for sallitna.online

Agreed: Arabic only, no sign-up form («قريبًا»), contact hello@sallitna.online. (Push notifications were planned —
see the plan in this conversation — and paused; nothing installed.)

### Done
- `frontend/invite/index.html` + `landing.css` (plain HTML/CSS, no libraries): logo, hero «قائمة مشتريات واحدة للبيت
  كله» with a phone showing the list, «إزاي بتشتغل؟» (3 steps), 6 feature cards (live updates, «أنا في السوق», asking
  from the store, helpers in their language, a list per group, «صوّرها»), 4 phone screens from /design
  (`img/*.jpg`, ~220 KB), a closing «قريبًا على App Store وGoogle Play» + «ابعتلنا», footer with the email and
  «سياسة الخصوصية — قريبًا». Works from phone width to desktop; invite links (/j/…) unchanged.
- No voice promise in the text (voice is off), but the list screenshot still shows the mic button.

### Next
- Set up hello@sallitna.online forwarding (Namecheap «Redirect Email» → your Gmail).
- Privacy policy page (needed for the stores) — the footer link is ready for it.
- Push notifications (planned, waiting for: library OK, which messages, Expo + Apple accounts).

## Session 27b — 2026-10-21: Landing screenshots from the current app

### Done
- The 4 phone screens on sallitna.online («شكلها من جوه» + the top of the page) are now real screenshots of the
  current app, not the old /design mockups: the list («البيت», with «سارة في السوق دلوقتي»), «إنتي في السوق»,
  «سؤال من سارة», and the helper's English list. Taken from the app running in a browser with sample family data
  (same names as the designs); the browser-only tab bar was hidden.
- (A dark subscrr-style redesign was tried and dropped — the light landing page stays.)

### Known issues
- The screens have no product photos (the sample data has none).

## Session 28 — 2026-10-22: Passwords (required)

Why: every sign-in on a new phone (or after signing out) emailed a code, using up the Resend / Supabase email quota.
Now a code is only needed once (to prove the email is yours) and after «نسيت كلمة السر؟».

### Done
- Welcome: new «عندي حساب، ادخل» → email + password, «ادخل» (no email sent). Wrong password → «الإيميل أو كلمة السر
  مش صح» (same answer whether the email exists or not). «نسيت كلمة السر؟» → code → «اعمل كلمة سر جديدة».
- New people and people joining by invite: email → code → «اعمل كلمة سر» (required, no skip, no back) → as before.
- People signed in from before passwords: the app opens «اعمل كلمة سر» first (can't be swiped away), no email sent.
- «حسابي» → «غيّر كلمة السر».
- At least 8 characters (in the app + `minimum_password_length = 8` in supabase/config.toml).
- How the app knows someone has a password: `has_password: true` on the account (Supabase user metadata), set when
  the password is saved or used to sign in. The password itself is only kept by Supabase (hashed).
- New: `app/set-password.tsx`, `components/onboarding/NewPassword.tsx`, `PasswordField`; `api.signInWithPassword`,
  `api.setPassword`, `api.hasPassword`. Text in ar / en / hi.
- Tested in a browser with a fake Supabase: wrong + right password, forgot password, new person, already signed
  in without a password, change from «حسابي».

### Fix (28b)
- «اعمل كلمة سر» didn't show on a phone for someone already signed in: the check only ran when «قوايمي» came into
  view. Now `components/PasswordGate.tsx` (in the root layout) checks on any screen, at launch and whenever the app
  comes back to the front (not on the sign-in screen or the password screen itself).

### Your side (Supabase dashboard)
- Authentication → Sign In / Providers → Email: email provider on, «Minimum password length» = 8,
  «Secure password change» OFF (otherwise people signed in long ago can't save their first password).

### Known issues
- The admin dashboard still signs in with a code (only admins use it).
- Joining a second list by invite still sends a code.

## Session 28c — 2026-10-22: Test accounts cleaned up

- Deleted 5 test accounts (fekra.lab1, fekralab.1, fekralab1, fekrala.b1 @gmail.com, fekralab.1@gmail.co) and their
  3 one-person lists, with SQL in the Supabase SQL Editor (lists first, then the accounts, in one transaction).
- Left: mostafagafaar080 (admin), mostemarktin.g, mostemarkting.
- Tip: Gmail ignores dots, so «a.b@gmail.com» and «ab@gmail.com» reach the same inbox but are separate accounts.
- Any photos those accounts uploaded may still be in Storage (family-photos) — harmless, can be removed by hand.

## Session 29 — 2026-10-23: Push notifications

### Done
- 5 notifications, each in the reader's language (ar / en / hi) and with the sender's gender in the verb:
  | When | Who | Setting |
  |---|---|---|
  | «ابدأ التسوق» | everyone else in the list | «لما حد يبدأ يتسوق» |
  | question from the store | the person asked | always (also in quiet hours) |
  | answer | the shopper | always (also in quiet hours) |
  | something added while someone shops | the shopper (+ anyone with «كل حاجة تتضاف») | «اللي يتضاف وأنا في السوق» |
  | trip finished («بلّغ العيلة») | everyone else | always |
  «وقت الهدوء» (11pm–7am in each phone's time zone) holds back everything except questions and answers.
- Database (`20261023090000_push_notifications.sql`): `push_tokens` (no direct access; `save_push_token` /
  `forget_push_token` only touch your own phones; a phone that changes hands moves), `private.push_sent` +
  `claim_push` (service only) so each event is announced once. 11 new security tests → 129 passing locally.
- Edge Function `backend/supabase/functions/notify` (`index.ts` Supabase + Expo sending, `notify.ts` who gets
  what, `messages.ts` the text). The app reports what happened; the function checks it's real, recent and the
  caller's own before sending. Uses the built-in service key; no secrets in the app. `verify_jwt = false` in
  config.toml because it checks the sign-in itself.
- App: `expo-notifications` added (expo-device was already there), plugin in app.json. `lib/push.ts`
  (permission, save/forget the phone, notify), `components/PushSetup.tsx` (asks once after opening a list, not over
  the password screen; tapping a notification opens the question / «بالسوق» / the list). Sign-out forgets the phone.
  «حسابي» shows «الإشعارات مقفولة · افتحها» when notifications are off in iPhone Settings.
- Tested: the who-gets-what logic with sample data (languages, quiet hours, repeats and fakes refused), and the app
  in a browser (starting a trip reports it; all sign-in / password flows still work).

### Your side
1. `cd frontend/mobile && npx eas-cli login && npx eas-cli init` → links the app to your Expo account (adds a
   project id to app.json — send it to me so it's saved in GitHub).
2. `npm run db:push` (new table) and `npm run db:test` (expect 129 passed).
3. From `backend/`: `npx supabase functions deploy notify` (add `--use-api` if it asks for Docker).

### Fix (29b)
- `db:test` on the real database: 128/1 — «push: signed out cannot save a phone». Supabase grants new functions
  to `anon` by default and the migration only revoked `public`. New migration `20261023120000_push_tokens_signed_in_only.sql`
  revokes `anon` (the functions already refused anyone not signed in). The test now acts as a truly signed-out
  visitor, and the local test database copies Supabase's default grants so this shows up before pushing.
- `npm run db:push` now passes `--linked` (the Supabase CLI will target the local database by default later).

### Fix (29c)
- On the phone: «Cannot find native module 'ExpoPushTokenManager'» crashed the app at start — it was opened in a
  development build made before notifications were added (not Expo Go). `lib/push.ts` now loads
  expo-notifications only when it's built into the app (`requireOptionalNativeModule`); otherwise the app runs
  without notifications. Test in Expo Go (`npx expo start --go`), or rebuild the development build.

### Known issues
- In Expo Go the notifications show «Expo Go» as the app name/icon; the real name comes with the App Store build.
- Expo Go on Android can't receive notifications (needs a test build) — iPhone is fine.
- Handing a trip over («كمّل بدالي») doesn't send «خلّص» (nothing was finished).

## Session 29d — 2026-10-23: Expo SDK 57 → 58

Why: Expo Go on the iPhone updated to SDK 58 and only the newest Expo Go can be installed, so the SDK 57 app
couldn't open in Expo Go (and notifications on iPhone without a paid Apple account need Expo Go).

### Done
- `expo` 58.0.17 and every Expo library set to its SDK 58 version (`expo install --fix`): react-native 0.88,
  react 19.3, expo-router 58, react-native-gesture-handler 3.3, reanimated 4.7, expo-notifications 58.1, …
  `package-lock.json` regenerated (fresh install).
- One code change: the list screen's scroll ref type (`ScrollViewInstance`) for gesture-handler 3.
- Checked: typecheck, app config, every sign-in / password / trip test in the browser, and the 4 main screens look
  the same as before.

### Your side
- After pulling: in `frontend/mobile` run `npm install` (new versions), then `npx expo start --go -c` and pick
  «Expo Go». The old Development Build (SDK 57) won't load this version.

### Known issues
- gesture-handler 3 marks `Gesture.Pan()` (swipe on an item) as deprecated — still works; move to `usePanGesture`
  in a later session.

### Fix (29e) — the app in a browser
- `npx expo start` → `w` crashed with «window is not defined»: the web version draws pages on the computer first,
  and the Supabase client tried to read the saved sign-in there. `lib/supabase.ts` skips saved sign-in only during
  that step (phones unaffected). Useful for testing with a second account in the Mac's browser.

## Session 30 (A) — 2026-10-28: Delete my account + help button (store requirements)

### Done
- «حسابي» → «احذف حسابي» (red) → `app/delete-account.tsx`: what happens (lists you're alone in are deleted,
  lists you manage go to the longest-standing member, your items stay without your name, no way back), password
  once more, red «احذف حسابي نهائيًا». Then back to welcome with «اتحذف حسابك».
- Database `20261028090000_delete_my_account.sql`: `delete_my_account()` — per list: alone (or only helpers
  left) → deleted like «امسح القائمة»; manager → longest-standing family member takes over; then the auth
  account is deleted (member rows, phones, admin access go with it). 10 new security tests → 139 passing locally.
- «مساعدة وكلّمنا» opens an email to hello@sallitna.online (no mail app → the address is copied).
- `SheetButton` has a red `danger` tone. Text in ar / en / hi.
- Also in this round: the notify function logs why nothing was sent / how many phones / Expo's answer.

### Your side
- `npm run db:push` (new migration) → `npm run db:test` (expect 139 passed).
- `cd backend && npx supabase functions deploy notify` (the logging update).

### Known issues
- Photos uploaded to a list that gets deleted stay in Storage (not visible to anyone); a clean-up job later.

## Session 31 (B) — 2026-10-28: Privacy policy + terms (store requirements)

### Done
- sallitna.online/privacy and /terms (`frontend/invite/privacy.html`, `terms.html`, `legal.css`): Arabic first,
  English below (#en), same look as the site. The privacy policy only describes what the app really does: email,
  hashed password, name / gender / dialect / language, lists (items, notes, trips, questions, amount paid), photos
  (seen only inside the list), notification address + time zone; no ads, no selling, no tracking, no location /
  contacts / phone number; who sees what; processors (Supabase, Resend, Expo / Apple / Google, Vercel); how
  «احذف حسابي» works; security; not for under-13s; contact hello@sallitna.online.
- Links: landing footer; sign-in screen «لما تكمّل تبقى موافق على الشروط وسياسة الخصوصية» (both words open the
  page, English half for helpers); «حسابي» → «سياسة الخصوصية» and «الشروط» (`lib/legal.ts`, in-app browser).

### Notes
- Update privacy.html before turning on anything that stores new data (e.g. voice).

## Session 32 (C) — 2026-10-28: Safe updates after launch

### Done
- «حدّث سلّتنا»: `public.app_config` (one row, readable by everyone, changed only in the SQL Editor) with
  `min_version` + store links (`20261028120000_app_config.sql`, 3 new tests → 142 passing locally).
  `components/UpdateGate.tsx` covers the app when its version is older (checked at launch and on coming back);
  offline / not set → nothing. Button opens the store (sallitna.online until the store pages exist).
- EAS: `frontend/mobile/eas.json` (development / preview / production builds, matching update channels, build
  numbers counted by EAS), `expo-updates` added, `runtimeVersion: appVersion` + updates URL in app.json, and
  `ITSAppUsesNonExemptEncryption: false` (Apple's export question answered once).
- Test copy of Supabase: `npm run db:push:test | db:test:test | functions:deploy:test` (read
  `SUPABASE_TEST_DB_URL` / `SUPABASE_TEST_REF` from your Mac, never from GitHub), plus `functions:deploy` for live.
- `RELEASING.md`: one-time setup (test project, EAS environment variables, store links) and the steps for every
  feature (test copy → phone → live), with the «only add» database rule. CLAUDE.md points to it.

### Your side
- `npm run db:push` → `npm run db:test` (expect 142 passed) — this also brings Session A's account deletion.
- `npm run functions:deploy` (the logging update from Session A).
- After pulling: `cd frontend/mobile && npm install` (expo-updates).
- When ready: the one-time setup in RELEASING.md.

### Next (from the launch plan)
- D: app icon + splash (needs your 1024×1024 icon) · E: store listing pack · F: first EAS build → TestFlight ·
  G: submit.

## Session 32b — 2026-10-28: Email in «حسابي»
- The profile card at the top of «حسابي» shows the email this account signs in with (under the name and role),
  left-to-right inside the Arabic layout. From the saved sign-in, no extra request.

## Session 32c — 2026-10-28: Simpler «حسابي»
- Removed the «البيت» section (list name / members / invite) and the «القائمة» section (rename, «القائمة دي
  لمين؟») from «حسابي». The top card (name, role, dialect, language, email) is display-only — no profile edit.
- Still elsewhere: rename and delete a list from the «…» on its card in «قوايمي»; members and invites from the list.
- Known: who a list is for (family / friends / work) and your name / dialect / language can't be changed after
  setup anymore. `app/profile.tsx` is kept but nothing opens it.
- Also removed «امسح القائمة» / «اخرج من القائمة» from «حسابي» — the same action is on the list card's «…» in
  «قوايمي».

## Session 33 (D) — 2026-10-28: App icon + green colours

### Done
- App icon: the cat with the basket (from the image sent), cleaned to a full-bleed 1024×1024 square so iPhone and
  Android can round it themselves. `assets/images/icon.png` (iPhone + app), Android adaptive icon (cat in the
  safe area on the icon's own green gradient), splash (rounded icon), favicon, `logo.png` (small logo in the app).
  Replaced Expo's default `expo.icon` and the monochrome Android icon.
- App colours follow the icon: `accent` #E8731A → #0E7A42 (icon green), `accentTint` #FDEBD8 → #DDF1E3, `accentInk`
  → #0A5C31, new `onAccent` #FFFFFF. Text and icons on the green accent are white (answer screen's voice button,
  the «أنا هجيب» claim button, shopper banner icon, accent SheetButton). Orange stays in the icon only.
- The small basket logo («سلّتنا» header, expired-invite screen, notification preview) is now the cat icon
  (`components/AppLogo.tsx`). Notification colour on Android is the green. CLAUDE.md colour list updated.

### Known / next
- The website (sallitna.online) and the admin dashboard still use the orange palette and the basket logo.
- The icon art has no Arabic text (good for stores). Apple's icon must have no transparency — this one has none.
- To check on a phone: app icon only changes with a new build (not in Expo Go); everything else shows right away.

### Session 33b — 2026-10-29: Every button is green
- All black buttons are now the green accent: the main `SheetButton` (default tone «ink» → green, so «ابدأ
  التسوق», «التالي», «تأكيد»…), the answer-screen replies, add / save / done / invite / WhatsApp / «ارجع للقائمة»
  buttons, the voice screens' buttons, and selected states (chips, filter pill, radio / store / dialect cards,
  unit picker, step dashes). White text stays on them.
- Left dark on purpose: the undo toast, the dark voice screens, member avatar colours, text-input outlines.

### Session 33c — 2026-10-29: Wording follows the list type everywhere
- Messages that said «العيلة» / «البيت» inside a list now follow who the list is for (`{{group}}`: العيلة /
  صحابك / زمايلك / الكل) or are neutral: «بلّغنا {{group}}: ناقصكم حاجة؟» (was «بعتنا للعيلة…»), «بلّغنا {{group}}
  بالباقي», «النت رجع · بلّغنا {{group}} بكل حاجة», the offline banner, «ناقصكم إيه؟», «شلنا … من القائمة»,
  «ادعي حد للقائمة», the invite-expired text, helper labels. Same in en / hi. Rule added to CLAUDE.md.
- Still general on purpose: welcome, «سمّي قائمتك», join screens (no list yet), the website, the push
  notifications («… في السوق دلوقتي — لو ناقص حاجة، ضيفوها» is already neutral).

## Session 34 — 2026-10-29: Animated splash screen
- `components/AnimatedSplash.tsx` (in the root layout): the cat logo + «سلّتنا» on the app's warm white (#F6F4EF).
  Starts at the size of the phone's own splash (160, app.json) so there's no jump; the logo pops, then breathes
  while the app loads (sign-in, lists), the name fades in; shown at least 1.5 s, then fades into the app. Respects
  «Reduce Motion» (no pop / breathing).
- The phone's own splash (still, from app.json) now stays until the animated logo is ready to draw (or 1.5 s) —
  `_layout.tsx` no longer hides it as soon as fonts load.
- White, not green: the icon has its own green background, so it would melt into a green splash. One colour change
  in app.json (splash `backgroundColor`) + `AnimatedSplash` (`colors.ground`) if green is wanted later.
- To see the phone's own splash and the hand-over: only in a real build (Expo Go shows Expo's own). The animated
  part shows in Expo Go right after opening the app.

### Session 34b — 2026-10-29: Message bar at the top
- The dark message bar («بلّغنا صحابك…», «اتحفظت…», with «تراجع» when it can be undone) now appears at the TOP,
  just under the status bar, on every screen, sliding down; it sits over headers and cards (`zIndex`).
  `UndoToast` no longer takes a `bottomOffset` — the 17 screens that placed it at the bottom just render
  `<UndoToast />`. Stays 6 s as before.
