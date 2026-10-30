// The soft backdrop behind screens in the glass look: warm white with a mint glow at the top, a cream one on the
// side and sage at the bottom. Frosted cards (Glass.tsx) show it through. Put it first in a screen's root View.

import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

function Glow({ id, color, opacity }: { id: string; color: string; opacity: number }) {
  return (
    <RadialGradient id={id} rx="1" ry="1" cx="0.5" cy="0.5">
      <Stop offset="0" stopColor={color} stopOpacity={opacity} />
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
          <Glow id="mint" color={colors.glowMint} opacity={0.95} />
          <Glow id="cream" color={colors.glowCream} opacity={0.9} />
          <Glow id="sage" color={colors.glowMint} opacity={0.7} />
        </Defs>
        <Rect width="100%" height="100%" fill="url(#base)" />
        {/* x, y, width, height as percentages of the screen: the glows are soft ovals */}
        <Rect x="-25%" y="-12%" width="110%" height="50%" fill="url(#mint)" />
        <Rect x="40%" y="28%" width="90%" height="36%" fill="url(#cream)" />
        <Rect x="-30%" y="68%" width="110%" height="46%" fill="url(#sage)" />
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
