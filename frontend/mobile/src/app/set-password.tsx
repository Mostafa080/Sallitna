// «اعمل كلمة سر» on its own: for someone signed in from before passwords (opened by app/(tabs)/index.tsx,
// can't be skipped), or «غيّر كلمة السر» from «حسابي» (mode=change, with a back button).

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DirectionView, directionOf } from '@/components/DirectionView';
import { backIconFor, CircleButton } from '@/components/family/FamilyParts';
import { NewPasswordFields, useNewPassword } from '@/components/onboarding/NewPassword';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { getLanguage, tIn } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, size, spacing } from '@/theme';

export default function SetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const changing = useLocalSearchParams<{ mode?: 'change' }>().mode === 'change';
  // A helper sees it in their language
  const [language] = useState(getLanguage);
  const tr = (key: string, p?: Record<string, string | number>) => tIn(language, key, p);
  const form = useNewPassword(tr, list.notify);
  const BackIcon = backIconFor(directionOf(language));

  const onSave = async () => {
    if (!(await form.save())) return;
    if (changing) list.notify(tr('password.saved'));
    // Back to where it opened from (the lists screen carries on from there)
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <DirectionView language={language}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            {changing && <CircleButton icon={BackIcon} label={tr('onboarding.back')} onPress={() => router.back()} />}
          </View>
          <NewPasswordFields kind={changing ? 'change' : 'new'} tr={tr} form={form} onSubmit={onSave} />
        </ScrollView>

        <UndoToast />

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <SheetButton
            label={tr(changing ? 'password.saveChange' : 'password.save')}
            onPress={onSave}
            disabled={!form.password || form.busy}
          />
        </View>
      </KeyboardAvoidingView>
    </DirectionView>
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
    gap: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    minHeight: size.touch,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
