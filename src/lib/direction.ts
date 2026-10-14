import { createContext } from 'react';

// The app layout is right-to-left (see src/app/_layout.tsx).
// Gestures and transforms work in physical pixels, so they need to know the direction.
export const isRTLLayout = true;

// +1 when "toward the start side" means moving right on screen (RTL), -1 otherwise
export const startSign = isRTLLayout ? 1 : -1;

// Part of the screen can run the other way (the helper's English/Hindi list is left-to-right).
// Wrap it in <LayoutDirectionContext.Provider value="ltr"> along with style={{ direction: 'ltr' }},
// so text inside also reads left-to-right.
export type LayoutDirection = 'rtl' | 'ltr';
export const LayoutDirectionContext = createContext<LayoutDirection>(isRTLLayout ? 'rtl' : 'ltr');
