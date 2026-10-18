import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { t } from '@/i18n';
import { colors, radius, size, spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
};

// "+ خبز صامولي" — one-tap add suggestion
export function AddChip({ label, onPress }: Props) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={t('typeAdd.addA11y', { name: label })}>
      <Plus size={size.iconSmall + spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
      <AppText variant="label" weight="medium">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
