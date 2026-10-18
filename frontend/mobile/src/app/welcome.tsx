// "قائمة وحدة للبيت كله" — first screen for someone new.
// Simulated: test menu → «ابدأ من جديد», or «ابدأ قائمة جديدة بدالها» on an expired invite.

import { useRouter } from 'expo-router';
import { Languages, RefreshCw, ShoppingCart, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Brand } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { t, tIn } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();

  // Hidden: long-press the logo to try the app with the fake household from earlier sessions
  const enterDemo = () => {
    list.enterDemo();
    router.dismissAll();
  };

  const benefits: { key: string; icon: LucideIcon }[] = [
    { key: 'benefitLive', icon: RefreshCw },
    { key: 'benefitShopper', icon: ShoppingCart },
    { key: 'benefitLanguage', icon: Languages },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.sm }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onLongPress={enterDemo} delayLongPress={800} accessible={false} style={styles.brand}>
          <Brand />
        </Pressable>

        <View style={styles.text}>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t('welcome.title')}
          </AppText>
          <AppText variant="item" color="muted">
            {t('welcome.body')}
          </AppText>
        </View>

        <View style={styles.benefits}>
          {benefits.map(({ key, icon: Icon }) => (
            <View key={key} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Icon size={size.iconSmall + spacing.xxs} color={colors.accent} strokeWidth={size.iconStroke} />
              </View>
              <AppText variant="body" weight="medium" style={styles.flexShrink}>
                {t(`welcome.${key}`)}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <SheetButton label={t('welcome.start')} onPress={() => router.push('/verify')} />
        <SheetButton label={t('welcome.haveInvite')} tone="link" onPress={() => router.push('/join')} />
        {/* For a driver or helper who doesn't read Arabic */}
        <AppText variant="meta" color="muted" style={styles.helperNote}>
          {tIn('en', 'welcome.helperNote')}
        </AppText>
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
  brand: {
    alignSelf: 'flex-start',
  },
  flexShrink: {
    flexShrink: 1,
  },
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  text: {
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  title: {
    lineHeight: size.titleLine,
  },
  benefits: {
    gap: spacing.md,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitIcon: {
    width: size.touch - spacing.sm,
    height: size.touch - spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: spacing.xs,
  },
  helperNote: {
    textAlign: 'center',
    writingDirection: 'ltr',
  },
});
