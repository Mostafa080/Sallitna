// «حسابي» — my profile (tap to edit), my lists & household, list name, notifications, voice & privacy, sign out.
// Opened from my avatar at the top of the list screen.

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Card, Row, SectionLabel, Toggle } from '@/components/family/FamilyParts';
import { ltrEmail } from '@/components/onboarding/OnboardingParts';
import { UndoToast } from '@/components/UndoToast';
import type { HouseholdSettings } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { features } from '@/lib/features';
import * as api from '@/lib/api';
import { openLegal } from '@/lib/legal';
import * as push from '@/lib/push';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

// Where «مساعدة وكلّمنا» writes to
const SUPPORT_EMAIL = 'hello@sallitna.online';

const notifyToggles: (keyof HouseholdSettings)[] = ['notifyTripStarted', 'notifyAddedWhileShopping', 'notifyEveryAdd', 'quietHours'];
const voiceToggles: (keyof HouseholdSettings)[] = ['reviewBeforeAdd', 'keepRecordings'];

// Settings keys → i18n keys
const toggleText: Record<keyof HouseholdSettings, string> = {
  notifyTripStarted: 'tripStarted',
  notifyAddedWhileShopping: 'addedWhileShopping',
  notifyEveryAdd: 'everyAdd',
  quietHours: 'quietHours',
  reviewBeforeAdd: 'reviewBeforeAdd',
  keepRecordings: 'keepRecordings',
};

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const me = list.memberById(list.currentMemberId);

  // The email this account signs in with (shown under the name — easy to forget which one).
  // Read again whenever the sign-in or the person changes: this tab can open before the sign-in has loaded.
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    api.myEmail().then(setEmail).catch(() => {});
  }, [list.mode, list.currentMemberId]);

  // Notifications turned off for the app in iPhone Settings → say so (checked again on coming back from Settings)
  const [pushState, setPushState] = useState<push.PushStatus>('unavailable');
  useEffect(() => {
    const check = () => push.pushStatus().then(setPushState).catch(() => {});
    check();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => subscription.remove();
  }, []);

  // A helper has their own screen on «قوايمي», never the family tabs
  if (list.isHelper) return <Redirect href="/" />;
  if (!me) return null;

  // «مساعدة وكلّمنا»: an email to us; no mail app on the phone → the address is copied instead
  const onHelp = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('settings.helpSubject'))}`;
    try {
      await Linking.openURL(url);
    } catch {
      await Clipboard.setStringAsync(SUPPORT_EMAIL);
      list.notify(t('settings.helpCopied', { email: SUPPORT_EMAIL }));
    }
  };

  const onToggle = (key: keyof HouseholdSettings, value: boolean) => {
    Haptics.selectionAsync();
    list.setSetting(key, value);
  };

  // Back to «قوايمي» first, so whoever signs in next starts there (not on this tab)
  const signOut = () => {
    router.navigate('/');
    list.signOut();
  };
  const onSignOut = () => {
    if (list.mode === 'demo') {
      signOut();
      return;
    }
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutBody'), [
      { text: t('settings.cancel'), style: 'cancel' },
      {
        text: t('settings.signOutConfirm'),
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const toggleRows = (keys: (keyof HouseholdSettings)[]) =>
    keys.map((key, index) => (
      <Row
        key={key}
        title={t(`settings.${toggleText[key]}`)}
        body={t(`settings.${toggleText[key]}Body`)}
        divider={index > 0}
        end={<Toggle value={list.settings[key]} onChange={(v) => onToggle(key, v)} label={t(`settings.${toggleText[key]}`)} />}
      />
    ));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + size.tabBar + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t('account.title')}
          </AppText>
        </View>

        {/* Me — who's signed in (name, role, dialect, language, email); not editable here */}
        <View style={styles.profileCard}>
          <Avatar member={me} large="hero" ring="surface" />
          <View style={styles.flex}>
            <AppText variant="heading" weight="bold" numberOfLines={1}>
              {me.display_name}
            </AppText>
            <AppText variant="body" color="muted" numberOfLines={1}>
              {[t(`roles.${me.role}_${me.gender}`), t(`dialects.${me.dialect}`), t(`languages.${me.view_language}`)].join(
                t('item.metaSeparator'),
              )}
            </AppText>
            {email && (
              <AppText variant="body" color="muted" numberOfLines={1} accessibilityLabel={t('account.emailA11y', { email })}>
                {ltrEmail(email)}
              </AppText>
            )}
          </View>
        </View>

        <SectionLabel>{t('settings.sectionNotify')}</SectionLabel>
        {pushState === 'denied' && (
          <Card style={styles.pushOffCard}>
            <Row
              title={t('settings.pushOff')}
              body={t('settings.pushOffBody')}
              value={t('settings.pushOpenSettings')}
              onPress={push.openPushSettings}
            />
          </Card>
        )}
        <Card>{toggleRows(notifyToggles)}</Card>

        {features.voice && (
          <>
            <SectionLabel>{t('settings.sectionVoice')}</SectionLabel>
            <Card>{toggleRows(voiceToggles)}</Card>
          </>
        )}

        <Card style={styles.lastCard}>
          <Row title={t('settings.help')} onPress={onHelp} end={<View />} />
          <Row title={t('settings.privacy')} onPress={() => openLegal('privacy', me.view_language)} divider />
          <Row title={t('settings.terms')} onPress={() => openLegal('terms', me.view_language)} divider />
          {list.mode === 'live' && (
            <Row
              title={t('settings.password')}
              onPress={() => router.push({ pathname: '/set-password', params: { mode: 'change' } })}
              divider
            />
          )}
          <Row
            title={t(list.mode === 'demo' ? 'settings.exitDemo' : 'settings.signOut')}
            onPress={onSignOut}
            end={<View />}
            divider
          />
          {list.mode === 'live' && (
            <Row title={t('settings.deleteAccount')} tone="danger" onPress={() => router.push('/delete-account')} divider />
          )}
        </Card>
      </ScrollView>

      <View style={[styles.statusBarCover, { height: insets.top }]} />

      <UndoToast />
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
    gap: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    lineHeight: size.titleLine,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    marginBottom: spacing.sm,
    borderRadius: radius.card + spacing.xs,
    backgroundColor: colors.surface,
  },
  pushOffCard: {
    marginBottom: spacing.sm,
  },
  lastCard: {
    marginTop: spacing.md,
  },
  statusBarCover: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.ground,
  },
});
