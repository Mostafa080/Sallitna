// "أهلًا سارة" — after the code, a new member sets their name, dialect and list language.

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Mic, ShoppingBasket, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { ChipRow, ChoiceChip, Field } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { dialectOrder, languageOrder, type DialectKey, type LanguageKey } from '@/data/fakeHousehold';
import { t, tIn } from '@/i18n';
import * as api from '@/lib/api';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

export default function JoinSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const params = useLocalSearchParams<{ lang?: LanguageKey; code?: string; list?: string }>();
  const listName = params.list ?? '';

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'f' | 'm' | null>(null);
  const [dialect, setDialect] = useState<DialectKey>('saudi');
  const [language, setLanguage] = useState<LanguageKey>(params.lang ?? 'ar');

  // Wording follows the gender once it's picked (masculine until then, the usual Arabic default)
  const g = gender ?? 'm';
  const trimmed = name.trim();
  const [saving, setSaving] = useState(false);
  const ready = trimmed !== '' && gender !== null && !saving;

  const pick = <T,>(set: (value: T) => void, value: T) => {
    Haptics.selectionAsync();
    set(value);
  };

  const onEnter = async () => {
    if (!gender || !params.code || saving) return;
    setSaving(true);
    try {
      const id = await api.joinHousehold(params.code, { displayName: trimmed, gender, dialect, viewLanguage: language });
      await list.refreshHousehold(t('toast.joined', { name: trimmed, list: listName }), id);
    } catch (error) {
      if (__DEV__) console.warn('[joinHousehold]', error);
      list.notify(t('joinSetup.failed'));
      setSaving(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissAll();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar
            member={{ display_name: trimmed, initial: trimmed.charAt(0) || '؟', avatar_color: 'success' }}
            large="hero"
            ring="ground"
          />
          <View style={styles.flex}>
            <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {trimmed ? t('joinSetup.hello', { name: trimmed }) : t('joinSetup.helloEmpty')}
            </AppText>
            <AppText variant="item" color="muted">
              {t(`joinSetup.joined_${g}`, { list: listName })}
            </AppText>
          </View>
        </View>

        <Field
          label={t('joinSetup.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('joinSetup.namePlaceholder')}
          returnKeyType="done"
          autoFocus
        />

        <ChipRow label={t('onboarding.gender')}>
          <ChoiceChip label={t('onboarding.female')} selected={gender === 'f'} onPress={() => pick(setGender, 'f' as const)} />
          <ChoiceChip label={t('onboarding.male')} selected={gender === 'm'} onPress={() => pick(setGender, 'm' as const)} />
        </ChipRow>

        <ChipRow label={t('joinSetup.dialect')}>
          {dialectOrder.map((key) => (
            <ChoiceChip key={key} label={t(`dialectsShort.${key}`)} selected={dialect === key} onPress={() => pick(setDialect, key)} />
          ))}
        </ChipRow>

        <ChipRow label={t(`joinSetup.seesIn_${g}`)}>
          {languageOrder.map((key) => (
            <ChoiceChip
              key={key}
              label={tIn(key, `languages.${key}`)}
              selected={language === key}
              onPress={() => pick(setLanguage, key)}
            />
          ))}
        </ChipRow>

        <View style={styles.tips}>
          <AppText variant="label" weight="bold">
            {t(`joinSetup.howTitle_${g}`)}
          </AppText>
          <Tip icon={Mic} tone="accent" text={t(`joinSetup.tipVoice_${g}`)} />
          <Tip icon={ShoppingBasket} tone="ink" text={t(`joinSetup.tipStore_${g}`)} />
        </View>
      </ScrollView>

      <UndoToast bottomOffset={insets.bottom + size.button + spacing.xxl} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t(`joinSetup.enter_${g}`)} onPress={onEnter} disabled={!ready} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Tip({ icon: Icon, tone, text }: { icon: LucideIcon; tone: 'accent' | 'ink'; text: string }) {
  return (
    <View style={styles.tip}>
      <View style={[styles.tipIcon, { backgroundColor: colors[tone] }]}>
        <Icon size={size.iconSmall + spacing.xs} color={colors.onDark} strokeWidth={size.iconStroke} />
      </View>
      <AppText variant="label" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    lineHeight: size.titleLine,
  },
  tips: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.card + spacing.xs,
    backgroundColor: colors.surface,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tipIcon: {
    width: size.bannerIcon,
    height: size.bannerIcon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
