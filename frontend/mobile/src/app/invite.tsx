// "ادعُ أهل البيت" — share the invite link, see who joined and who we're waiting for.
// Also the last screen of starting a new household (setup-invite.tsx): progress dashes + "invite later" hint.

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Languages, MessageCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BackIcon, Card, CircleButton, SectionLabel, StatusPill } from '@/components/family/FamilyParts';
import { StepDashes } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { inviteCode, type Member, type PendingInvite } from '@/data/fakeHousehold';
import { t, tIn } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

// Opens the invite page on sallitna.online (frontend/invite), which opens the app with the code
const INVITE_HOST = 'sallitna.online/j/';

type Person = (Member | PendingInvite) & { joined: boolean };

export default function InviteScreen({ setup = false }: { setup?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const me = list.memberById(list.currentMemberId);
  const live = list.mode === 'live';

  // Live: this household's real code (made on first open), and a fresh look at who has joined
  const [liveCode, setLiveCode] = useState(list.inviteCode);
  useEffect(() => {
    if (!live) return;
    list.ensureInviteCode().then(setLiveCode);
    list.refreshHousehold().catch(() => {});
  }, []);

  const code = live ? liveCode : inviteCode;
  const shortLink = code ? `${INVITE_HOST}${code}` : t('invite.loading');
  const link = `https://${shortLink}`;

  const people: Person[] = [
    ...list.members.map((m) => ({ ...m, joined: true })),
    ...list.invites.map((p) => ({ ...p, joined: false })),
  ];

  const onWhatsApp = () => {
    if (!code) return;
    Haptics.selectionAsync();
    Share.share({
      message: t(`invite.message_${me?.gender ?? 'f'}`, {
        name: me?.display_name ?? '',
        list: list.householdName,
        link,
        code,
      }),
    });
  };

  // A driver / maid gets their own code (joins as a helper) and a message in English and Hindi
  const onInviteHelper = async () => {
    Haptics.selectionAsync();
    const helperCode = live ? await list.ensureInviteCode('helper') : inviteCode;
    if (!helperCode) return;
    const helperLink = `https://${INVITE_HOST}${helperCode}`;
    const params = { list: list.householdName, link: helperLink, code: helperCode };
    Share.share({
      message: [tIn('en', 'invite.helperMessage', params), tIn('hi', 'invite.helperMessage', params)].join('\n\n'),
    });
  };

  const onCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.notify(t('toast.linkCopied'));
  };

  // Setup: the household is ready — close the whole sign-up flow and land on the (empty) list
  const onStart = () => {
    if (!setup) {
      router.back();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissAll();
    list.notify(t('toast.listReady'));
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
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + size.button + spacing.xxxl + (setup ? spacing.xxxl : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {/* In sign-up the list already exists — no going back, only «التالي» */}
          {setup ? <View /> : <CircleButton icon={BackIcon} label={t('detail.back')} onPress={() => router.back()} />}
          {setup && <StepDashes current={3} total={3} />}
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
            <AppText
              variant="item"
              style={styles.link}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              selectable>
              {shortLink}
            </AppText>
            <Pressable onPress={onCopy} style={styles.copyButton} accessibilityRole="button">
              <AppText variant="label" weight="bold">
                {t('invite.copy')}
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Driver / maid: separate code, they see the list in their language */}
        <Pressable onPress={onInviteHelper} style={styles.helperButton} accessibilityRole="button">
          <View style={styles.helperIcon}>
            <Languages size={size.icon - spacing.xs} color={colors.accent} strokeWidth={size.iconStroke} />
          </View>
          <View style={styles.flex}>
            <AppText variant="item" weight="bold">
              {t('invite.helperTitle')}
            </AppText>
            <AppText variant="body" color="muted">
              {t('invite.helperBody')}
            </AppText>
          </View>
        </Pressable>

        <SectionLabel>{t('invite.onList', { n: people.length })}</SectionLabel>
        <Card>
          {people.map((person, index) => {
            const isMe = person.id === list.currentMemberId;
            return (
              <View key={person.id} style={[styles.personRow, index > 0 && styles.divider]}>
                <Avatar member={person} large="list" ring="surface" />
                <View style={styles.flex}>
                  <AppText variant="item" weight="bold">
                    {isMe ? t(`members.you_${person.gender}`, { name: person.display_name }) : person.display_name}
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

      <UndoToast bottomOffset={insets.bottom + size.button + (setup ? spacing.xxxl * 2 : spacing.xxl)} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t(setup ? 'invite.next' : 'invite.done')} tone="accent" onPress={onStart} />
        {setup && (
          <AppText variant="body" color="muted" style={styles.center}>
            {t('invite.later')}
          </AppText>
        )}
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
    minHeight: size.touch + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    textAlign: 'center',
  },
  intro: {
    gap: spacing.sm,
  },
  title: {
    lineHeight: size.titleLine,
  },
  helperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  helperIcon: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.accent,
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
    gap: spacing.xs,
    backgroundColor: colors.ground,
  },
});
