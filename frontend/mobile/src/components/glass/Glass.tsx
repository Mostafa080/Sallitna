// A frosted-glass surface (card, pill, circle). On iOS 26+ it's Apple's real Liquid Glass; elsewhere (older iPhones,
// Android, web) a translucent white with a light edge and a soft shadow, which looks the same over GradientBackground.
// Use it for big surfaces (cards, headers, sheets) — not for every row of a long list.

import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius as radii, shadow, size } from '@/theme';

type Props = ViewProps & {
  radius?: number; // corner radius; radii.pill for a pill or circle
  interactive?: boolean; // reacts to touch (buttons)
};

const realGlass = isLiquidGlassAvailable();

export function Glass({ children, style, radius = radii.card, interactive, ...rest }: Props) {
  if (realGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="light"
        isInteractive={interactive}
        style={[{ borderRadius: radius, boxShadow: shadow.glass }, style]}
        {...rest}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.frosted, { borderRadius: radius }, style]} {...rest}>
      {children}
    </View>
  );
}

// A glass card: a View that is frosted glass (swap «View» for «GlassCard» and drop the card's white background)
export function GlassCard(props: ViewProps) {
  return <Glass radius={radii.card} {...props} />;
}

const styles = StyleSheet.create({
  frosted: {
    backgroundColor: colors.glass,
    borderWidth: size.border,
    borderColor: colors.glassBorder,
    boxShadow: shadow.glass,
  },
});
