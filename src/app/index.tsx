import { useRouter } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import { BOTTOM_BAR_HEIGHT, BottomBar } from '@/components/BottomBar';
import { EmptyState } from '@/components/EmptyState';
import { FilterPill } from '@/components/FilterPill';
import { ItemRow } from '@/components/ItemRow';
import { ShopperBanner } from '@/components/ShopperBanner';
import { UndoToast } from '@/components/UndoToast';
import {
  activeShopperId,
  basics,
  categoryOrder,
  NEW_ITEM_WINDOW_MINUTES,
  type Basic,
} from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { isToday } from '@/lib/format';
import { useList } from '@/store/ListStore';
import { colors, motion, radius, size, spacing } from '@/theme';

type Filter = 'all' | 'today';

// More faces than this would squeeze the title onto two lines
const MAX_HEADER_AVATARS = 4;

const rowLayout = LinearTransition.duration(motion.normal);
const rowExit = FadeOut.duration(motion.fast);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const list = useList();

  const [filter, setFilter] = useState<Filter>('all');
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  // Empty state stays up while the user picks basics, until they tap "show list"
  const [starterMode, setStarterMode] = useState(false);
  const [addedBasics, setAddedBasics] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);

  const openItems = list.items.filter((item) => item.status === 'open');
  const todayItems = openItems.filter((item) => isToday(item.created_at));
  const visibleItems = filter === 'today' ? todayItems : openItems;

  useEffect(() => {
    if (openItems.length === 0) setStarterMode(true);
    // Items arrived from somewhere else (e.g. type-to-add) — show the list
    else if (Object.keys(addedBasics).length === 0) setStarterMode(false);
  }, [openItems.length]);

  // My own trip takes over the banner; otherwise show whoever else is shopping
  const shopper = list.members.find((m) => m.id === (list.trip ? list.currentMemberId : activeShopperId));
  const pendingQuestion = list.questions.find((q) => !q.answer);
  const helper = list.members.find((m) => m.role === 'helper');
  const sections = categoryOrder
    .map((category) => ({ category, items: visibleItems.filter((item) => item.category === category) }))
    .filter((section) => section.items.length > 0);

  const now = Date.now();
  const isNew = (createdAt: string) => now - new Date(createdAt).getTime() < NEW_ITEM_WINDOW_MINUTES * 60_000;

  const openItem = (id: string) => router.push({ pathname: '/item/[id]', params: { id } });

  const onToggleBasic = (basic: Basic) => {
    const existingId = addedBasics[basic.name];
    if (existingId) {
      list.discardItem(existingId);
      const { [basic.name]: _removed, ...rest } = addedBasics;
      setAddedBasics(rest);
    } else {
      const isFirst = Object.keys(addedBasics).length === 0;
      setAddedBasics({ ...addedBasics, [basic.name]: list.addBasic(basic) });
      // The "show list" button appears below the chips — bring it into view
      if (isFirst) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), motion.fast);
    }
  };

  const leaveStarterMode = () => {
    setStarterMode(false);
    setAddedBasics({});
    setFilter('all');
  };

  // Dev only: long-press the household name to switch between empty and demo data
  const openDevMenu = () => {
    if (!__DEV__) return;
    Alert.alert(t('dev.title'), undefined, [
      { text: t('dev.empty'), onPress: list.clearAll },
      {
        text: t('dev.demo'),
        onPress: () => {
          list.loadDemo();
          leaveStarterMode();
        },
      },
      { text: t('dev.micDenied'), onPress: () => router.push({ pathname: '/voice', params: { mode: 'denied' } }) },
      { text: t('dev.notifications'), onPress: () => router.push('/notifications') },
      { text: t('dev.startOver'), onPress: () => router.push('/welcome') },
      { text: t('dev.openInvite'), onPress: () => router.push('/join') },
      { text: t('dev.inviteExpired'), onPress: () => router.push('/invite-expired') },
      ...(helper ? [{ text: t('dev.helperView', { name: helper.display_name }), onPress: () => router.push('/helper') }] : []),
      ...(pendingQuestion
        ? [
            {
              text: t('dev.answer', { name: list.memberById(pendingQuestion.to)?.display_name ?? '' }),
              onPress: () => router.push({ pathname: '/answer', params: { id: pendingQuestion.id } }),
            },
          ]
        : []),
      { text: t('dev.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + BOTTOM_BAR_HEIGHT + spacing.xxl,
          paddingHorizontal: spacing.lg,
          gap: spacing.xl,
        }}
        onScrollBeginDrag={() => setOpenRowId(null)}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.titleBlock} onLongPress={openDevMenu} accessible={false}>
            <AppText variant="label" color="muted">
              {list.householdName}
            </AppText>
            <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
              {t('home.title')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/members')}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={t('home.membersA11y')}>
            <AvatarStack members={list.members} max={MAX_HEADER_AVATARS} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/invite')}
            style={styles.inviteButton}
            accessibilityRole="button"
            accessibilityLabel={t('home.inviteA11y')}>
            <UserPlus size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
          </Pressable>
        </View>

        {starterMode ? (
          <EmptyState
            basics={basics}
            added={addedBasics}
            onToggleBasic={onToggleBasic}
            onShowList={leaveStarterMode}
          />
        ) : (
          <>
            {shopper && (
              <ShopperBanner
                shopper={shopper}
                self={!!list.trip}
                onPress={list.trip ? () => router.push('/shop') : undefined}
              />
            )}

            {/* Count + filters */}
            <View style={styles.filterRow}>
              <AppText variant="label" weight="bold" style={styles.count}>
                {t('home.itemCount', { n: visibleItems.length })}
              </AppText>
              <FilterPill label={t('filters.all')} selected={filter === 'all'} onPress={() => setFilter('all')} />
              <FilterPill
                label={t('filters.addedToday', { n: todayItems.length })}
                selected={filter === 'today'}
                onPress={() => setFilter('today')}
              />
            </View>

            {sections.length === 0 && (
              <AppText variant="label" color="muted" style={styles.emptyFilter}>
                {t('home.emptyFilter')}
              </AppText>
            )}

            {/* Grouped list */}
            {sections.map((section) => (
              <Animated.View key={section.category} style={styles.section} layout={rowLayout} exiting={rowExit}>
                <AppText variant="body" weight="semibold" color="muted" style={styles.sectionHeader}>
                  {t('home.sectionHeader', { name: t(`categories.${section.category}`), n: section.items.length })}
                </AppText>
                <View style={styles.card}>
                  {section.items.map((item, index) => (
                    <Animated.View
                      key={item.id}
                      layout={rowLayout}
                      exiting={rowExit}
                      style={index > 0 && styles.divider}>
                      <ItemRow
                        item={item}
                        members={list.everyone}
                        currentMemberId={list.currentMemberId}
                        isNew={isNew(item.created_at)}
                        isOpen={openRowId === item.id}
                        onOpenChange={(open) =>
                          setOpenRowId((current) => (open ? item.id : current === item.id ? null : current))
                        }
                        onPress={() => openItem(item.id)}
                        onCheck={() => list.markBought(item.id)}
                        onClaim={() => list.toggleClaim(item.id)}
                        onEdit={() => openItem(item.id)}
                        onDelete={() => list.removeItem(item.id)}
                      />
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Covers the status bar area so the list doesn't scroll under the clock */}
      <View style={[styles.statusBarCover, { height: insets.top }]} />

      <UndoToast bottomOffset={insets.bottom + BOTTOM_BAR_HEIGHT + spacing.md} />

      {/* Long-press the mic = simulated noisy recording */}
      <BottomBar
        onAtStore={() => router.push(list.trip ? '/shop' : '/start-trip')}
        onTalk={() => router.push('/voice')}
        onLongTalk={() => router.push({ pathname: '/voice', params: { mode: 'noisy' } })}
        onType={() => router.push('/add')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  statusBarCover: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.ground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    lineHeight: size.titleLine,
  },
  inviteButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  count: {
    flex: 1,
  },
  emptyFilter: {
    textAlign: 'center',
    paddingVertical: spacing.xxxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
});
