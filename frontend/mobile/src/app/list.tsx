import { useRouter } from 'expo-router';
import { Mic, Plus, Search } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { BackIcon, CircleButton } from '@/components/family/FamilyParts';
import { ItemRow } from '@/components/ItemRow';
import { NotFoundCard } from '@/components/NotFoundCard';
import { QuestionCard } from '@/components/QuestionCard';
import { ShopperBanner } from '@/components/ShopperBanner';
import { UndoToast } from '@/components/UndoToast';
import { basics, categoryOrder, NEW_ITEM_WINDOW_MINUTES, type Basic } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { features } from '@/lib/features';
import { isToday } from '@/lib/format';
import { useList } from '@/store/ListStore';
import { colors, motion, radius, shadow, size, spacing } from '@/theme';

type Filter = 'all' | 'today';

// Faces next to the title; more than this become «+N»
const MAX_HEADER_AVATARS = 3;
// Room at the bottom so the last row isn't hidden behind the floating mic
const MIC_CLEARANCE = features.voice ? size.micButton + spacing.xl : 0;

const rowLayout = LinearTransition.duration(motion.normal);
const rowExit = FadeOut.duration(motion.fast);

export default function ListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const list = useList();

  const [filter, setFilter] = useState<Filter>('all');
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  // Empty state stays up while the user picks basics, until they tap "show list"
  const [starterMode, setStarterMode] = useState(false);
  const [addedBasics, setAddedBasics] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Signed out (or the list is gone) → back to «قوايمي», which takes over (welcome / sign-up)
  const ready = list.mode === 'live' || list.mode === 'demo';
  useEffect(() => {
    if (!ready && router.canGoBack()) router.back();
  }, [ready]);

  const openItems = list.items.filter((item) => item.status === 'open');
  const todayItems = openItems.filter((item) => isToday(item.created_at));
  const visibleItems = filter === 'today' ? todayItems : openItems;

  useEffect(() => {
    if (openItems.length === 0) setStarterMode(true);
    // Items arrived from somewhere else (e.g. type-to-add) — show the list
    else if (Object.keys(addedBasics).length === 0) setStarterMode(false);
  }, [openItems.length]);

  // My own trip takes over the banner; otherwise show whoever else is shopping
  const shopper = list.members.find((m) => m.id === list.currentShopperId);
  // Questions from a shopper waiting for my answer (newest first)
  const questionsForMe = list.questions
    .filter((q) => q.to === list.currentMemberId && q.from !== list.currentMemberId && !q.answer)
    .map((q) => ({ q, item: list.items.find((i) => i.id === q.itemId), asker: list.memberById(q.from) }))
    .filter(
      (x): x is { q: typeof x.q; item: NonNullable<typeof x.item>; asker: NonNullable<typeof x.asker> } =>
        !!x.item && !!x.asker,
    )
    .reverse();
  const pendingQuestion = list.questions.find((q) => !q.answer);
  const helper = list.members.find((m) => m.role === 'helper');
  const sections = categoryOrder
    .map((category) => ({
      category,
      items: visibleItems.filter((item) => item.category === category),
    }))
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

  // Dev only: long-press the household name for test shortcuts (some only make sense in the demo)
  const openDevMenu = () => {
    if (!__DEV__) return;
    const demo = list.mode === 'demo';
    Alert.alert(t('dev.title'), undefined, [
      { text: t('dev.empty'), onPress: list.clearAll },
      ...(demo
        ? [
            {
              text: t('dev.demo'),
              onPress: () => {
                list.loadDemo();
                leaveStarterMode();
              },
            },
          ]
        : []),
      ...(features.voice
        ? [
            {
              text: t('dev.micDenied'),
              onPress: () => router.push({ pathname: '/voice', params: { mode: 'denied' } }),
            },
          ]
        : []),
      ...(demo
        ? [
            {
              text: t('dev.notifications'),
              onPress: () => router.push('/notifications'),
            },
          ]
        : []),
      demo ? { text: t('dev.startOver'), onPress: list.signOut } : { text: t('dev.signOut'), onPress: list.signOut },
      { text: t('dev.openInvite'), onPress: () => router.push('/join') },
      {
        text: t('dev.inviteExpired'),
        onPress: () => router.push('/invite-expired'),
      },
      ...(helper
        ? [
            {
              text: t('dev.helperView', { name: helper.display_name }),
              onPress: () => router.push('/helper'),
            },
          ]
        : []),
      ...(pendingQuestion
        ? [
            {
              text: t('dev.answer', {
                name: list.memberById(pendingQuestion.to)?.display_name ?? '',
              }),
              onPress: () =>
                router.push({
                  pathname: '/answer',
                  params: { id: pendingQuestion.id },
                }),
            },
          ]
        : []),
      { text: t('dev.cancel'), style: 'cancel' },
    ]);
  };

  const onAtStore = () => router.navigate('/market');
  const me = list.memberById(list.currentMemberId);

  const onDemoBadge = () =>
    Alert.alert(t('home.demoTitle'), t('home.demoBody'), [
      { text: t('home.demoStay'), style: 'cancel' },
      { text: t('home.demoLeave'), onPress: list.signOut },
    ]);

  if (!ready) return null;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + MIC_CLEARANCE + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.xl,
        }}
        onScrollBeginDrag={() => setOpenRowId(null)}
        showsVerticalScrollIndicator={false}>
        {/* Header in one row: back to «قوايمي» · list name · the list's people + «+» to invite (helpers can't) */}
        <View style={styles.headerBlock}>
          <View style={styles.header}>
            <CircleButton icon={BackIcon} label={t('lists.backA11y')} onPress={() => router.back()} />
            <Pressable style={styles.titleBlock} onLongPress={openDevMenu} accessible={false}>
              <AppText
                variant="title"
                weight="bold"
                style={styles.title}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                accessibilityRole="header">
                {list.householdName}
              </AppText>
              {list.mode === 'demo' && (
                <Pressable
                  onPress={onDemoBadge}
                  style={styles.demoBadge}
                  accessibilityRole="button"
                  hitSlop={spacing.sm}>
                  <AppText variant="meta" weight="semibold" color="accentInk">
                    {t('home.demo')}
                  </AppText>
                </Pressable>
              )}
            </Pressable>
            <View style={styles.familyRow}>
              <Pressable
                onPress={() => router.push('/members')}
                hitSlop={spacing.xs}
                accessibilityRole="button"
                accessibilityLabel={t('home.membersA11y')}>
                <AvatarStack members={list.members} ring="ground" max={MAX_HEADER_AVATARS} />
              </Pressable>
              {me?.role !== 'helper' && (
                <Pressable
                  onPress={() => router.push('/invite')}
                  style={styles.addMember}
                  hitSlop={spacing.sm}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.inviteA11y')}>
                  <Plus size={size.iconSmall + spacing.xxs} color={colors.ink} strokeWidth={size.iconStroke + 0.5} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* «اكتب» field (shopping lives in the «بالسوق» tab) */}
        <Pressable onPress={() => router.push('/add')} style={styles.typeField} accessibilityRole="search">
          <Search size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />
          <AppText variant="item" color="muted">
            {t('home.typeField')}
          </AppText>
        </Pressable>

        {questionsForMe.map(({ q, item, asker }) => (
          <QuestionCard
            key={q.id}
            question={q}
            item={item}
            asker={asker}
            onReply={(answer, label) => list.answerQuestion(q.id, answer, label)}
            onOpen={() => router.push({ pathname: '/answer', params: { id: q.id } })}
          />
        ))}

        {/* What the helper (or anyone) couldn't find in the shop */}
        <NotFoundCard
          items={list.items.filter((item) => item.status === 'not_found')}
          onReopen={list.reopenItem}
          onRemove={list.removeItem}
        />

        {list.itemsLoading ? (
          // Still loading: a spinner, not the «empty list» starter
          <ActivityIndicator color={colors.muted} style={styles.loading} />
        ) : starterMode ? (
          <EmptyState basics={basics} added={addedBasics} onToggleBasic={onToggleBasic} onShowList={leaveStarterMode} />
        ) : (
          <>
            {shopper && <ShopperBanner shopper={shopper} self={!!list.trip} compact onPress={onAtStore} />}

            {/* Count + a quiet «الكل · اليوم» toggle */}
            <View style={styles.filterRow}>
              <AppText variant="label" weight="bold" style={styles.count}>
                {t('home.itemCount', { n: visibleItems.length })}
              </AppText>
              <FilterText label={t('home.all')} selected={filter === 'all'} onPress={() => setFilter('all')} />
              <AppText variant="body" color="muted">
                ·
              </AppText>
              <FilterText
                label={t('home.today', { n: todayItems.length })}
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
                  {t('home.sectionHeader', {
                    name: t(`categories.${section.category}`),
                    n: section.items.length,
                  })}
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

      <UndoToast bottomOffset={insets.bottom + MIC_CLEARANCE + spacing.sm} />

      {/* «اضغط وتكلّم» — floating mic on the end side (bottom-left in Arabic). Long-press = simulated noisy recording */}
      {features.voice && (
        <Pressable
          onPress={() => router.push('/voice')}
          onLongPress={() => router.push({ pathname: '/voice', params: { mode: 'noisy' } })}
          style={[styles.micButton, { bottom: insets.bottom + spacing.lg }]}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.talk')}>
          <Mic size={size.icon + spacing.sm} color={colors.onDark} strokeWidth={size.iconStroke} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.xxl,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  headerBlock: {
    gap: spacing.xs,
  },
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: size.touch,
  },
  addMember: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    position: 'absolute',
    end: spacing.lg,
    width: size.micButton,
    height: size.micButton,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.floating,
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
    alignItems: 'center',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  demoBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.badge,
    backgroundColor: colors.accentTint,
  },
  filterText: {
    minHeight: size.touch,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  typeField: {
    marginTop: -spacing.xs,
    minHeight: size.control + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  title: {
    flexShrink: 1,
    lineHeight: size.titleLine,
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

// «الكل» / «اليوم 3» — plain text that turns dark and bold when selected
function FilterText({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.filterText} accessibilityRole="button" accessibilityState={{ selected }}>
      <AppText variant="body" weight={selected ? 'bold' : 'regular'} color={selected ? 'ink' : 'muted'}>
        {label}
      </AppText>
    </Pressable>
  );
}
