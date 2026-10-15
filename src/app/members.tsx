// "أهل البيت" — who's in the household, their roles, and recent activity.

import { useRouter } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BackIcon, Card, CircleButton, ForwardIcon, SectionLabel, StatusPill } from '@/components/family/FamilyParts';
import { UndoToast } from '@/components/UndoToast';
import { activeShopperId, pastTrips, type Member } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import * as api from '@/lib/api';
import { formatClock, formatRelativeTime, isToday } from '@/lib/format';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

const ACTIVITY_LIMIT = 3;

type Activity = { key: string; memberId: string; text: string; at: string };

export default function MembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();

  const me = list.memberById(list.currentMemberId);

  // Live: see anyone who joined since the app opened (realtime comes in session 12)
  useEffect(() => {
    if (list.mode === 'live') list.refreshHousehold().catch(() => {});
  }, []);
  const canManage = me?.role === 'owner';
  const shopperId = list.trip ? list.currentMemberId : activeShopperId;

  const roleName = (m: Member) => t(`roles.${m.role}_${m.gender}`);
  const metaFor = (m: Member) =>
    [roleName(m), t(`languages.${m.view_language}`), m.id === list.currentMemberId ? t(`dialects.${m.dialect}`) : null]
      .filter(Boolean)
      .join(t('item.metaSeparator'));

  // Live: real history (who added / bought what). Demo: built from the fake list + a fake past trip.
  const [events, setEvents] = useState<api.ActivityEvent[] | null>(null);
  useEffect(() => {
    if (list.mode !== 'live' || !list.householdId) return;
    api.loadActivity(list.householdId).then(setEvents).catch(() => setEvents([]));
  }, [list.householdId, list.items.length]);

  const activity = list.mode === 'live' ? groupEvents(events ?? [], list.memberById) : buildActivity(list.items, list.memberById);

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

        <View>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t('members.title')}
          </AppText>
          <AppText variant="item" color="muted">
            {t('members.subtitle', { name: list.householdName, count: t('members.count', { n: list.members.length }) })}
          </AppText>
        </View>

        <Card style={styles.flushCard}>
          {list.members.map((member, index) => {
            const isMe = member.id === list.currentMemberId;
            const canOpen = canManage && !isMe;
            return (
              <Pressable
                key={member.id}
                disabled={!canOpen}
                onPress={() => router.push({ pathname: '/member/[id]', params: { id: member.id } })}
                style={[styles.memberRow, index > 0 && styles.divider]}
                accessibilityRole={canOpen ? 'button' : undefined}
                accessibilityLabel={canOpen ? t('members.openMemberA11y', { name: member.display_name }) : undefined}>
                <Avatar member={member} large="list" ring="surface" />
                <View style={styles.flex}>
                  <AppText variant="item" weight="bold">
                    {isMe ? t('members.you', { name: member.display_name }) : member.display_name}
                  </AppText>
                  <AppText variant="body" color="muted">
                    {metaFor(member)}
                  </AppText>
                </View>
                {member.id === shopperId && <StatusPill label={t('members.atStore')} tone="accent" />}
                {canOpen && <ForwardIcon size={size.icon} color={colors.muted} strokeWidth={size.iconStroke} />}
              </Pressable>
            );
          })}
        </Card>

        <View style={styles.note}>
          <AppText variant="label">
            <AppText variant="label" weight="bold">
              {t('members.helperTitle')}
            </AppText>{' '}
            {t('members.helperBody')}
          </AppText>
        </View>

        <SectionLabel>{t('members.activity')}</SectionLabel>
        <Card>
          {activity.length === 0 && (
            <AppText variant="label" color="muted" style={styles.emptyActivity}>
              {t('members.noActivity')}
            </AppText>
          )}
          {activity.map((entry, index) => (
            <View key={entry.key} style={[styles.activityRow, index > 0 && styles.divider]}>
              <AppText variant="label" style={styles.flex}>
                <AppText variant="label" weight="bold">
                  {list.memberById(entry.memberId)?.display_name ?? ''}
                </AppText>{' '}
                {entry.text}
              </AppText>
              <AppText variant="label" color="muted">
                {isToday(entry.at) ? formatClock(new Date(entry.at)) : formatRelativeTime(entry.at)}
              </AppText>
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Covers the status bar area so content doesn't scroll under the clock */}
      <View style={[styles.statusBarCover, { height: insets.top }]} />

      <UndoToast bottomOffset={insets.bottom + size.button + spacing.xxl} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable onPress={() => router.push('/invite')} style={styles.inviteButton} accessibilityRole="button">
          <UserPlus size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke} />
          <AppText variant="item" weight="bold" color="onDark">
            {t('members.invite')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

// Live history → «أم خالد أضافت 3 أغراض», «سارة اشترت حليب»: grouped by person, what they did and day
function groupEvents(events: api.ActivityEvent[], memberById: (id: string) => Member | undefined): Activity[] {
  const groups = new Map<string, { e: api.ActivityEvent; names: string[]; at: string }>();
  for (const e of events) {
    const key = `${e.memberId}|${e.kind}|${e.voice}|${new Date(e.at).toDateString()}`;
    const group = groups.get(key);
    if (group) group.names.push(e.name);
    else groups.set(key, { e, names: [e.name], at: e.at });
  }
  const entries: Activity[] = [];
  for (const [key, { e, names, at }] of groups) {
    const member = memberById(e.memberId);
    if (!member) continue;
    const what = names.length === 1 ? names[0] : t('home.itemCount', { n: names.length });
    const verb = e.kind === 'bought' ? 'bought' : e.voice ? 'addedVoice' : 'added';
    entries.push({ key, memberId: e.memberId, text: t(`members.${verb}_${member.gender}`, { what }), at });
  }
  return entries.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, ACTIVITY_LIMIT);
}

// Demo: recent activity from the list itself: additions grouped by who / how / day, plus past trips.
// Later this comes from item_events.
function buildActivity(items: ReturnType<typeof useList>['items'], memberById: (id: string) => Member | undefined) {
  const groups = new Map<string, { memberId: string; voice: boolean; names: string[]; at: string }>();
  for (const item of items) {
    if (item.status === 'removed') continue;
    const day = new Date(item.created_at).toDateString();
    const key = `${item.added_by}|${item.added_via}|${day}`;
    const group = groups.get(key);
    if (group) {
      group.names.push(item.name);
      if (item.created_at > group.at) group.at = item.created_at;
    } else {
      groups.set(key, { memberId: item.added_by, voice: item.added_via === 'voice', names: [item.name], at: item.created_at });
    }
  }

  const entries: Activity[] = [];
  for (const [key, group] of groups) {
    const member = memberById(group.memberId);
    if (!member) continue;
    const what = group.names.length === 1 ? group.names[0] : t('home.itemCount', { n: group.names.length });
    entries.push({
      key,
      memberId: group.memberId,
      text: t(`members.${group.voice ? 'addedVoice' : 'added'}_${member.gender}`, { what }),
      at: group.at,
    });
  }
  for (const trip of pastTrips) {
    const member = memberById(trip.shopperId);
    if (!member) continue;
    entries.push({
      key: `trip-${trip.endedAt}`,
      memberId: trip.shopperId,
      text: t(`members.bought_${member.gender}`, { what: t('home.itemCount', { n: trip.boughtCount }) }),
      at: trip.endedAt,
    });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, ACTIVITY_LIMIT);
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
    justifyContent: 'space-between',
  },
  title: {
    lineHeight: size.titleLine,
  },
  flushCard: {
    paddingHorizontal: 0,
  },
  memberRow: {
    minHeight: size.toast + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  note: {
    padding: spacing.xl,
    borderRadius: radius.card + spacing.xs,
    backgroundColor: colors.line,
  },
  activityRow: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  emptyActivity: {
    paddingVertical: spacing.xl,
    textAlign: 'center',
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
  inviteButton: {
    minHeight: size.button + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
});
