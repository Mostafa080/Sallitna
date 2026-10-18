import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import type { Phrase } from '@/data/fakeVoice';
import { colors, size } from '@/theme';

type Props = {
  phrases: Phrase[];
  shown?: number; // how many phrases have been "heard" so far (default: all)
  variant?: 'heading' | 'item' | 'label';
  color?: keyof typeof colors;
  trailing?: string; // e.g. "[غير واضح]"
};

// What was said, with understood items underlined in orange
// and words still waiting for context underlined dashed.
export function Transcript({ phrases, shown = phrases.length, variant = 'heading', color = 'onDark', trailing }: Props) {
  return (
    <AppText variant={variant} weight="medium" color={color} style={variant === 'heading' && styles.large}>
      {phrases.slice(0, shown).map((phrase, index) => (
        <AppText
          key={index}
          variant={variant}
          weight={phrase.kind === 'item' ? 'semibold' : 'medium'}
          color={color}
          style={phrase.kind === 'item' ? styles.item : phrase.kind === 'pending' ? styles.pending : undefined}>
          {phrase.text}
        </AppText>
      ))}
      {trailing && (
        <AppText variant={variant} color="onDarkMuted">
          {trailing}
        </AppText>
      )}
    </AppText>
  );
}

const styles = StyleSheet.create({
  large: {
    lineHeight: size.titleLine, // room for the underlines between lines
  },
  item: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
    textDecorationStyle: 'solid',
  },
  pending: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.onDarkMuted,
    textDecorationStyle: 'dashed',
  },
});
