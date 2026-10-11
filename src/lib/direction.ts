// The app layout is always right-to-left for now (see src/app/_layout.tsx).
// Gestures and transforms work in physical pixels, so they need to know the direction.
// When helpers get LTR (English/Hindi) views, derive this from their view_language.
export const isRTLLayout = true;

// +1 when "toward the start side" means moving right on screen (RTL), -1 otherwise
export const startSign = isRTLLayout ? 1 : -1;
