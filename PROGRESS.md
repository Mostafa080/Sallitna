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
