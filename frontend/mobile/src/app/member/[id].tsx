// One member: role, languages, remove from the household. Only the manager gets here.

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BackIcon, Card, CircleButton, OptionSheet, Row, SectionLabel } from '@/components/family/FamilyParts';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { RadioCard, SheetButton } from '@/components/shop/Sheet';
import { languageOrder, type LanguageKey, type MemberRole } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { formatSince } from '@/lib/format';
import { useList } from '@/store/ListStore';
import { colors, size, spacing } from '@/theme';

const roleOrder: MemberRole[] = ['owner', 'member', 'helper'];

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const member = list.members.find((m) => m.id === id);
  const me = list.memberById(list.currentMemberId);

  const [role, setRole] = useState<MemberRole>(member?.role ?? 'member');
  const [viewLanguage, setViewLanguage] = useState<LanguageKey>(member?.view_language ?? 'ar');
  const [speaks, setSpeaks] = useState<LanguageKey[]>(member?.speaks ?? ['ar']);
  const [sheet, setSheet] = useState<'view' | 'speaks' | null>(null);

  // No auto-back when the member disappears: removing already goes back, and a second
  // back would also close the members screen.
  if (!member || !me) return null;

  const g = member.gender;
  const languageOptions = languageOrder.map((key) => ({ key, label: t(`languages.${key}`) }));
  const changed =
    role !== member.role ||
    viewLanguage !== member.view_language ||
    speaks.join() !== member.speaks.join();

  const save = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.updateMember(member.id, { role, view_language: viewLanguage, speaks });
    router.back();
  };

  const onSave = () => {
    if (!changed) {
      router.back();
      return;
    }
    if (role === 'owner' && member.role !== 'owner') {
      Alert.alert(
        t('memberDetail.handoverTitle', { name: member.display_name }),
        t(`memberDetail.handoverBody_${me.gender}`, { name: member.display_name }),
        [
          { text: t('memberDetail.cancel'), style: 'cancel' },
          { text: t('memberDetail.handoverConfirm'), onPress: save },
        ],
      );
      return;
    }
    save();
  };

  const onRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('memberDetail.removeTitle', { name: member.display_name }), t(`memberDetail.removeBody_${g}`), [
      { text: t('memberDetail.cancel'), style: 'cancel' },
      {
        text: t('memberDetail.removeConfirm'),
        style: 'destructive',
        onPress: () => {
          list.removeMember(member.id);
          router.back();
        },
      },
    ]);
  };

  const meta = [
    t(`memberDetail.joined_${g}`, { when: formatSince(member.joined_at) }),
    t(`memberDetail.itemsAdded_${g}`, { count: t('home.itemCount', { n: member.items_added }) }),
  ].join(t('item.metaSeparator'));

  const languageList = (keys: LanguageKey[]) => keys.map((k) => t(`languages.${k}`)).join(t('memberDetail.listSeparator'));

  return (
    <View style={styles.screen}>
      <GradientBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + size.button + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('detail.back')} onPress={() => router.back()} />
        </View>

        <View style={styles.identity}>
          <Avatar member={member} large="hero" ring="ground" />
          <View style={styles.flex}>
            <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
              {member.display_name}
            </AppText>
            <AppText variant="label" color="muted">
              {meta}
            </AppText>
          </View>
        </View>

        <SectionLabel>{t('memberDetail.role')}</SectionLabel>
        <View style={styles.options} accessibilityRole="radiogroup">
          {roleOrder.map((key) => (
            <RadioCard
              key={key}
              title={t(`roles.${key}_${g}`)}
              body={t(`memberDetail.${key}Body`)}
              selected={role === key}
              onPress={() => {
                Haptics.selectionAsync();
                setRole(key);
              }}
            />
          ))}
        </View>

        <Card>
          <Row title={t(`memberDetail.seesIn_${g}`)} value={t(`languages.${viewLanguage}`)} onPress={() => setSheet('view')} />
          <Row title={t(`memberDetail.speaks_${g}`)} value={languageList(speaks)} onPress={() => setSheet('speaks')} divider />
        </Card>

        <Card>
          <Row title={t('memberDetail.remove', { name: member.display_name })} tone="danger" onPress={onRemove} />
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t('memberDetail.save')} onPress={onSave} />
      </View>

      <OptionSheet
        visible={sheet === 'view'}
        title={t(`memberDetail.seesIn_${g}`)}
        options={languageOptions}
        selected={[viewLanguage]}
        onChange={([key]) => setViewLanguage(key)}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'speaks'}
        title={t(`memberDetail.speaks_${g}`)}
        options={languageOptions}
        selected={speaks}
        multiple
        onChange={(keys) => setSpeaks(languageOrder.filter((k) => keys.includes(k)))}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    lineHeight: size.titleLine,
  },
  options: {
    gap: spacing.md,
  },
  footer: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
