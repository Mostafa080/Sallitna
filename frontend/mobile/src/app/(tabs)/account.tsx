// «حسابي» — my profile (tap to edit), my lists & household, list name, notifications, voice & privacy, sign out.
// Opened from my avatar at the top of the list screen.

import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Card, ForwardIcon, Row, SectionLabel, Toggle } from '@/components/family/FamilyParts';
import { ChipRow, ChoiceChip } from '@/components/onboarding/OnboardingParts';
import { UndoToast } from '@/components/UndoToast';
import { householdKindOrder, type HouseholdSettings } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { isRTLLayout } from '@/lib/direction';
import { features } from '@/lib/features';
import { useList } from '@/store/ListStore';
import { colors, fonts, fontSize, radius, size, spacing } from '@/theme';

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

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(list.householdName);
  const latestName = useRef(name); // the newest text, even if Return comes in the same tick as typing

  // A helper has their own screen on «قوايمي», never the family tabs
  if (list.isHelper) return <Redirect href="/" />;
  if (!me) return null;
  const canManage = me.role === 'owner';
  const comingSoon = () => list.notify(t('toast.comingSoon'));

  const changeName = (text: string) => {
    latestName.current = text;
    setName(text);
  };

  const saveName = () => {
    if (!editingName) return;
    setEditingName(false);
    if (latestName.current.trim()) list.setHouseholdName(latestName.current);
    else changeName(list.householdName);
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

  // Same as «…» on a list card: the manager deletes the list for everyone, anyone else leaves it
  const isManager = me.role === 'owner';
  const onLeave = () => {
    const done = (ok: boolean) => ok && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isManager) {
      Alert.alert(
        t('lists.deleteTitle', { name: list.householdName }),
        t('lists.deleteMessage', { members: t('lists.members', { n: list.members.length }) }),
        [
          { text: t('settings.cancel'), style: 'cancel' },
          {
            text: t('lists.deleteConfirm'),
            style: 'destructive',
            onPress: async () => done(await list.removeList(list.householdId!, 'delete')),
          },
        ],
      );
      return;
    }
    Alert.alert(t(`settings.leaveTitle_${me.gender}`, { name: list.householdName }), t(`settings.leaveBody_${me.gender}`), [
      { text: t('settings.cancel'), style: 'cancel' },
      {
        text: t('settings.leaveConfirm'),
        style: 'destructive',
        onPress: async () => done(await list.removeList(list.householdId!, 'leave')),
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

        {/* Me — tap to edit name, «أنا», color, dialect, languages */}
        <Pressable
          onPress={() => router.push('/profile')}
          style={styles.profileCard}
          accessibilityRole="button"
          accessibilityLabel={t('account.profileA11y')}>
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
          </View>
          <ForwardIcon size={size.icon} color={colors.muted} strokeWidth={size.iconStroke} />
        </Pressable>

        <SectionLabel>{t('account.household')}</SectionLabel>
        <Card>
          <Row
            title={t('lists.sheetTitle')}
            value={list.householdName}
            onPress={() => router.navigate('/')}
          />
          <Row
            title={t('account.members')}
            value={t('members.count', { n: list.members.length })}
            onPress={() => router.push('/members')}
            divider
          />
          {me.role !== 'helper' && <Row title={t('account.invite')} onPress={() => router.push('/invite')} divider />}
        </Card>

        <SectionLabel>{t('settings.sectionList')}</SectionLabel>
        <Card>
          {editingName ? (
            <View style={styles.nameRow}>
              <AppText variant="item">{t('settings.listName')}</AppText>
              <TextInput
                value={name}
                onChangeText={changeName}
                onSubmitEditing={saveName}
                onBlur={saveName}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                style={styles.nameInput}
                accessibilityLabel={t('settings.listName')}
              />
            </View>
          ) : (
            <Row
              title={t('settings.listName')}
              value={list.householdName}
              onPress={canManage ? () => setEditingName(true) : undefined}
            />
          )}
          {/* «القائمة دي لمين؟» — the manager picks; everyone else just sees it */}
          {canManage ? (
            <View style={[styles.kindBlock, styles.divider]}>
              <ChipRow label={t('lists.kindLabel')}>
                {householdKindOrder.map((k) => (
                  <ChoiceChip
                    key={k}
                    label={t(`groups.${k}.label`)}
                    selected={list.householdKind === k}
                    onPress={() => {
                      Haptics.selectionAsync();
                      list.setHouseholdKind(k);
                    }}
                  />
                ))}
              </ChipRow>
            </View>
          ) : (
            <Row title={t('lists.kindLabel')} value={t(`groups.${list.householdKind}.label`)} divider />
          )}
        </Card>

        <SectionLabel>{t('settings.sectionNotify')}</SectionLabel>
        <Card>{toggleRows(notifyToggles)}</Card>

        {features.voice && (
          <>
            <SectionLabel>{t('settings.sectionVoice')}</SectionLabel>
            <Card>{toggleRows(voiceToggles)}</Card>
          </>
        )}

        <Card style={styles.lastCard}>
          <Row title={t('settings.help')} onPress={comingSoon} end={<View />} />
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
            <Row
              title={isManager ? t('lists.delete') : t('settings.leave', { name: list.householdName })}
              tone="danger"
              onPress={onLeave}
              divider
            />
          )}
        </Card>
      </ScrollView>

      <View style={[styles.statusBarCover, { height: insets.top }]} />

      <UndoToast bottomOffset={insets.bottom + size.tabBar + spacing.lg} />
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
  kindBlock: {
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  nameRow: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nameInput: {
    flex: 1,
    minHeight: size.control,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.ground,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.item,
    textAlign: isRTLLayout ? 'right' : 'left',
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
