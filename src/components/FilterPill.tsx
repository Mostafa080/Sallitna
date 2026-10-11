import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, size, spacing } from '@/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

const HIT_SLOP = (size.touch - size.pill) / 2;

export function FilterPill({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.pill, selected ? styles.selected : styles.unselected]}>
      <AppText variant="body" weight="semibold" color={selected ? 'onDark' : 'ink'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: size.pill,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: size.border,
  },
  selected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  unselected: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
});
