// Email → 6-digit code, with Supabase email sign-in (the code is emailed through Resend, see supabase/config.toml).
// mode=create: new household (email is typed here). mode=join: email, invite code and list name come from join.
// mode=signin: email + password (no email sent); «نسيت كلمة السر؟» sends a code instead.
// After any code, someone without a password (or who forgot it) makes one before going on.

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, Pencil, RefreshCw, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { DirectionView, directionOf } from '@/components/DirectionView';
import { GlassCard } from '@/components/glass/Glass';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { backIconFor, CircleButton } from '@/components/family/FamilyParts';
import { NewPasswordFields, useNewPassword } from '@/components/onboarding/NewPassword';
import {
  cleanEmail,
  CodeBoxes,
  EmailField,
  isValidEmail,
  ltrEmail,
  PasswordField,
} from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import {
  OTP_LENGTH,
  OTP_LOCK_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  type LanguageKey,
} from '@/data/fakeHousehold';
import { getLanguage, tIn } from '@/i18n';
import * as api from '@/lib/api';
import { openLegal } from '@/lib/legal';
import { useList } from '@/store/ListStore';
import { colors, opacity, radius, size, spacing } from '@/theme';

type Params = {
  mode?: 'create' | 'join' | 'signin';
  email?: string;
  lang?: LanguageKey;
  code?: string;
  list?: string;
  role?: 'member' | 'helper';
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const params = useLocalSearchParams<Params>();
  const joining = params.mode === 'join';
  const signingIn = params.mode === 'signin';
  // A helper joining sees these steps in their language (picked on the join screen); everyone else Arabic
  const [language] = useState(getLanguage);
  const tr = (key: string, p?: Record<string, string | number>) => tIn(language, key, p);

  const [email, setEmail] = useState(params.email ?? '');
  const [step, setStep] = useState<'email' | 'code' | 'newPassword'>(params.email ? 'code' : 'email');
  const [password, setPassword] = useState(''); // signing in
  const [wrongPassword, setWrongPassword] = useState(false);
  const [forgot, setForgot] = useState(false); // came through «نسيت كلمة السر؟» → a new password after the code
  const [code, setCode] = useState('');
  const [wrongTries, setWrongTries] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false); // waiting for Supabase

  const newPassword = useNewPassword(tr, list.notify);

  const locked = wrongTries >= OTP_MAX_ATTEMPTS;
  const showError = wrongTries > 0 && step === 'code';
  const codeIsWrong = showError && code.length === OTP_LENGTH;

  const sendCode = async (): Promise<boolean> => {
    setCode('');
    setBusy(true);
    try {
      await api.sendCode(cleanEmail(email));
      setSecondsLeft(OTP_RESEND_SECONDS);
      return true;
    } catch (error) {
      if (__DEV__) console.warn('[sendCode]', error);
      list.notify(tr('verify.sendFailed'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Joining arrives with the email already typed — "send" straight away
  useEffect(() => {
    if (step === 'code') sendCode();
  }, []);

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onSendFirst = async () => {
    if (!isValidEmail(email) || busy) return;
    Haptics.selectionAsync();
    if (await sendCode()) setStep('code');
  };

  const onForgot = async () => {
    if (!isValidEmail(email) || busy) return;
    Haptics.selectionAsync();
    setForgot(true);
    setWrongTries(0);
    if (await sendCode()) setStep('code');
  };

  const onSignIn = async () => {
    if (!isValidEmail(email) || !password || busy) return;
    setBusy(true);
    try {
      if ((await api.signInWithPassword(cleanEmail(email), password)) === 'wrong') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setWrongPassword(true);
        setBusy(false);
        return;
      }
    } catch (error) {
      if (__DEV__) console.warn('[signInWithPassword]', error);
      list.notify(tr('verify.signinFailed'));
      setBusy(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await goOn();
  };

  const onSavePassword = async () => {
    if (await newPassword.save()) {
      setBusy(true);
      await goOn();
    }
  };

  const onEditEmail = () => {
    if (joining) {
      router.back();
      return;
    }
    setCode('');
    setForgot(false);
    setStep('email');
  };

  const check = async (value: string) => {
    if (busy || locked) return;
    setBusy(true);
    try {
      await api.verifyCode(cleanEmail(email), value);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWrongTries((n) => n + 1);
      setBusy(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Everyone needs a password: make one now (or a new one after «نسيت كلمة السر؟»)
    if (forgot || !(await api.hasPassword())) {
      setBusy(false);
      setStep('newPassword');
      return;
    }
    await goOn();
  };

  // Signed in: where to next
  const goOn = async () => {
    if (joining) {
      router.replace({
        pathname: '/join-setup',
        params: { lang: params.lang ?? 'ar', code: params.code, list: params.list, role: params.role ?? 'member' },
      });
      return;
    }
    // Already in a household on another phone? Straight back to it.
    try {
      const membership = await api.loadMembership();
      if (membership) {
        const me = membership.members.find((m) => m.id === membership.meId);
        await list.refreshHousehold(tr(`toast.welcomeBack_${me?.gender ?? 'm'}`, { list: membership.householdName }));
        router.dismissAll();
        return;
      }
    } catch {
      // Couldn't check — carry on to naming a new household
    }
    setBusy(false);
    // New here: about you first; already answered (e.g. closed the app mid-way): create the first list
    router.replace((await api.getSignupProfile().catch(() => null)) ? '/first-list' : '/about-you');
  };

  const onCodeChange = (value: string) => {
    setCode(value);
    if (value.length === OTP_LENGTH) check(value);
  };

  const triesLeft = OTP_MAX_ATTEMPTS - wrongTries;
  const BackIcon = backIconFor(directionOf(language));

  return (
    <DirectionView language={language}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientBackground />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Making the password can't be skipped (already signed in by then) */}
          <View style={styles.header}>
            {step !== 'newPassword' && (
              <CircleButton icon={BackIcon} label={tr('onboarding.back')} onPress={() => router.back()} />
            )}
          </View>

          {step === 'newPassword' ? (
            <NewPasswordFields kind={forgot ? 'reset' : 'new'} tr={tr} form={newPassword} onSubmit={onSavePassword} />
          ) : showError ? (
            // After a wrong code (code-error.png)
            <>
              <View style={styles.intro}>
                <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
                  {tr('verify.codeTitle')}
                </AppText>
                <AppText variant="item" color="muted">
                  {tr('verify.sentTo', { email: ltrEmail(email) })}
                </AppText>
              </View>

              <CodeBoxes
                value={code}
                onChange={onCodeChange}
                error={codeIsWrong || locked}
                disabled={locked}
                autoFocus={!locked}
              />

              {(codeIsWrong || locked) && (
                <View style={styles.errorLine} accessibilityLiveRegion="polite">
                  <AlertCircle size={size.icon - spacing.xs} color={colors.danger} strokeWidth={size.iconStroke} />
                  <AppText variant="label" weight="semibold" color="danger" style={styles.flexShrink}>
                    {locked ? tr('verify.locked', { n: OTP_LOCK_MINUTES }) : tr('verify.wrong', { n: triesLeft })}
                  </AppText>
                </View>
              )}

              <GlassCard style={styles.card}>
                <OptionRow
                  icon={RefreshCw}
                  label={
                    secondsLeft > 0
                      ? `${tr('verify.newCode')}${tr('item.metaSeparator')}${clock(secondsLeft)}`
                      : tr('verify.newCode')
                  }
                  onPress={() => sendCode()}
                  disabled={locked || secondsLeft > 0}
                />
                <OptionRow icon={Pencil} label={tr('verify.wrongEmail')} onPress={onEditEmail} divider />
              </GlassCard>
            </>
          ) : (
            // Email, then the code (verify.png, with an email field instead of the phone number)
            <>
              <View style={styles.intro}>
                <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
                  {tr(signingIn && step === 'email' ? 'verify.signinTitle' : 'verify.emailTitle')}
                </AppText>
                <AppText variant="item" color="muted">
                  {tr(signingIn && step === 'email' ? 'verify.signinBody' : 'verify.emailBody')}
                </AppText>
              </View>

              <View style={styles.block}>
                <AppText variant="label" weight="bold">
                  {tr('verify.emailLabel')}
                </AppText>
                {step === 'email' ? (
                  <EmailField
                    value={email}
                    onChange={(value) => {
                      setEmail(value);
                      setWrongPassword(false);
                    }}
                    onSubmit={signingIn ? undefined : onSendFirst}
                    autoFocus
                    label={tr('verify.emailLabel')}
                  />
                ) : (
                  <EmailField value={email} onEdit={onEditEmail} label={tr('verify.emailLabel')} />
                )}
                {step === 'email' && !signingIn && (
                  <AppText variant="body" color="muted">
                    {tr('verify.emailHint')}
                  </AppText>
                )}
              </View>

              {step === 'email' && signingIn && (
                <View style={styles.block}>
                  <AppText variant="label" weight="bold">
                    {tr('password.label')}
                  </AppText>
                  <PasswordField
                    value={password}
                    onChange={(value) => {
                      setPassword(value);
                      setWrongPassword(false);
                    }}
                    onSubmit={onSignIn}
                    error={wrongPassword}
                    label={tr('password.label')}
                  />
                  {wrongPassword ? (
                    <View style={styles.passwordError} accessibilityLiveRegion="polite">
                      <AlertCircle size={size.icon - spacing.xs} color={colors.danger} strokeWidth={size.iconStroke} />
                      <AppText variant="label" weight="semibold" color="danger" style={styles.flexShrink}>
                        {tr('verify.wrongPassword')}
                      </AppText>
                    </View>
                  ) : (
                    <AppText variant="body" color="muted">
                      {tr('verify.firstTimeHint')}
                    </AppText>
                  )}
                  <Pressable
                    onPress={onForgot}
                    disabled={!isValidEmail(email) || busy}
                    hitSlop={spacing.md}
                    style={[styles.forgot, !isValidEmail(email) && styles.disabled]}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !isValidEmail(email) }}>
                    <AppText variant="body" weight="bold" color="accentInk">
                      {tr('verify.forgot')}
                    </AppText>
                  </Pressable>
                </View>
              )}

              {step === 'code' && (
                <>
                  <View style={styles.block}>
                    <AppText variant="label" weight="bold">
                      {tr('verify.codeLabel')}
                    </AppText>
                    <CodeBoxes value={code} onChange={onCodeChange} autoFocus />
                    <View style={styles.resendLine}>
                      <AppText variant="body" color="muted">
                        {tr('verify.sentEmail')}
                        {tr('item.metaSeparator')}
                      </AppText>
                      {secondsLeft > 0 ? (
                        <AppText variant="body" color="muted">
                          {tr('verify.resendIn', { time: clock(secondsLeft) })}
                        </AppText>
                      ) : (
                        <Pressable onPress={() => sendCode()} hitSlop={spacing.md} accessibilityRole="button">
                          <AppText variant="body" weight="bold" color="accentInk">
                            {tr('verify.resend')}
                          </AppText>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <AppText variant="body" color="muted">
                    {tr('verify.spamHint')}
                  </AppText>
                </>
              )}
            </>
          )}
        </ScrollView>

        <UndoToast />

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          {step === 'newPassword' ? (
            <SheetButton
              label={tr('password.save')}
              onPress={onSavePassword}
              disabled={!newPassword.password || newPassword.busy || busy}
            />
          ) : showError ? (
            <AppText variant="body" color="muted" style={styles.center}>
              {tr('verify.lockNote', { attempts: OTP_MAX_ATTEMPTS, minutes: OTP_LOCK_MINUTES })}
            </AppText>
          ) : step === 'email' && signingIn ? (
            <SheetButton label={tr('verify.signin')} onPress={onSignIn} disabled={!isValidEmail(email) || !password || busy} />
          ) : step === 'email' ? (
            <SheetButton label={tr('verify.send')} onPress={onSendFirst} disabled={!isValidEmail(email) || busy} />
          ) : (
            <>
              <SheetButton
                label={tr('verify.confirm')}
                onPress={() => check(code)}
                disabled={code.length < OTP_LENGTH || busy}
              />
              {/* «لما تكمّل تبقى موافق على الشروط وسياسة الخصوصية» — both open the page on sallitna.online */}
              <AppText variant="meta" color="muted" style={styles.center}>
                {tr('verify.termsBefore')}
                <AppText variant="meta" weight="bold" style={styles.link} onPress={() => openLegal('terms', language)}>
                  {tr('verify.termsLink')}
                </AppText>
                {tr('verify.termsAnd')}
                <AppText variant="meta" weight="bold" style={styles.link} onPress={() => openLegal('privacy', language)}>
                  {tr('verify.privacyLink')}
                </AppText>
                {tr('verify.termsAfter')}
              </AppText>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </DirectionView>
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
  link: {
    textDecorationLine: 'underline',
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
  passwordError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  forgot: {
    alignSelf: 'flex-start',
    minHeight: size.touch,
    justifyContent: 'center',
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
