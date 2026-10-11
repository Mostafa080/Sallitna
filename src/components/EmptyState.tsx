import * as Haptics from 'expo-haptics';
import { Check, Plus, ShoppingBasket } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import type { Basic } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { colors, motion, radius, size, spacing } from '@/theme';

type Props = {
  basics: Basic[];
  added: Record<string, string>; // basic name → id of the item it created
  onToggleBasic: (basic: Basic) => void;
  onShowList: () => void;
};

// "The basket is empty" — examples of what to say, plus one-tap basics.
export function EmptyState({ basics, added, onToggleBasic, onShowList }: Props) {
  const addedCount = Object.keys(added).length;

  return (
    <Animated.View entering={FadeIn.duration(motion.normal)} style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconBox}>
          <ShoppingBasket size={size.icon + spacing.lg} color={colors.muted} strokeWidth={size.iconStroke} />
        </View>
        <AppText variant="heading" weight="bold" style={styles.center}>
          {t('empty.title')}
        </AppText>
        <AppText variant="label" color="muted" style={styles.center}>
          {t('empty.subtitle')}
        </AppText>
        <View style={styles.examples}>
          {[t('empty.example1'), t('empty.example2')].map((example) => (
            <View key={example} style={styles.example}>
              <AppText variant="body" style={styles.center}>
                {example}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.basics}>
        <AppText variant="body" weight="semibold" color="muted">
          {t('empty.basicsHeader', { n: addedCount })}
        </AppText>
        <View style={styles.chips}>
          {basics.map((basic) => {
            const isAdded = !!added[basic.name];
            return (
              <Pressable
                key={basic.name}
                onPress={() => {
                  Haptics.selectionAsync();
                  onToggleBasic(basic);
                }}
                style={[styles.chip, isAdded && styles.chipAdded]}
                accessibilityRole="button"
                accessibilityState={{ selected: isAdded }}
                accessibilityLabel={t(isAdded ? 'empty.basicRemoveA11y' : 'empty.basicAddA11y', { name: basic.name })}>
                {isAdded ? (
                  <Check size={size.iconSmall + spacing.xs} color={colors.onDark} strokeWidth={size.iconStroke} />
                ) : (
                  <Plus size={size.iconSmall + spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
                )}
                <AppText variant="label" weight="medium" color={isAdded ? 'onDark' : 'ink'}>
                  {basic.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {addedCount > 0 && (
          <Animated.View entering={FadeIn.duration(motion.fast)}>
            <Pressable onPress={onShowList} style={styles.showList} accessibilityRole="button">
              <AppText variant="label" weight="bold" color="onDark">
                {t('empty.showList', { n: addedCount })}
              </AppText>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxxl,
    paddingTop: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: size.emptyIcon,
    height: size.emptyIcon,
    borderRadius: radius.card + spacing.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  center: {
    textAlign: 'center',
  },
  examples: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'stretch',
  },
  example: {
    minHeight: size.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  basics: {
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
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
  chipAdded: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  showList: {
    minHeight: size.control,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
