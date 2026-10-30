// «أنشئ قائمتك الأولى» — empty state after «عرّفنا عليك», before the person has any list.
// One action: name the first list (new-list), then add members, then the empty basket.

import { useRouter } from 'expo-router';
import { ListPlus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { StepDashes } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { t } from '@/i18n';
import { colors, radius, size, spacing } from '@/theme';

export default function FirstListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.sm }]}>
      <GradientBackground />
      <View style={styles.header}>
        <CircleButton icon={BackIcon} label={t('onboarding.back')} onPress={() => router.replace('/about-you')} />
        <StepDashes current={2} total={3} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconTile}>
          <ListPlus size={size.icon * 2} color={colors.accent} strokeWidth={size.iconStroke} />
        </View>
        <AppText variant="title" weight="bold" style={[styles.center, styles.title]} accessibilityRole="header">
          {t('firstList.title')}
        </AppText>
        <AppText variant="item" color="muted" style={styles.center}>
          {t('firstList.body')}
        </AppText>
      </View>

      <SheetButton label={t('firstList.create')} onPress={() => router.push('/new-list')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.ground,
  },
  center: {
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconTile: {
    width: size.emptyIcon + spacing.lg,
    height: size.emptyIcon + spacing.lg,
    borderRadius: radius.card * 2,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    lineHeight: size.titleLine,
  },
});
