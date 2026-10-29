// «قائمة جديدة» — a list with its own people (البيت، الشغل، الأصدقاء…).
// Uses my profile (from my current list, or from «عرّفنا عليك» for the very first list),
// then opens the invite screen for the new list (with step dashes when it's the first one).

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { ChipRow, ChoiceChip, Field, StepDashes } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { householdKindOrder, type HouseholdKind } from '@/data/fakeHousehold';
import { t, tList } from '@/i18n';
import * as api from '@/lib/api';
import { useList } from '@/store/ListStore';
import { colors, size, spacing } from '@/theme';

// Who each suggested name is for, in the order of lists.suggestions («البيت، الشغل، الصحاب، المصيف، الرحلة، بيت أهلي»)
const SUGGESTION_KINDS: HouseholdKind[] = ['family', 'work', 'friends', 'other', 'other', 'family'];

export default function NewListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const me = list.memberById(list.currentMemberId);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<HouseholdKind>('family');
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();

  // Don't suggest names I already use
  const taken = new Set(list.lists.map((l) => l.name.trim()));
  const suggestions = tList('lists.suggestions')
    .map((label, i) => ({ label, kind: SUGGESTION_KINDS[i] ?? 'other' }))
    .filter((s) => !taken.has(s.label));

  // No list open yet = this is the sign-up flow
  const first = list.mode !== 'live' && list.mode !== 'demo';

  const onCreate = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const profile: api.Profile | null = me
        ? { displayName: me.display_name, gender: me.gender, dialect: me.dialect, viewLanguage: me.view_language }
        : await api.getSignupProfile();
      if (!profile) {
        router.replace('/about-you');
        return;
      }
      const id = await api.createHousehold(trimmed, profile, kind);
      await list.refreshHousehold(first ? undefined : t('lists.created', { name: trimmed }), id);
    } catch (error) {
      if (__DEV__) console.warn('[newList]', error);
      list.notify(t('lists.failed'));
      setSaving(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Straight to inviting this list's people
    router.replace(first ? '/setup-invite' : '/invite');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('detail.back')} onPress={() => router.back()} />
          {first && <StepDashes current={2} total={3} />}
        </View>

        <View style={styles.intro}>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t(first ? 'firstList.nameTitle' : 'lists.newTitle')}
          </AppText>
          <AppText variant="item" color="muted">
            {t('lists.newBody')}
          </AppText>
        </View>

        <Field
          label={t('lists.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('lists.namePlaceholder')}
          autoFocus
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={onCreate}
        />

        {suggestions.length > 0 && (
          <ChipRow>
            {suggestions.map((s) => (
              <ChoiceChip
                key={s.label}
                label={s.label}
                selected={trimmed === s.label}
                onPress={() => {
                  setName(s.label);
                  setKind(s.kind);
                }}
              />
            ))}
          </ChipRow>
        )}

        {/* «بلّغ العيلة» or «بلّغ صحابك»…: the app's wording follows who the list is for */}
        <ChipRow label={t('lists.kindLabel')}>
          {householdKindOrder.map((k) => (
            <ChoiceChip key={k} label={t(`groups.${k}.label`)} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </ChipRow>
      </ScrollView>

      <UndoToast />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t('lists.create')} onPress={onCreate} disabled={!trimmed || saving} />
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
  intro: {
    gap: spacing.sm,
  },
  title: {
    lineHeight: size.titleLine,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
