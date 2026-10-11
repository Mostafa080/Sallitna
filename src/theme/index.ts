// Single source of truth for colors, fonts, spacing and sizes.
// Never use raw values in components — add a token here instead.

export const colors = {
  ground: '#F6F4EF',
  surface: '#FFFFFF',
  ink: '#1D1B18',
  muted: '#615C53',
  line: '#E6E1D6',
  accent: '#E8731A',
  accentTint: '#FDEBD8',
  success: '#2E7A4E',
  info: '#2F5D8A',
  danger: '#9B2C1F',

  // Derived tokens (seen in /design, not in the base palette — confirm with design)
  accentInk: '#B4560F', // darker orange text on accentTint (the "جديد" badge)
  onDark: '#FFFFFF', // text/icons on ink, accent, info backgrounds
  darkGround: '#1D1B18', // voice screens background (not used yet)
  darkSurface: '#2E2A26', // voice screens cards (not used yet)
} as const;

export const fonts = {
  regular: 'ReadexPro_400Regular',
  medium: 'ReadexPro_500Medium',
  semibold: 'ReadexPro_600SemiBold',
  bold: 'ReadexPro_700Bold',
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
  checkbox: 24,
  icon: 24,
  iconStroke: 2,
  iconSmall: 14,
  pill: 36,
  qtyPill: 30,
  bannerIcon: 40,
  liveDot: 12,
  micButton: 76,
  micRing: 88,
  control: 48, // inputs, steppers, unit buttons
  button: 56, // full-width primary button
  swipeAction: 68, // width of each swipe action
  emptyIcon: 96,
  toast: 64,
  border: 1,
  borderThick: 2,
} as const;

export const opacity = {
  disabled: 0.35,
} as const;

export const motion = {
  fast: 180,
  normal: 260,
  toastDuration: 6000,
  checkDelay: 350, // pause to show the tick before the item leaves the list
} as const;

export const shadow = {
  floating: '0 6px 20px rgba(29, 27, 24, 0.14)', // ink at 14% — the big mic button
} as const;

export const theme = { colors, fonts, fontSize, spacing, radius, size, shadow, motion, opacity };
export type Theme = typeof theme;
