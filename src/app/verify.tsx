// Phone number → 4-digit code. Simulated: the code is always DEMO_OTP (a toast shows it).
// mode=create: new household (phone is typed here). mode=join: phone comes from the join screen.

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, MessageCircle, Pencil, RefreshCw, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { CodeBoxes, fullPhone, isValidPhone, PhoneField } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import {
  DEMO_OTP,
  OTP_LENGTH,
  OTP_LOCK_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  type LanguageKey,
} from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, opacity, radius, size, spacing } from '@/theme';

type Params = { mode?: 'create' | 'join'; phone?: string; lang?: LanguageKey };

const clock = (seconds: number) => `0:${String(seconds).padStart(2, '0')}`;

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const params = useLocalSearchParams<Params>();
  const joining = params.mode === 'join';

  const [phone, setPhone] = useState(params.phone ?? '');
  const [step, setStep] = useState<'phone' | 'code'>(params.phone ? 'code' : 'phone');
  const [code, setCode] = useState('');
  const [wrongTries, setWrongTries] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const locked = wrongTries >= OTP_MAX_ATTEMPTS;
  const showError = wrongTries > 0;
  const codeIsWrong = showError && code.length === OTP_LENGTH;

  const sendCode = (via: 'sms' | 'whatsapp') => {
    setCode('');
    setSecondsLeft(OTP_RESEND_SECONDS);
    list.notify(t(via === 'sms' ? 'toast.codeSent' : 'toast.codeSentWhatsapp', { code: DEMO_OTP }));
  };

  // Joining arrives with the number already typed — "send" straight away
  useEffect(() => {
    if (step === 'code') sendCode('sms');
  }, []);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onSendFirst = () => {
    Haptics.selectionAsync();
    setStep('code');
    sendCode('sms');
  };

  const onEditNumber = () => {
    if (joining) {
      router.back();
      return;
    }
    setCode('');
    setStep('phone');
  };

  const check = (value: string) => {
    if (value === DEMO_OTP) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (joining) router.replace({ pathname: '/join-setup', params: { lang: params.lang ?? 'ar' } });
      else router.replace('/household-setup');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setWrongTries((n) => n + 1);
  };

  const onCodeChange = (value: string) => {
    setCode(value);
    if (value.length === OTP_LENGTH) check(value);
  };

  const triesLeft = OTP_MAX_ATTEMPTS - wrongTries;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('onboarding.back')} onPress={() => router.back()} />
        </View>

        {showError ? (
          // After a wrong code (code-error.png)
          <>
            <View style={styles.intro}>
              <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
                {t('verify.codeTitle')}
              </AppText>
              <AppText variant="item" color="muted">
                {t('verify.sentTo', { phone: fullPhone(phone) })}
              </AppText>
            </View>

            <CodeBoxes value={code} onChange={onCodeChange} error={codeIsWrong || locked} disabled={locked} autoFocus={!locked} />

            {(codeIsWrong || locked) && (
              <View style={styles.errorLine} accessibilityLiveRegion="polite">
                <AlertCircle size={size.icon - spacing.xs} color={colors.danger} strokeWidth={size.iconStroke} />
                <AppText variant="label" weight="semibold" color="danger" style={styles.flexShrink}>
                  {locked ? t('verify.locked', { n: OTP_LOCK_MINUTES }) : t('verify.wrong', { n: triesLeft })}
                </AppText>
              </View>
            )}

            <View style={styles.card}>
              <OptionRow icon={RefreshCw} label={t('verify.newCode')} onPress={() => sendCode('sms')} disabled={locked} />
              <OptionRow
                icon={MessageCircle}
                label={t('verify.sendWhatsapp')}
                onPress={() => sendCode('whatsapp')}
                disabled={locked}
                divider
              />
              <OptionRow icon={Pencil} label={t('verify.wrongNumber')} onPress={onEditNumber} divider />
            </View>
          </>
        ) : (
          // Phone number, then the code (verify.png)
          <>
            <View style={styles.intro}>
              <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
                {t('verify.phoneTitle')}
              </AppText>
              <AppText variant="item" color="muted">
                {t('verify.phoneBody')}
              </AppText>
            </View>

            <View style={styles.block}>
              <AppText variant="label" weight="bold">
                {t('verify.phoneLabel')}
              </AppText>
              {step === 'phone' ? (
                <PhoneField digits={phone} onChange={setPhone} autoFocus label={t('verify.phoneLabel')} />
              ) : (
                <PhoneField digits={phone} onEdit={onEditNumber} label={t('verify.phoneLabel')} />
              )}
              {step === 'phone' && (
                <AppText variant="body" color="muted">
                  {t('verify.phoneHint')}
                </AppText>
              )}
            </View>

            {step === 'code' && (
              <>
                <View style={styles.block}>
                  <AppText variant="label" weight="bold">
                    {t('verify.codeLabel')}
                  </AppText>
                  <CodeBoxes value={code} onChange={onCodeChange} autoFocus />
                  <View style={styles.resendLine}>
                    <AppText variant="body" color="muted">
                      {t('verify.sentSms')}
                      {t('item.metaSeparator')}
                    </AppText>
                    {secondsLeft > 0 ? (
                      <AppText variant="body" color="muted">
                        {t('verify.resendIn', { time: clock(secondsLeft) })}
                      </AppText>
                    ) : (
                      <Pressable onPress={() => sendCode('sms')} hitSlop={spacing.md} accessibilityRole="button">
                        <AppText variant="body" weight="bold" color="accentInk">
                          {t('verify.resend')}
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                </View>

                <Pressable onPress={() => sendCode('whatsapp')} style={styles.whatsappButton} accessibilityRole="button">
                  <MessageCircle size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
                  <AppText variant="label" weight="semibold">
                    {t('verify.whatsappInstead')}
                  </AppText>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>

      <UndoToast bottomOffset={insets.bottom + size.button + spacing.xxxl * 2} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {showError ? (
          <AppText variant="body" color="muted" style={styles.center}>
            {t('verify.lockNote', { attempts: OTP_MAX_ATTEMPTS, minutes: OTP_LOCK_MINUTES })}
          </AppText>
        ) : step === 'phone' ? (
          <SheetButton label={t('verify.send')} onPress={onSendFirst} disabled={!isValidPhone(phone)} />
        ) : (
          <>
            <SheetButton label={t('verify.confirm')} onPress={() => check(code)} disabled={code.length < OTP_LENGTH} />
            <AppText variant="meta" color="muted" style={styles.center}>
              {t('verify.terms')}
            </AppText>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

type OptionRowProps = { icon: LucideIcon; label: string; onPress: () => void; disabled?: boolean; divider?: boolean };

function OptionRow({ icon: Icon, label, onPress, disabled, divider }: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.optionRow, divider && styles.divider, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}>
      <Icon size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
      <AppText variant="item">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  flexShrink: {
    flexShrink: 1,
  },
  center: {
    textAlign: 'center',
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
  block: {
    gap: spacing.md,
  },
  resendLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  whatsappButton: {
    minHeight: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  errorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.md,
  },
  card: {
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card + spacing.xs,
    backgroundColor: colors.surface,
  },
  optionRow: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
