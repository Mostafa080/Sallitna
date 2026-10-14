// "ادعُ أهل البيت" — share the invite link, see who joined and who we're waiting for.

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BackIcon, Card, CircleButton, SectionLabel, StatusPill } from '@/components/family/FamilyParts';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { inviteCode, type Member, type PendingInvite } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

const INVITE_HOST = 'sallitna.app/j/';

type Person = (Member | PendingInvite) & { joined: boolean };

export default function InviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const me = list.memberById(list.currentMemberId);

  const shortLink = `${INVITE_HOST}${inviteCode}`;
  const link = `https://${shortLink}`;

  const people: Person[] = [
    ...list.members.map((m) => ({ ...m, joined: true })),
    ...list.invites.map((p) => ({ ...p, joined: false })),
  ];

  const onWhatsApp = () => {
    Haptics.selectionAsync();
    Share.share({
      message: t(`invite.message_${me?.gender ?? 'f'}`, { name: me?.display_name ?? '', list: list.householdName, link }),
    });
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.notify(t('toast.linkCopied'));
  };

  const subtitleFor = (p: Person) => {
    if (p.role === 'owner') return t(`invite.listOwner_${p.gender}`);
    const role = t(`roles.${p.role}_${p.gender}`);
    if ('view_language' in p && p.view_language !== 'ar') {
      return [role, t(`invite.seesIn_${p.gender}`, { lang: t(`languagesIn.${p.view_language}`) })].join(
        t('item.metaSeparator'),
      );
    }
    return role;
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + size.button + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CircleButton icon={BackIcon} label={t('detail.back')} onPress={() => router.back()} />
        </View>

        <View style={styles.intro}>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t('invite.title')}
          </AppText>
          <AppText variant="item" color="muted">
            {t('invite.body')}
          </AppText>
        </View>

        <View style={styles.shareBlock}>
          <Pressable onPress={onWhatsApp} style={styles.whatsappButton} accessibilityRole="button">
            <MessageCircle size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke} />
            <AppText variant="item" weight="bold" color="onDark">
              {t('invite.whatsapp')}
            </AppText>
          </Pressable>

          <View style={styles.linkField}>
            <AppText variant="item" style={styles.link} numberOfLines={1} selectable>
              {shortLink}
            </AppText>
            <Pressable onPress={onCopy} style={styles.copyButton} accessibilityRole="button">
              <AppText variant="label" weight="bold">
                {t('invite.copy')}
              </AppText>
            </Pressable>
          </View>
        </View>

        <SectionLabel>{t('invite.onList', { n: people.length })}</SectionLabel>
        <Card>
          {people.map((person, index) => {
            const isMe = person.id === list.currentMemberId;
            return (
              <View key={person.id} style={[styles.personRow, index > 0 && styles.divider]}>
                <Avatar member={person} large="list" ring="surface" />
                <View style={styles.flex}>
                  <AppText variant="item" weight="bold">
                    {isMe ? t('members.you', { name: person.display_name }) : person.display_name}
                  </AppText>
                  <AppText variant="body" color="muted">
                    {subtitleFor(person)}
                  </AppText>
                </View>
                {!isMe &&
                  (person.joined ? (
                    <StatusPill label={t(`invite.joined_${person.gender}`)} tone="success" />
                  ) : (
                    <StatusPill label={t(`invite.waiting_${person.gender}`)} tone="neutral" />
                  ))}
              </View>
            );
          })}
        </Card>
      </ScrollView>

      <View style={[styles.statusBarCover, { height: insets.top }]} />

      <UndoToast bottomOffset={insets.bottom + size.button + spacing.xxl} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t('invite.start')} tone="accent" onPress={() => router.back()} />
      </View>
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
    gap: spacing.xl,
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
  shareBlock: {
    gap: spacing.md,
  },
  whatsappButton: {
    minHeight: size.button + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.card + spacing.xs,
    backgroundColor: colors.ink,
  },
  linkField: {
    minHeight: size.button + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingStart: spacing.xl,
    paddingEnd: spacing.md,
    borderRadius: radius.card + spacing.xs,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  link: {
    flex: 1,
    writingDirection: 'ltr',
  },
  copyButton: {
    minHeight: size.touch,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    backgroundColor: colors.ground,
  },
  personRow: {
    minHeight: size.toast + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  statusBarCover: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.ground,
  },
  footer: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.ground,
  },
});
