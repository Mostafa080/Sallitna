// "سمّ بيتك" — last step of starting a new household: list name, my name, dialect.

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { ChipRow, ChoiceChip, DialectCard, Field, StepDashes } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { dialectOrder, type DialectKey } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, size, spacing } from '@/theme';

export default function HouseholdSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();

  const [householdName, setHouseholdName] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'f' | 'm' | null>(null);
  const [dialect, setDialect] = useState<DialectKey>('saudi');

  const ready = householdName.trim() !== '' && name.trim() !== '' && gender !== null;

  const onNext = () => {
    if (!gender) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.createHousehold({ householdName, displayName: name, gender, dialect });
    router.replace('/setup-invite');
  };

  const pick = <T,>(set: (value: T) => void, value: T) => {
    Haptics.selectionAsync();
    set(value);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('onboarding.back')} onPress={() => router.back()} />
          <StepDashes current={3} total={3} />
        </View>

        <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
          {t('setup.title')}
        </AppText>

        <Field
          label={t('setup.listName')}
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder={t('setup.listPlaceholder')}
          returnKeyType="next"
        />
        <Field
          label={t('setup.yourName')}
          value={name}
          onChangeText={setName}
          placeholder={t('setup.namePlaceholder')}
          returnKeyType="done"
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
