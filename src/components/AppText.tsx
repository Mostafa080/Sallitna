import { Children, useContext } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { LayoutDirectionContext } from '@/lib/direction';
import { colors, devanagariFonts, fonts, fontSize } from '@/theme';

type Variant = 'title' | 'heading' | 'item' | 'label' | 'body' | 'meta' | 'caption';
type Weight = keyof typeof fonts;
type Color = keyof typeof colors;

type Props = TextProps & {
  variant?: Variant;
  weight?: Weight;
  color?: Color;
};

const DEVANAGARI = /[\u0900-\u097F]/;

// Hindi text needs Noto Sans Devanagari; Norsal covers Arabic and Latin
const isDevanagari = (children: TextProps['children']) =>
  Children.toArray(children).some((child) => typeof child === 'string' && DEVANAGARI.test(child));

// All text in the app goes through this, so font + reading direction are always right.
export function AppText({ variant = 'body', weight = 'regular', color = 'ink', style, children, ...rest }: Props) {
  const direction = useContext(LayoutDirectionContext);
  const fontFamily = isDevanagari(children) ? devanagariFonts[weight] : fonts[weight];

  return (
    <Text
      {...rest}
      style={[
        styles.base,
        { writingDirection: direction, fontSize: fontSize[variant], fontFamily, color: colors[color] },
        style,
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: 'auto',
  },
});
