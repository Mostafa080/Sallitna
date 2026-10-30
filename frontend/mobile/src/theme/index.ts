// Single source of truth for colors, fonts, spacing and sizes.
// Never use raw values in components — add a token here instead.

export const colors = {
  ground: '#F6F4EF',
  surface: '#FFFFFF',
  ink: '#1D1B18',
  muted: '#615C53',
  line: '#E6E1D6',
  accent: '#0E7A42', // the green of the app icon (the cat's background)
  accentTint: '#DDF1E3',
  success: '#2E7A4E',
  info: '#2F5D8A',
  danger: '#9B2C1F',

  // Derived tokens (seen in /design, not in the base palette — confirm with design)
  accentInk: '#0A5C31', // darker green text on accentTint (the "جديد" badge)
  onAccent: '#FFFFFF', // text/icons on the green accent (dark ink is hard to read on it)
  onDark: '#FFFFFF', // text/icons on ink, info backgrounds
  darkGround: '#1D1B18', // voice screens background
  darkSurface: '#2E2A26', // voice screens cards
  darkLine: '#3A3530', // rings, skeletons and outlines on dark screens
  onDarkMuted: '#A39C91', // secondary text on dark screens
  live: '#4CC38A', // "the family knows you're here" dot on dark
  glowMint: '#BFE6CC', // the soft colours blended behind screens (components/glass/GradientBackground)
  glowSage: '#E3F1E4',
  glowLime: '#D2EDC8',
  glowPeach: '#FBDDC8',
  glowSky: '#D6DFF2',
  glass: 'rgba(255, 255, 255, 0.64)', // frosted card where real Liquid Glass isn't available (older iPhones, Android)
  glassBorder: 'rgba(255, 255, 255, 0.9)',
  warningTint: '#FBF1D3', // offline banner background
  warningLine: '#E8D48A', // offline banner border
  warningInk: '#6B5310', // offline banner text and icon
  scrim: 'rgba(29, 27, 24, 0.55)', // behind bottom sheets (ink at 55%)
  photoViewer: 'rgba(29, 27, 24, 0.94)', // behind a photo opened full screen
  lockScreen: '#2C3A34', // the phone's lock screen behind notifications (notifications.png)
  notification: '#F2F0EB', // a new notification card
  notificationOld: '#E7E5E0', // an older one, slightly greyer
  onDarkSubtle: 'rgba(255, 255, 255, 0.12)', // pill button on the lock screen
} as const;

export const fonts = {
  regular: 'Norsal-Regular',
  medium: 'Norsal-Medium',
  semibold: 'Norsal-SemiBold',
  bold: 'Norsal-Bold',
} as const;

// Hindi (Devanagari script) — same weights as above
export const devanagariFonts = {
  regular: 'NotoSansDevanagari_400Regular',
  medium: 'NotoSansDevanagari_500Medium',
  semibold: 'NotoSansDevanagari_600SemiBold',
  bold: 'NotoSansDevanagari_700Bold',
} as const;

export const fontSize = {
  caption: 12,
  meta: 13,
  body: 15,
  label: 16,
  item: 18,
  heading: 24,
  title: 34,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  card: 18,
  control: 12, // inputs, unit buttons, toast action
  badge: 8,
  pill: 999,
} as const;

export const size = {
  touch: 44, // minimum touch target
  titleLine: 44, // line height for the big screen title
  avatar: 32,
  avatarSmall: 20,
  avatarLarge: 44, // member lists
  avatarHero: 64, // member detail header
  checkbox: 24,
  icon: 24,
  iconStroke: 2,
  iconSmall: 14,
  pill: 36,
  qtyPill: 30,
  bannerIcon: 40,
  liveDot: 12,
  micButton: 76,
  tabBar: 64, // room for the floating iOS tab bar (above the home-indicator inset)
  micRing: 88,
  control: 48, // inputs, steppers, unit buttons
  button: 56, // full-width primary button
  swipeAction: 68, // width of each swipe action
  emptyIcon: 96,
  toast: 64,
  voiceMic: 128,
  voiceRing: 184,
  voiceRingOuter: 232,
  voiceIcon: 96, // circle behind the mic-off icon
  waveBar: 4,
  waveHeight: 44,
  spinner: 76,
  spinnerStroke: 5,
  toggleWidth: 52,
  toggleHeight: 30,
  progress: 10, // shopping progress bar
  radio: 26,
  sheetHandle: 40,
  statTile: 104,
  codeBox: 64, // one digit of the sign-in code
  stepDash: 28, // onboarding progress dashes
  doneCheck: 112,
  border: 1,
  borderThick: 2,
  photoThumb: 44, // a product photo on a list row (also its touch target)
  photoPreview: 220, // the photo on the item screen
} as const;

export const layout = {
  twoColumnBasis: '45%', // cards that sit two per row (they grow to fill, the gap does the rest)
} as const;

export const opacity = {
  disabled: 0.35,
  skeleton: 0.6,
  pressed: 0.7, // a card while it's being tapped
} as const;

export const motion = {
  fast: 180,
  normal: 260,
  toastDuration: 6000,
  checkDelay: 350, // pause to show the tick before the item leaves the list
  wordReveal: 420, // simulated speech: one phrase per step
  autoStop: 2000, // silence before listening stops by itself
  processing: 2200, // simulated "understanding" time
  pulse: 900,
} as const;

export const shadow = {
  floating: '0 6px 20px rgba(29, 27, 24, 0.14)', // ink at 14% — the big mic button
  glass: '0 8px 24px rgba(14, 122, 66, 0.10)', // accent green at 10% — frosted cards
} as const;

export const theme = { colors, fonts, fontSize, spacing, radius, size, shadow, motion, opacity };
export type Theme = typeof theme;
