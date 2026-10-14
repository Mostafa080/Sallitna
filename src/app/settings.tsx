// "الإعدادات" — list name, my dialect and language, notifications, voice & privacy.

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BackIcon, Card, CircleButton, OptionSheet, Row, SectionLabel, Toggle } from '@/components/family/FamilyParts';
import { UndoToast } from '@/components/UndoToast';
import { dialectOrder, languageOrder, type HouseholdSettings } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { isRTLLayout } from '@/lib/direction';
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

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const me = list.memberById(list.currentMemberId);

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(list.householdName);
  const latestName = useRef(name); // the newest text, even if Return comes in the same tick as typing
  const [sheet, setSheet] = useState<'dialect' | 'language' | null>(null);

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

  const onLeave = () => {
    Alert.alert(
      t(`settings.leaveTitle_${me.gender}`, { name: list.householdName }),
      t(`settings.leaveBody_${me.gender}`),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        // Leaving needs real accounts (Supabase) — not simulated
        { text: t('settings.leaveConfirm'), style: 'destructive', onPress: comingSoon },
      ],
    );
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('detail.back')} onPress={() => router.back()} />
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t('settings.title')}
          </AppText>
        </View>

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
          <Row title={t('settings.dialect')} value={t(`dialects.${me.dialect}`)} onPress={() => setSheet('dialect')} divider />
          <Row
            title={t('settings.language')}
            value={t(`languages.${me.view_language}`)}
            onPress={() => setSheet('language')}
            divider
          />
        </Card>

        <SectionLabel>{t('settings.sectionNotify')}</SectionLabel>
        <Card>{toggleRows(notifyToggles)}</Card>

        <SectionLabel>{t('settings.sectionVoice')}</SectionLabel>
        <Card>{toggleRows(voiceToggles)}</Card>

        <Card style={styles.lastCard}>
          <Row title={t('settings.help')} onPress={comingSoon} end={<View />} />
          <Row title={t('settings.leave', { name: list.householdName })} tone="danger" onPress={onLeave} divider />
        </Card>
      </ScrollView>

      <View style={[styles.statusBarCover, { height: insets.top }]} />

      <UndoToast bottomOffset={insets.bottom + spacing.lg} />

      <OptionSheet
        visible={sheet === 'dialect'}
        title={t('settings.dialect')}
        options={dialectOrder.map((key) => ({ key, label: t(`dialects.${key}`) }))}
        selected={[me.dialect]}
        onChange={([dialect]) => list.updateMember(me.id, { dialect }, true)}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'language'}
        title={t('settings.language')}
        subtitle={t('settings.languageNote')}
        options={languageOrder.map((key) => ({ key, label: t(`languages.${key}`) }))}
        selected={[me.view_language]}
        onChange={([language]) => list.updateMember(me.id, { view_language: language }, true)}
        onClose={() => setSheet(null)}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    lineHeight: size.titleLine,
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
