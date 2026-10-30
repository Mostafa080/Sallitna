// "أهلًا سارة" — after the code, a new member sets their name, dialect and list language.
// A helper (driver / maid) sees it in their own language, without the Arabic-dialect question.

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Mic, Plus, ShoppingBasket, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { DirectionView } from '@/components/DirectionView';
import { ChipRow, ChoiceChip, Field } from '@/components/onboarding/OnboardingParts';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { dialectOrder, languageOrder, type DialectKey, type LanguageKey } from '@/data/fakeHousehold';
import { setLanguage as setAppLanguage, t, tIn } from '@/i18n';
import * as api from '@/lib/api';
import { features } from '@/lib/features';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

export default function JoinSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const params = useLocalSearchParams<{
    lang?: LanguageKey;
    code?: string;
    list?: string;
    role?: 'member' | 'helper';
  }>();
  // Helpers (driver / maid): their language, no Arabic-dialect question, tips for their list
  const helper = params.role === 'helper';
  const listName = params.list ?? '';

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'f' | 'm' | null>(null);
  const [dialect, setDialect] = useState<DialectKey>(helper ? 'other' : 'egyptian');
  const [language, setLanguage] = useState<LanguageKey>(params.lang ?? 'ar');
  // Helpers: text in their language (asked for explicitly, so it updates when they switch); members: Arabic
  const tr = (key: string, params?: Record<string, string | number>) => tIn(helper ? language : 'ar', key, params);

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
      const id = await api.joinHousehold(params.code, {
        displayName: trimmed,
        gender,
        dialect,
        viewLanguage: language,
      });
      await list.refreshHousehold(tr('toast.joined', { name: trimmed, list: listName }), id);
    } catch (error) {
      if (__DEV__) console.warn('[joinHousehold]', error);
      list.notify(tr('joinSetup.failed'));
      setSaving(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissAll();
  };

  return (
    <DirectionView language={helper ? language : 'ar'}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientBackground />
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
                {trimmed ? tr('joinSetup.hello', { name: trimmed }) : tr('joinSetup.helloEmpty')}
              </AppText>
              <AppText variant="item" color="muted">
                {tr(`joinSetup.joined_${g}`, { list: listName })}
              </AppText>
            </View>
          </View>

          <Field
            label={tr('joinSetup.nameLabel')}
            value={name}
            onChangeText={setName}
            placeholder={tr('joinSetup.namePlaceholder')}
            returnKeyType="done"
            autoFocus
          />

          <ChipRow label={tr('onboarding.gender')}>
            <ChoiceChip
              label={tr('onboarding.female')}
              selected={gender === 'f'}
              onPress={() => pick(setGender, 'f' as const)}
            />
            <ChoiceChip
              label={tr('onboarding.male')}
              selected={gender === 'm'}
              onPress={() => pick(setGender, 'm' as const)}
            />
          </ChipRow>

          {!helper && (
            <ChipRow label={tr('joinSetup.dialect')}>
              {dialectOrder.map((key) => (
                <ChoiceChip
                  key={key}
                  label={tr(`dialectsShort.${key}`)}
                  selected={dialect === key}
                  onPress={() => pick(setDialect, key)}
                />
              ))}
            </ChipRow>
          )}

          <ChipRow label={tr(`joinSetup.seesIn_${g}`)}>
            {languageOrder.map((key) => (
              <ChoiceChip
                key={key}
                label={tIn(key, `languages.${key}`)}
                selected={language === key}
                onPress={() => {
                  // A helper's whole app follows this choice
                  if (helper) setAppLanguage(key);
                  pick(setLanguage, key);
                }}
              />
            ))}
          </ChipRow>

          <View style={styles.tips}>
            <AppText variant="label" weight="bold">
              {tr(`joinSetup.howTitle_${g}`)}
            </AppText>
            {helper ? (
              <>
                <Tip icon={Check} tone="accent" text={tr('joinSetup.tipTick')} />
                <Tip icon={Plus} tone="ink" text={tr('joinSetup.tipAdd')} />
              </>
            ) : (
              <>
                {features.voice && <Tip icon={Mic} tone="accent" text={tr(`joinSetup.tipVoice_${g}`)} />}
                <Tip icon={ShoppingBasket} tone="ink" text={tr(`joinSetup.tipStore_${g}`)} />
              </>
            )}
          </View>
        </ScrollView>

        <UndoToast />

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <SheetButton label={tr(`joinSetup.enter_${g}`)} onPress={onEnter} disabled={!ready} />
        </View>
      </KeyboardAvoidingView>
    </DirectionView>
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
