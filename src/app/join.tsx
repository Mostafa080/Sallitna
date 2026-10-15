// "انضم لقائمة «…»" — joining a family's list with an invite.
// Until invite links open the app by themselves, the person types the code from the invite message
// (or it arrives as ?code=… on the link). The family's name and faces come from get_invite().
// A helper code (driver / maid) switches the screen — and the next steps — to the language they pick.

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { DirectionView, directionOf } from '@/components/DirectionView';
import { backIconFor, CircleButton } from '@/components/family/FamilyParts';
import { Brand, ChipRow, ChoiceChip, isValidPhone, PhoneField } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { languageOrder, type LanguageKey } from '@/data/fakeHousehold';
import { setLanguage as setAppLanguage, t, tIn } from '@/i18n';
import * as api from '@/lib/api';
import { colors, fonts, fontSize, radius, size, spacing } from '@/theme';

const CODE_LENGTH = 8;
const cleanCode = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);

export default function JoinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();

  const [code, setCode] = useState(cleanCode(params.code ?? ''));
  const [invite, setInvite] = useState<api.InvitePreview | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking' | 'notFound'>('idle');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<LanguageKey>('ar');
  const helper = invite?.role === 'helper';
  // Text in the screen's language (asked for explicitly, so it updates the moment a helper switches)
  const tr = (key: string, params?: Record<string, string | number>) => tIn(helper ? language : 'ar', key, params);

  // Helpers: the whole join flow speaks the language they pick (the app keeps it once they're in)
  const chooseLanguage = (key: LanguageKey) => {
    if (helper) setAppLanguage(key);
    setLanguage(key);
  };
  const goBack = () => {
    setAppLanguage('ar');
    router.back();
  };

  // Look the invite up as soon as the whole code is typed
  useEffect(() => {
    setInvite(null);
    if (code.length < CODE_LENGTH) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('checking');
    api
      .getInvite(code)
      .then((found) => {
        if (cancelled) return;
        if (!found) return setStatus('notFound');
        if (found.expired) {
          router.replace({
            pathname: '/invite-expired',
            params: { list: found.householdName, inviter: found.inviterName ?? '' },
          });
          return;
        }
        // A helper most likely reads English first; they can switch below
        if (found.role === 'helper') {
          setAppLanguage('en');
          setLanguage('en');
        }
        setInvite(found);
        setStatus('idle');
      })
      .catch(() => !cancelled && setStatus('notFound'));
    return () => {
      cancelled = true;
    };
  }, [code]);

  const onSend = () => {
    if (!invite) return;
    Haptics.selectionAsync();
    router.push({
      pathname: '/verify',
      params: { mode: 'join', phone, lang: language, code, list: invite.householdName, role: invite.role },
    });
  };

  const BackIcon = backIconFor(directionOf(helper ? language : 'ar'));

  return (
    <DirectionView language={helper ? language : 'ar'}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Brand />
            <CircleButton icon={BackIcon} label={tr('onboarding.back')} onPress={goBack} />
          </View>

          {invite ? (
            <View style={styles.invite}>
              <View style={styles.faces} accessible accessibilityLabel={tr('join.facesA11y')}>
                {invite.faces.map((face, index) => (
                  <View key={index} style={[index > 0 && styles.overlap, { zIndex: invite.faces.length - index }]}>
                    <Avatar
                      member={{ display_name: face.initial, initial: face.initial, avatar_color: face.color }}
                      large="hero"
                      ring="ground"
                    />
                  </View>
                ))}
                <View style={[styles.overlap, styles.newFace]}>
                  <Plus size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
                </View>
              </View>

              <AppText variant="label" color="muted">
                {invite.inviterName
                  ? tr(`join.invites_${invite.inviterGender ?? 'f'}`, { name: invite.inviterName })
                  : tr('join.someone')}
              </AppText>
              <AppText variant="title" weight="bold" style={[styles.center, styles.title]} accessibilityRole="header">
                {tr('join.title', { list: invite.householdName })}
              </AppText>
              <AppText variant="item" color="muted" style={styles.center}>
                {tr('join.body', { count: tr('members.count', { n: invite.memberCount }) })}
              </AppText>
            </View>
          ) : (
            <View style={styles.block}>
              <AppText variant="label" weight="bold">
                {tr('join.codeLabel')}
              </AppText>
              <TextInput
                value={code}
                onChangeText={(text) => setCode(cleanCode(text))}
                placeholder={tr('join.codePlaceholder')}
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={!code}
                maxLength={CODE_LENGTH}
                style={styles.codeInput}
                accessibilityLabel={tr('join.codeLabel')}
              />
              <AppText variant="body" color={status === 'notFound' ? 'danger' : 'muted'}>
                {status === 'checking'
                  ? tr('join.checking')
                  : status === 'notFound'
                    ? tr('join.notFound')
                    : tr('join.codeHint')}
              </AppText>
            </View>
          )}

          {invite && (
            <>
              {helper && (
                <ChipRow label={tr(helper ? 'join.languageHelper' : 'join.language')}>
                  {(helper ? helperLanguageOrder : languageOrder).map((key) => (
                    <ChoiceChip
                      key={key}
                      label={tIn(key, `languages.${key}`)}
                      selected={language === key}
                      onPress={() => chooseLanguage(key)}
                    />
                  ))}
                </ChipRow>
              )}
              <View style={styles.block}>
                <AppText variant="label" weight="bold">
                  {tr('join.phoneLabel')}
                </AppText>
                <PhoneField digits={phone} onChange={setPhone} label={tr('join.phoneLabel')} autoFocus={!helper} />
              </View>
              {!helper && (
                <ChipRow label={tr(helper ? 'join.languageHelper' : 'join.language')}>
                  {(helper ? helperLanguageOrder : languageOrder).map((key) => (
                    <ChoiceChip
                      key={key}
                      label={tIn(key, `languages.${key}`)}
                      selected={language === key}
                      onPress={() => chooseLanguage(key)}
                    />
                  ))}
                </ChipRow>
              )}
            </>
          )}
          {/* Before the code is checked we don't know who's joining — a line for helpers who don't read Arabic */}
          {!invite && (
            <AppText variant="body" color="muted" style={styles.ltrNote}>
              {tIn('en', 'join.helperNote')}
            </AppText>
          )}
        </ScrollView>

        {invite && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <SheetButton label={tr('join.send')} onPress={onSend} disabled={!isValidPhone(phone)} />
            <AppText variant="body" color="muted" style={styles.center}>
              {tr('join.note')}
            </AppText>
          </View>
        )}
      </KeyboardAvoidingView>
    </DirectionView>
  );
}

// Helpers mostly read English or Hindi (as on their list screen)
const helperLanguageOrder: LanguageKey[] = ['en', 'hi', 'ar'];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  center: {
    textAlign: 'center',
  },
  ltrNote: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invite: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  faces: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  overlap: {
    marginStart: -spacing.md,
  },
  newFace: {
    width: size.avatarHero,
    height: size.avatarHero,
    borderRadius: radius.pill,
    borderWidth: size.borderThick,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    lineHeight: size.titleLine,
  },
  block: {
    gap: spacing.md,
  },
  codeInput: {
    minHeight: size.button + spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: fontSize.heading,
    letterSpacing: spacing.xs,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
