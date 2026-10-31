// "أنتي في السوق" — shopper mode, shown in the «بالسوق» tab during my trip.
// Dev: long-press the title to simulate losing / getting back the connection.

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Check, Clock, ShoppingBasket } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import { GlassCard } from '@/components/glass/Glass';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { SheetButton } from '@/components/shop/Sheet';
import {
  OfflineBanner,
  ProgressBar,
  RowCard,
  SectionHeader,
  ShopHeader,
  ShopRow,
  SwipeShopRow,
} from '@/components/shop/ShopParts';
import { EndEarlySheet, NotFoundSheet } from '@/components/shop/TripSheets';
import { UndoToast } from '@/components/UndoToast';
import { categoryOrder, type Item, type Member } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { formatClock, formatQuantity } from '@/lib/format';
import { useHideTabBar } from '@/lib/tabBar';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

const byAisle = (a: Item, b: Item) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);

export function ShopView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const { trip } = list;

  const [notFoundItem, setNotFoundItem] = useState<Item | null>(null);
  const [endingEarly, setEndingEarly] = useState(false);
  // The floating tab bar would cover a sheet's buttons — hide it while one is open
  useHideTabBar(!!notFoundItem || endingEarly);

  if (!trip) return null;

  // Footers and toasts sit above the tab bar
  const bottomSpace = insets.bottom + size.tabBar;

  const memberById = (id: string | null) => (id ? list.memberById(id) : undefined);
  const me = memberById(list.currentMemberId)!;
  const g = me.gender;
  const partner = memberById(trip.partnerId);
  const split = trip.mode === 'split' && !!partner;

  const tripItems = list.items.filter((i) => trip.itemIds.includes(i.id) && i.status !== 'removed');
  const skipped = tripItems.filter((i) => trip.skippedIds.includes(i.id) && i.status === 'open');
  const active = tripItems.filter((i) => !trip.skippedIds.includes(i.id));
  const isPartners = (i: Item) => split && i.claimed_by === trip.partnerId;
  const mineOrShared = active.filter((i) => !isPartners(i));
  const open = mineOrShared.filter((i) => i.status === 'open');
  const inCart = mineOrShared.filter((i) => i.status === 'in_cart');
  const justAdded = (i: Item) => trip.addedIds.includes(i.id) && i.status === 'open';
  const remaining = [...open].sort((a, b) => Number(justAdded(b)) - Number(justAdded(a)) || byAisle(a, b));

  const subtitleFor = (item: Item) => {
    const adder = memberById(item.added_by);
    if (justAdded(item) && adder) return t(`shop.justAdded_${adder.gender}`, { name: adder.display_name });
    const names = item.requested_by.map((id) => memberById(id)?.display_name).filter(Boolean).join(' + ');
    return `${t(`categories.${item.category}`)}${t('item.metaSeparator')}${names}`;
  };

  // Who to ask about a missing item: whoever added it, unless that's the shopper
  const askTargetFor = (item: Item): Member | undefined => {
    if (item.added_by !== me.id) return memberById(item.added_by);
    return list.members.find((m) => m.id !== me.id && m.role !== 'helper');
  };

  const onDone = () => {
    if (open.length > 0) return setEndingEarly(true);
    finish(false);
  };

  const finish = (handoff: boolean) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEndingEarly(false);
    list.finishTrip(handoff);
    router.push('/trip-done');
  };

  const toggleOffline = () => {
    if (!__DEV__) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    list.setOffline(!list.offline);
  };

  // --- Nothing on the list ---------------------------------------------------
  if (tripItems.length === 0) {
    return (
      <View style={styles.screen}>
        <GradientBackground />
        <ShopHeader title={t(`shop.title_${g}`)} subtitle={t('shop.familyKnows')} />
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <ShoppingBasket size={size.icon * 2} color={colors.success} strokeWidth={size.iconStroke} />
          </View>
          <AppText variant="heading" weight="bold" style={styles.center}>
            {t('shopEmpty.title')}
          </AppText>
          <AppText variant="label" color="muted" style={styles.center}>
            {t(`shopEmpty.body_${g}`)}
          </AppText>
          <GlassCard style={styles.notifyCard}>
            <AppText variant="body" color="muted">
              {t('shopEmpty.notifyLabel')}
            </AppText>
            <AppText variant="item">
              {t('shopEmpty.notifyText', { name: me.display_name, store: t(`stores.${trip.store}`) })}
            </AppText>
          </GlassCard>
        </ScrollView>
        <View style={[styles.emptyFooter, { paddingBottom: bottomSpace + spacing.sm }]}>
          <SheetButton
            label={t('shopEmpty.ask')}
            tone="accent"
            onPress={() => {
              Haptics.selectionAsync();
              list.notify(t('toast.askedFamily'));
            }}
          />
          <SheetButton
            label={t(`shopEmpty.leave_${g}`)}
            tone="link"
            onPress={() => {
              list.leaveTrip();
            }}
          />
        </View>
        <UndoToast />
      </View>
    );
  }

  // --- Sections ----------------------------------------------------------------
  const remainingRows = (items: Item[]) =>
    items.map((item) => (
      <SwipeShopRow
        key={item.id}
        item={item}
        subtitle={subtitleFor(item)}
        highlight={justAdded(item)}
        checked={false}
        onToggle={() => list.toggleCart(item.id)}
        onLongPress={() => setNotFoundItem(item)}
        onBought={() => list.toggleCart(item.id)}
        onNotFound={() => setNotFoundItem(item)}
      />
    ));

  const pendingNames = list.pendingSync
    .map((id) => list.items.find((i) => i.id === id)?.name)
    .filter(Boolean)
    .join('، ');

  const unclaimed = split ? remaining.filter((i) => !i.claimed_by) : [];
  const mine = split ? remaining.filter((i) => i.claimed_by === me.id) : remaining;
  const partnerItems = split ? active.filter(isPartners) : [];
  const partnerBought = partnerItems.filter((i) => i.status === 'in_cart');
  const partnerOpen = partnerItems.filter((i) => i.status === 'open');

  return (
    <View style={styles.screen}>
      <GradientBackground />
      <ShopHeader
        title={split ? t(`shop.splitTitle_${g}`, { name: partner!.display_name }) : t(`shop.title_${g}`)}
        subtitle={
          split
            ? t(`shop.splitSubtitle_${g}`, { name: partner!.display_name })
            : t('shop.started', { time: formatClock(new Date(trip.startedAt)) })
        }
        onTitleLongPress={toggleOffline}
        badge={
          <View style={styles.headerEnd}>
            {split && <AvatarStack members={[me, partner!]} ring="ground" />}
            {/* «خلصت» — finish the trip (asks first if something's left) */}
            <Pressable onPress={onDone} style={styles.doneButton} accessibilityRole="button" accessibilityLabel={t('shop.done')}>
              <AppText variant="label" weight="bold" color="onDark">
                {t('shop.doneShort')}
              </AppText>
            </Pressable>
          </View>
        }>
        {!split && <ProgressBar done={inCart.length} total={mineOrShared.length} />}
      </ShopHeader>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpace + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        {list.offline && <OfflineBanner body={t(`offline.body_${g}`)} />}

        {split && unclaimed.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label={t('shop.unclaimedHeader', { n: unclaimed.length })} />
            <RowCard>
              {unclaimed.map((item) => (
                <SwipeShopRow
                  key={item.id}
                  item={item}
                  subtitle={formatQuantity(item.qty, item.unit)}
                  checked={false}
                  onLongPress={() => setNotFoundItem(item)}
                  // Swipe left on an unclaimed item: take it and it's in my cart
                  onBought={() => {
                    list.claimForTrip(item.id);
                    list.toggleCart(item.id);
                  }}
                  onNotFound={() => setNotFoundItem(item)}
                  trailing={
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        list.claimForTrip(item.id);
                      }}
                      style={styles.claimButton}
                      accessibilityRole="button">
                      <AppText variant="label" weight="bold" color="onAccent">
                        {t('shop.claim')}
                      </AppText>
                    </Pressable>
                  }
                />
              ))}
            </RowCard>
          </View>
        )}

        {mine.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              label={
                split
                  ? t('shop.mineHeader', { n: mine.length })
                  : list.offline
                    ? t('shop.remaining')
                    : t('shop.remainingHeader')
              }
            />
            <RowCard>{remainingRows(mine)}</RowCard>
          </View>
        )}

        {split && partnerItems.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label={t('shop.partnerHeader', { name: partner!.display_name, n: partnerItems.length })} />
            <GlassCard style={styles.partnerCard}>
              {partnerBought.map((item) => (
                <View key={item.id} style={styles.partnerRow}>
                  <AppText variant="label" color="muted" style={[styles.flex, styles.struck]} numberOfLines={1}>
                    {`${item.name} ${formatQuantity(item.qty, item.unit)}`}
                  </AppText>
                  <AppText variant="label" weight="bold" color="success">
                    {t(`shop.partnerBought_${partner!.gender}`)}
                  </AppText>
                </View>
              ))}
              {partnerOpen.length > 0 && (
                <View style={[styles.partnerRow, partnerBought.length > 0 && styles.partnerDivider]}>
                  <AppText variant="label" style={styles.flex} numberOfLines={2}>
                    {partnerOpen.map((i) => `${i.name} ${formatQuantity(i.qty, i.unit)}`).join(t('item.metaSeparator'))}
                  </AppText>
                  <AppText variant="body" color="muted">
                    {t(`shop.partnerSearching_${partner!.gender}`)}
                  </AppText>
                </View>
              )}
            </GlassCard>
          </View>
        )}

        {skipped.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label={t('shop.skippedHeader', { n: skipped.length })} />
            <RowCard>
              {skipped.map((item) => {
                const question = list.questions.find((q) => q.itemId === item.id && q.tripId === trip.id && !q.answer);
                const asked = memberById(question?.to ?? null);
                return (
                  <ShopRow
                    key={item.id}
                    item={item}
                    subtitle={asked ? t('shop.waiting', { name: asked.display_name }) : t('notFound.next')}
                    checked={false}
                    trailing={<Clock size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />}
                  />
                );
              })}
            </RowCard>
          </View>
        )}

        {list.offline && list.pendingSync.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label={t('offline.pendingHeader', { n: list.pendingSync.length })} />
            <View style={styles.pendingCard}>
              <Check size={size.icon - spacing.xs} color={colors.success} strokeWidth={size.iconStroke} />
              <AppText variant="label" style={styles.flex}>
                {t('offline.pendingCart', { names: pendingNames })}
              </AppText>
              <Clock size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />
            </View>
          </View>
        )}

        {inCart.length > 0 && !list.offline && (
          <View style={styles.section}>
            <SectionHeader label={t('shop.inCartHeader', { n: inCart.length })} />
            <RowCard>
              {inCart.map((item) => (
                <ShopRow
                  key={item.id}
                  item={item}
                  subtitle={subtitleFor(item)}
                  checked
                  onToggle={() => list.toggleCart(item.id)}
                />
              ))}
            </RowCard>
          </View>
        )}
      </ScrollView>

      <UndoToast />

      {/* A fresh sheet per item, so it opens at its final size (with the «اسأل» preview already showing) */}
      <NotFoundSheet
        key={notFoundItem?.id ?? 'none'}
        item={notFoundItem}
        adder={notFoundItem ? memberById(notFoundItem.added_by) : undefined}
        askTarget={notFoundItem ? askTargetFor(notFoundItem) : undefined}
        onConfirm={(choice) => {
          if (!notFoundItem) return;
          Haptics.selectionAsync();
          list.notFound(notFoundItem.id, choice, askTargetFor(notFoundItem)?.id ?? null);
          setNotFoundItem(null);
        }}
        onClose={() => setNotFoundItem(null)}
      />

      <EndEarlySheet
        visible={endingEarly}
        remaining={open}
        gender={g}
        onFinish={finish}
        onClose={() => setEndingEarly(false)}
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
  center: {
    textAlign: 'center',
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  claimButton: {
    minHeight: size.control,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerCard: {
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
  },
  partnerRow: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  partnerDivider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  pendingCard: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  headerEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  doneButton: {
    minHeight: size.touch,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'stretch',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl * 2,
    gap: spacing.lg,
  },
  emptyIcon: {
    alignSelf: 'center',
    width: size.voiceMic,
    height: size.voiceMic,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  notifyCard: {
    marginTop: spacing.md,
    padding: spacing.xl,
    gap: spacing.xs,
    borderRadius: radius.card,
  },
  emptyFooter: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
});
