// «احذف حسابك» — from «حسابي». Says what happens to each kind of list, asks for the password once more,
// then deletes the account for good (delete_my_account in the database) and goes back to welcome.

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { PasswordField } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { t } from '@/i18n';
import * as api from '@/lib/api';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

const WHAT_HAPPENS = ['bulletAlone', 'bulletManager', 'bulletItems', 'bulletForever'] as const;

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!password || busy) return;
    setBusy(true);
    try {
      // The password once more, so nobody else holding the phone can do this
      const email = await api.myEmail();
      if (!email || (await api.signInWithPassword(email, password)) === 'wrong') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setWrongPassword(true);
        setBusy(false);
        return;
      }
      await api.deleteMyAccount();
    } catch (error) {
      if (__DEV__) console.warn('[deleteAccount]', error);
      list.notify(t('deleteAccount.failed'));
      setBusy(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Signed out now: the app goes back to welcome by itself
    Alert.alert(t('deleteAccount.doneTitle'), t('deleteAccount.doneBody'));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('onboarding.back')} onPress={() => router.back()} />
        </View>

        <View style={styles.intro}>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t('deleteAccount.title')}
          </AppText>
          <AppText variant="item" color="muted">
            {t('deleteAccount.body')}
          </AppText>
        </View>

        <View style={styles.card}>
          {WHAT_HAPPENS.map((key) => (
            <View key={key} style={styles.bullet}>
              <View style={styles.dot} />
              <AppText variant="body" style={styles.flexShrink}>
                {t(`deleteAccount.${key}`)}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.block}>
          <AppText variant="label" weight="bold">
            {t('deleteAccount.passwordLabel')}
          </AppText>
          <PasswordField
            value={password}
            onChange={(value) => {
              setPassword(value);
              setWrongPassword(false);
            }}
            onSubmit={onDelete}
            error={wrongPassword}
            label={t('deleteAccount.passwordLabel')}
          />
          {wrongPassword && (
            <View style={styles.errorLine} accessibilityLiveRegion="polite">
              <AlertCircle size={size.icon - spacing.xs} color={colors.danger} strokeWidth={size.iconStroke} />
              <AppText variant="label" weight="semibold" color="danger" style={styles.flexShrink}>
                {t('deleteAccount.wrongPassword')}
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>

      <UndoToast bottomOffset={insets.bottom + size.button + spacing.xxxl} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t('deleteAccount.confirm')} tone="danger" onPress={onDelete} disabled={!password || busy} />
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
    gap: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
  },
  intro: {
    gap: spacing.sm,
  },
  title: {
    lineHeight: size.titleLine,
  },
  card: {
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dot: {
    width: spacing.sm,
    height: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
  block: {
    gap: spacing.md,
  },
  errorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flexShrink: {
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
