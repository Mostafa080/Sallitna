import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts, fontSize } from '@/theme';

type Variant = 'title' | 'heading' | 'item' | 'label' | 'body' | 'meta' | 'caption';
type Weight = keyof typeof fonts;
type Color = keyof typeof colors;

type Props = TextProps & {
  variant?: Variant;
  weight?: Weight;
  color?: Color;
};

// All text in the app goes through this, so font + RTL alignment are always right.
export function AppText({ variant = 'body', weight = 'regular', color = 'ink', style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[styles.base, { fontSize: fontSize[variant], fontFamily: fonts[weight], color: colors[color] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: 'auto',
    writingDirection: 'rtl',
  },
});
