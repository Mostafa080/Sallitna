// «عرّفنا عليك» — step 1 after the phone code: my name, «أنا», dialect.
// Saved with the sign-in account; then «أنشئ قائمتك الأولى» (first-list) → name the list → add members.

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { ChipRow, ChoiceChip, DialectCard, Field, StepDashes } from '@/components/onboarding/OnboardingParts';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { dialectOrder, type DialectKey } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import * as api from '@/lib/api';
import { useList } from '@/store/ListStore';
import { colors, size, spacing } from '@/theme';

export default function AboutYouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'f' | 'm' | null>(null);
  const [dialect, setDialect] = useState<DialectKey>('saudi');

  const [saving, setSaving] = useState(false);

  const ready = name.trim() !== '' && gender !== null && !saving;

  const onNext = async () => {
    if (!gender || saving) return;
    setSaving(true);
    try {
      await api.saveSignupProfile({ displayName: name.trim(), gender, dialect, viewLanguage: 'ar' });
    } catch (error) {
      if (__DEV__) console.warn('[saveSignupProfile]', error);
      // The account behind this sign-in is gone → start over from welcome
      if (await api.clearStaleSession()) {
        list.signOut();
        return;
      }
      list.notify(t('setup.failed'));
      setSaving(false);
      return;
    }
    Haptics.selectionAsync();
    router.replace('/first-list');
  };

  // Signed in but no list yet: going back means "use another number" → sign out and start over
  const onBack = () => {
    if (list.mode === 'needsHousehold') list.signOut();
    else router.back();
  };

  const pick = <T,>(set: (value: T) => void, value: T) => {
    Haptics.selectionAsync();
    set(value);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientBackground />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('onboarding.back')} onPress={onBack} />
          <StepDashes current={1} total={3} />
        </View>

        <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
          {t('setup.aboutTitle')}
        </AppText>

        <Field
          label={t('setup.yourName')}
          value={name}
          onChangeText={setName}
          placeholder={t('setup.namePlaceholder')}
          returnKeyType="done"
          autoFocus
        />

        <ChipRow label={t('onboarding.gender')}>
          <ChoiceChip label={t('onboarding.female')} selected={gender === 'f'} onPress={() => pick(setGender, 'f' as const)} />
          <ChoiceChip label={t('onboarding.male')} selected={gender === 'm'} onPress={() => pick(setGender, 'm' as const)} />
        </ChipRow>

        <View style={styles.block}>
          <View>
            <AppText variant="label" weight="bold">
              {t('setup.dialect')}
            </AppText>
            <AppText variant="body" color="muted">
              {t('setup.dialectBody')}
            </AppText>
          </View>
          <View style={styles.grid} accessibilityRole="radiogroup">
            {dialectOrder.map((key) => (
              <DialectCard
                key={key}
                title={t(`dialects.${key}`)}
                example={t(`dialectExamples.${key}`)}
                selected={dialect === key}
                onPress={() => pick(setDialect, key)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <UndoToast />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t('setup.next')} onPress={onNext} disabled={!ready} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    lineHeight: size.titleLine,
  },
  block: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
