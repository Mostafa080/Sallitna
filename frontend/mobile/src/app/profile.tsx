// «ملفي» — my own profile: name, «أنا», color, dialect, list language, languages I speak.
// Opened from the «حسابي» tab. Saved to the database in a real household.

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { ChipRow, ChoiceChip, Field } from '@/components/onboarding/OnboardingParts';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { SheetButton } from '@/components/shop/Sheet';
import { dialectOrder, languageOrder, type LanguageKey, type Member } from '@/data/fakeHousehold';
import { t, tIn } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

// Same choices the database allows (supabase/migrations: members.avatar_color)
const avatarColors: Member['avatar_color'][] = ['ink', 'info', 'accent', 'success', 'danger', 'line'];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const me = list.memberById(list.currentMemberId);

  const [name, setName] = useState(me?.display_name ?? '');
  const [gender, setGender] = useState(me?.gender ?? 'f');
  const [color, setColor] = useState(me?.avatar_color ?? 'ink');
  const [dialect, setDialect] = useState(me?.dialect ?? 'saudi');
  const [viewLanguage, setViewLanguage] = useState<LanguageKey>(me?.view_language ?? 'ar');
  const [speaks, setSpeaks] = useState<LanguageKey[]>(me?.speaks ?? ['ar']);

  if (!me) return null;

  const trimmed = name.trim();
  const pick = <T,>(set: (value: T) => void, value: T) => {
    Haptics.selectionAsync();
    set(value);
  };
  // Pick several; always keep at least one
  const toggleSpeaks = (key: LanguageKey) => {
    const next = speaks.includes(key) ? speaks.filter((k) => k !== key) : [...speaks, key];
    if (next.length > 0) pick(setSpeaks, languageOrder.filter((k) => next.includes(k)));
  };

  const onSave = () => {
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.updateProfile({ display_name: trimmed, gender, avatar_color: color, dialect, view_language: viewLanguage, speaks });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientBackground />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('detail.back')} onPress={() => router.back()} />
          <AppText variant="heading" weight="bold" accessibilityRole="header">
            {t('profile.title')}
          </AppText>
        </View>

        <View style={styles.preview}>
          <Avatar
            member={{ display_name: trimmed || me.display_name, initial: (trimmed || me.display_name).charAt(0), avatar_color: color }}
            large="hero"
            ring="ground"
          />
        </View>

        <Field label={t('profile.name')} value={name} onChangeText={setName} returnKeyType="done" maxLength={40} />

        <ChipRow label={t('onboarding.gender')}>
          <ChoiceChip label={t('onboarding.female')} selected={gender === 'f'} onPress={() => pick(setGender, 'f' as const)} />
          <ChoiceChip label={t('onboarding.male')} selected={gender === 'm'} onPress={() => pick(setGender, 'm' as const)} />
        </ChipRow>

        <View style={styles.block}>
          <AppText variant="label" weight="bold">
            {t('profile.color')}
          </AppText>
          <View style={styles.colors} accessibilityRole="radiogroup">
            {avatarColors.map((key, index) => {
              const selected = color === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => pick(setColor, key)}
                  style={[styles.swatch, { backgroundColor: colors[key] }, selected && styles.swatchSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t('profile.colorA11y', { n: index + 1 })}>
                  {selected && (
                    <Check size={size.iconSmall + spacing.xs} color={key === 'line' ? colors.ink : colors.onDark} strokeWidth={size.iconStroke + 1} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <ChipRow label={t('joinSetup.dialect')}>
          {dialectOrder.map((key) => (
            <ChoiceChip key={key} label={t(`dialectsShort.${key}`)} selected={dialect === key} onPress={() => pick(setDialect, key)} />
          ))}
        </ChipRow>

        <ChipRow label={t(`profile.seesIn_${gender}`)}>
          {languageOrder.map((key) => (
            <ChoiceChip
              key={key}
              label={tIn(key, `languages.${key}`)}
              selected={viewLanguage === key}
              onPress={() => pick(setViewLanguage, key)}
            />
          ))}
        </ChipRow>

        <ChipRow label={t(`profile.speaks_${gender}`)}>
          {languageOrder.map((key) => (
            <ChoiceChip key={key} label={tIn(key, `languages.${key}`)} selected={speaks.includes(key)} onPress={() => toggleSpeaks(key)} />
          ))}
        </ChipRow>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t('profile.save')} onPress={onSave} disabled={!trimmed} />
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
    gap: spacing.md,
  },
  preview: {
    alignItems: 'center',
  },
  block: {
    gap: spacing.sm,
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatch: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: size.border,
    borderColor: colors.line,
  },
  swatchSelected: {
    borderWidth: size.borderThick + 1,
    borderColor: colors.ink,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
