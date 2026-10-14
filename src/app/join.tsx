// "انضم لقائمة «بيت أبو خالد»" — what an invite link opens.
// Simulated: always the demo household's invite (test menu → «افتح رابط دعوة», or the welcome screen).

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { Brand, ChipRow, ChoiceChip, isValidPhone, PhoneField } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { household, languageOrder, members, type LanguageKey } from '@/data/fakeHousehold';
import { t, tIn } from '@/i18n';
import { colors, radius, size, spacing } from '@/theme';

export default function JoinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<LanguageKey>('ar');

  const inviter = members.find((m) => m.role === 'owner');

  const onSend = () => {
    Haptics.selectionAsync();
    router.push({ pathname: '/verify', params: { mode: 'join', phone, lang: language } });
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

        <View style={styles.invite}>
          <View style={styles.faces} accessible accessibilityLabel={t('join.facesA11y')}>
            {members.map((member, index) => (
              <View key={member.id} style={[index > 0 && styles.overlap, { zIndex: members.length - index }]}>
                <Avatar member={member} large="hero" ring="ground" />
              </View>
            ))}
            <View style={[styles.overlap, styles.newFace]}>
              <Plus size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
            </View>
          </View>

          {inviter && (
            <AppText variant="label" color="muted">
              {t(`join.invites_${inviter.gender}`, { name: inviter.display_name })}
            </AppText>
          )}
          <AppText variant="title" weight="bold" style={[styles.center, styles.title]} accessibilityRole="header">
            {t('join.title', { list: household.name })}
          </AppText>
          <AppText variant="item" color="muted" style={styles.center}>
            {t('join.body', { count: t('members.count', { n: members.length }) })}
          </AppText>
        </View>

        <View style={styles.block}>
          <AppText variant="label" weight="bold">
            {t('join.phoneLabel')}
          </AppText>
          <PhoneField digits={phone} onChange={setPhone} label={t('join.phoneLabel')} />
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t('join.send')} onPress={onSend} disabled={!isValidPhone(phone)} />
        <AppText variant="body" color="muted" style={styles.center}>
          {t('join.note')}
        </AppText>
      </View>
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
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
