// The soft backdrop behind screens in the glass look: one smooth blend of pastel colours — mint on the start side
// and at the bottom, a warm peach glow on the other side, a hint of sky at the top (like iOS 26 / SmartThings).
// Frosted cards (Glass.tsx) show it through. Put it first in a screen's root View.

import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

// A round glow that fades to nothing exactly at the edge of its box (so no hard edges show)
function Glow({ id, color, opacity }: { id: string; color: string; opacity: number }) {
  return (
    <RadialGradient id={id} cx="0.5" cy="0.5" rx="0.5" ry="0.5">
      <Stop offset="0" stopColor={color} stopOpacity={opacity} />
      <Stop offset="0.45" stopColor={color} stopOpacity={opacity * 0.62} />
      <Stop offset="0.75" stopColor={color} stopOpacity={opacity * 0.22} />
      <Stop offset="1" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );
}

export function GradientBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View
      style={[styles.fill, { width, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.ground} />
            <Stop offset="1" stopColor={colors.glowSage} />
          </LinearGradient>
          <Glow id="mint" color={colors.glowMint} opacity={1} />
          <Glow id="sky" color={colors.glowSky} opacity={0.85} />
          <Glow id="peach" color={colors.glowPeach} opacity={0.9} />
          <Glow id="lime" color={colors.glowLime} opacity={0.95} />
        </Defs>
        <Rect width="100%" height="100%" fill="url(#base)" />
        {/* Big, overlapping, soft ovals (x, y, width, height as a share of the screen), partly off-screen */}
        <Rect x="-45%" y="-22%" width="150%" height="62%" fill="url(#mint)" />
        <Rect x="35%" y="-18%" width="95%" height="48%" fill="url(#sky)" />
        <Rect x="30%" y="26%" width="115%" height="52%" fill="url(#peach)" />
        <Rect x="-55%" y="55%" width="135%" height="70%" fill="url(#lime)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // The size of the whole window (set above), from the top-start corner — not the size of its parent
  fill: {
    position: 'absolute',
    top: 0,
    start: 0,
  },
});
