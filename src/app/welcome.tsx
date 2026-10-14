// "قائمة وحدة للبيت كله" — first screen for someone new.
// Simulated: test menu → «ابدأ من جديد», or «ابدأ قائمة جديدة بدالها» on an expired invite.

import { useRouter } from 'expo-router';
import { ArrowDown, Mic } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Brand } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { t } from '@/i18n';
import { formatQuantity } from '@/lib/format';
import { colors, layout, radius, size, spacing } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const demoRows = [
    { key: 'milk', qty: formatQuantity(2, 'count') },
    { key: 'rice', qty: formatQuantity(5, 'kg') },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.sm }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Brand />

        {/* Say it → it's on the list */}
        <View style={styles.hero} accessible accessibilityLabel={t('welcome.heroA11y')}>
          <View style={styles.bubble}>
            <View style={styles.micCircle}>
              <Mic size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke} />
            </View>
            <AppText variant="item" color="onDark" style={styles.flexShrink}>
              {t('welcome.quote')}
            </AppText>
          </View>
          <View style={styles.arrow}>
            <ArrowDown size={size.icon} color={colors.muted} strokeWidth={size.iconStroke} />
          </View>
          <View style={styles.demoCard}>
            {demoRows.map((row, index) => (
              <View key={row.key} style={[styles.demoRow, index > 0 && styles.divider]}>
                <View style={styles.checkbox} />
                <AppText variant="item" style={styles.flex} numberOfLines={1}>
                  {t(`welcome.${row.key}`)}
                </AppText>
                <View style={styles.qtyPill}>
                  <AppText variant="body" weight="bold">
                    {row.qty}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.text}>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t('welcome.title')}
          </AppText>
          <AppText variant="item" color="muted">
            {t('welcome.body')}
          </AppText>
        </View>

        <View style={styles.chips}>
          {['chipDialect', 'chipFamily', 'chipLanguage'].map((key) => (
            <View key={key} style={styles.chip}>
              <AppText variant="label" weight="medium">
                {t(`welcome.${key}`)}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <SheetButton label={t('welcome.start')} onPress={() => router.push('/verify')} />
        <SheetButton label={t('welcome.haveInvite')} tone="link" onPress={() => router.push('/join')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.ground,
  },
  flex: {
    flex: 1,
  },
  flexShrink: {
    flexShrink: 1,
  },
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    paddingEnd: spacing.xl,
    borderRadius: radius.card + spacing.sm,
    backgroundColor: colors.ink,
  },
  micCircle: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    paddingStart: spacing.xxl + spacing.sm,
  },
  demoCard: {
    alignSelf: 'flex-end',
    width: layout.heroCardWidth,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card + spacing.xs,
    backgroundColor: colors.surface,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  checkbox: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: radius.pill,
    borderWidth: size.borderThick,
    borderColor: colors.muted,
  },
  qtyPill: {
    minHeight: size.qtyPill,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    gap: spacing.md,
  },
  title: {
    lineHeight: size.titleLine,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  footer: {
    gap: spacing.xs,
  },
});
