// "انضم لقائمة «…»" — joining a family's list with an invite.
// Until invite links open the app by themselves, the person types the code from the invite message
// (or it arrives as ?code=… on the link). The family's name and faces come from get_invite().

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { Brand, ChipRow, ChoiceChip, isValidPhone, PhoneField } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { languageOrder, type LanguageKey } from '@/data/fakeHousehold';
import { t, tIn } from '@/i18n';
import * as api from '@/lib/api';
import { colors, fonts, fontSize, radius, size, spacing } from '@/theme';

const CODE_LENGTH = 8;
const cleanCode = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

export default function JoinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();

  const [code, setCode] = useState(cleanCode(params.code ?? ''));
  const [invite, setInvite] = useState<api.InvitePreview | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking' | 'notFound'>('idle');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<LanguageKey>('ar');

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
    router.push({ pathname: '/verify', params: { mode: 'join', phone, lang: language, code, list: invite.householdName } });
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Brand />
          <CircleButton icon={BackIcon} label={t('onboarding.back')} onPress={() => router.back()} />
        </View>

        {invite ? (
          <View style={styles.invite}>
            <View style={styles.faces} accessible accessibilityLabel={t('join.facesA11y')}>
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
                ? t(`join.invites_${invite.inviterGender ?? 'f'}`, { name: invite.inviterName })
                : t('join.someone')}
            </AppText>
            <AppText variant="title" weight="bold" style={[styles.center, styles.title]} accessibilityRole="header">
              {t('join.title', { list: invite.householdName })}
            </AppText>
            <AppText variant="item" color="muted" style={styles.center}>
              {t('join.body', { count: t('members.count', { n: invite.memberCount }) })}
            </AppText>
          </View>
        ) : (
          <View style={styles.block}>
            <AppText variant="label" weight="bold">
              {t('join.codeLabel')}
            </AppText>
            <TextInput
              value={code}
              onChangeText={(text) => setCode(cleanCode(text))}
              placeholder={t('join.codePlaceholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus={!code}
              maxLength={CODE_LENGTH}
              style={styles.codeInput}
              accessibilityLabel={t('join.codeLabel')}
            />
            <AppText variant="body" color={status === 'notFound' ? 'danger' : 'muted'}>
              {status === 'checking' ? t('join.checking') : status === 'notFound' ? t('join.notFound') : t('join.codeHint')}
            </AppText>
          </View>
        )}

        {invite && (
          <>
            <View style={styles.block}>
              <AppText variant="label" weight="bold">
                {t('join.phoneLabel')}
              </AppText>
              <PhoneField digits={phone} onChange={setPhone} label={t('join.phoneLabel')} autoFocus />
            </View>

            <ChipRow label={t('join.language')}>
              {languageOrder.map((key) => (
                <ChoiceChip
                  key={key}
                  label={tIn(key, `languages.${key}`)}
                  selected={language === key}
                  onPress={() => setLanguage(key)}
                />
              ))}
            </ChipRow>
          </>
        )}
      </ScrollView>

      {invite && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <SheetButton label={t('join.send')} onPress={onSend} disabled={!isValidPhone(phone)} />
          <AppText variant="body" color="muted" style={styles.center}>
            {t('join.note')}
          </AppText>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
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
