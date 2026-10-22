// «اعمل كلمة سر» — making a password: after the first code (verify.tsx), after «نسيت كلمة السر؟»,
// for someone signed in from before passwords (set-password.tsx), or changing it from «حسابي».

import * as Haptics from 'expo-haptics';
import { AlertCircle } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PasswordField } from '@/components/onboarding/OnboardingParts';
import * as api from '@/lib/api';
import { colors, size, spacing } from '@/theme';

type Translate = (key: string, params?: Record<string, string | number>) => string;
export type NewPasswordKind = 'new' | 'reset' | 'change';

// The typed password and saving it. `save` returns true once Supabase has it.
export function useNewPassword(tr: Translate, notify: (message: string) => void) {
  const [password, setPassword] = useState('');
  const [tooShort, setTooShort] = useState(false); // shown after trying to save a short one
  const [busy, setBusy] = useState(false);

  const save = async (): Promise<boolean> => {
    if (busy) return false;
    if (password.length < api.PASSWORD_MIN_LENGTH) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTooShort(true);
      return false;
    }
    setBusy(true);
    try {
      await api.setPassword(password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (error) {
      if (__DEV__) console.warn('[setPassword]', error);
      notify(tr('password.saveFailed'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const change = (value: string) => {
    setPassword(value);
    if (value.length >= api.PASSWORD_MIN_LENGTH) setTooShort(false);
  };

  return { password, change, tooShort, busy, save };
}

type Props = {
  kind: NewPasswordKind;
  tr: Translate;
  form: ReturnType<typeof useNewPassword>;
  onSubmit: () => void;
};

// Title, why, the field and its rule (red when too short)
export function NewPasswordFields({ kind, tr, form, onSubmit }: Props) {
  const n = api.PASSWORD_MIN_LENGTH;
  return (
    <>
      <View style={styles.intro}>
        <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
          {tr(`password.${kind}Title`)}
        </AppText>
        <AppText variant="item" color="muted">
          {tr(`password.${kind}Body`)}
        </AppText>
      </View>

      <View style={styles.block}>
        <AppText variant="label" weight="bold">
          {tr('password.label')}
        </AppText>
        <PasswordField
          value={form.password}
          onChange={form.change}
          onSubmit={onSubmit}
          isNew
          error={form.tooShort}
          autoFocus
          label={tr('password.label')}
        />
        {form.tooShort ? (
          <View style={styles.errorLine} accessibilityLiveRegion="polite">
            <AlertCircle size={size.icon - spacing.xs} color={colors.danger} strokeWidth={size.iconStroke} />
            <AppText variant="label" weight="semibold" color="danger" style={styles.flexShrink}>
              {tr('password.tooShort', { n })}
            </AppText>
          </View>
        ) : (
          <AppText variant="body" color="muted">
            {tr('password.rule', { n })}
          </AppText>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.sm,
  },
  title: {
    lineHeight: size.titleLine,
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
});
