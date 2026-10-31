// «رايح السوق؟» — the «بالسوق» tab before a trip starts: which list (card, tap to switch), which store
// (2×2 tiles), split with whoever's already shopping, then «ابدأ التسوق» (the tab becomes the shopping screen).

import * as Haptics from 'expo-haptics';
import { Bell, Check, ChevronDown, Croissant, Pill, ShoppingCart, Store, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Glass } from '@/components/glass/Glass';
import { Avatar, AvatarStack } from '@/components/Avatar';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { RadioCard, Sheet, SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { activeShopperSinceMinutes, categoryOrder, storeOrder, type StoreKey } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { useHideTabBar } from '@/lib/tabBar';
import { useList } from '@/store/ListStore';
import { colors, opacity, radius, size, spacing } from '@/theme';

const storeIcons: Record<StoreKey, LucideIcon> = {
  supermarket: ShoppingCart,
  grocery: Store,
  pharmacy: Pill,
  bakery: Croissant,
};
// Item names shown on the list card; the rest become «+N»
const PREVIEW_ITEMS = 3;
const MAX_CARD_AVATARS = 4;

export function StartTripView() {
  const insets = useSafeAreaInsets();
  const list = useList();
  const me = list.memberById(list.currentMemberId);
  // Only someone who's actually in this household (a brand-new household has nobody shopping)
  const other = list.otherShopperId ? list.members.find((m) => m.id === list.otherShopperId) : undefined;
  // How long they've been shopping (live: from their trip; demo: a fixed 10 minutes)
  const otherTrip = list.activeTrips.find((tr) => tr.shopperId === list.otherShopperId);
  const otherMinutes = otherTrip
    ? Math.max(1, Math.round((Date.now() - new Date(otherTrip.startedAt).getTime()) / 60_000))
    : activeShopperSinceMinutes;
  const g = me?.gender ?? 'm';

  const [store, setStore] = useState<StoreKey>('supermarket');
  const [mode, setMode] = useState<'solo' | 'split'>(other ? 'split' : 'solo');
  const openItems = list.items
    .filter((i) => i.status === 'open')
    .sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));
  const openCount = openItems.length;
  const preview = openItems.slice(0, PREVIEW_ITEMS).map((i) => i.name);
  const more = openCount - preview.length;
  const canSwitch = list.lists.length > 1;

  // Pick another of my lists (same choices as «قوايمي») from a bottom sheet
  const [picking, setPicking] = useState(false);
  useHideTabBar(picking); // the floating tab bar would cover the sheet
  const onSwitchList = () => {
    if (!canSwitch) return;
    Haptics.selectionAsync();
    setPicking(true);
  };
  const onPickList = (householdId: string) => {
    setPicking(false);
    if (householdId === list.householdId) return;
    Haptics.selectionAsync();
    list.switchList(householdId);
  };

  const tabBarSpace = insets.bottom + size.tabBar;

  const start = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.startTrip(store, other ? mode : 'solo');
  };

  return (
    <View style={styles.screen}>
      <GradientBackground />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
          {t(`startTrip.title_${g}`)}
        </AppText>

        {/* The list I'm shopping for */}
        <Glass>
        <Pressable
          onPress={onSwitchList}
          disabled={!canSwitch}
          style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}
          accessibilityRole={canSwitch ? 'button' : undefined}
          accessibilityHint={canSwitch ? t('market.whichList') : undefined}>
          <View style={styles.row}>
            <View style={styles.listName}>
              <AppText variant="heading" weight="bold" numberOfLines={1} style={styles.shrink}>
                {list.householdName}
              </AppText>
              {canSwitch && <ChevronDown size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />}
            </View>
            <AvatarStack members={list.members} ring="surface" max={MAX_CARD_AVATARS} small />
          </View>
          <AppText variant="label" weight="semibold" color={openCount > 0 ? 'ink' : 'muted'}>
            {t('home.itemCount', { n: openCount })}
          </AppText>
          {openCount > 0 ? (
            <AppText variant="body" color="muted" numberOfLines={1}>
              {preview.join(t('item.metaSeparator')) + (more > 0 ? t('market.more', { n: more }) : '')}
            </AppText>
          ) : (
            <AppText variant="body" color="muted">
              {t('market.emptyHint')}
            </AppText>
          )}
        </Pressable>
        </Glass>

        <View style={styles.section}>
          <AppText variant="label" weight="bold">
            {t('startTrip.where')}
          </AppText>
          <View style={styles.tiles} accessibilityRole="radiogroup">
            {storeOrder.map((key) => {
              const Icon = storeIcons[key];
              const selected = store === key;
              return (
                <Glass key={key} interactive style={[styles.tile, selected && styles.tileSelected]}>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStore(key);
                    }}
                    style={styles.tileInner}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}>
                    <Icon size={size.icon} color={selected ? colors.accent : colors.muted} strokeWidth={size.iconStroke} />
                    <AppText variant="label" weight={selected ? 'bold' : 'medium'} numberOfLines={1}>
                      {t(`stores.${key}`)}
                    </AppText>
                  </Pressable>
                </Glass>
              );
            })}
          </View>
        </View>

        {other && (
          <>
            <View style={styles.otherCard}>
              <Avatar member={other} ring="accentTint" />
              <AppText variant="body" style={styles.flex}>
                {t(`startTrip.otherShopper_${other.gender}`, {
                  name: other.display_name,
                  minutes: t('time.minutes', { n: otherMinutes }),
                })}
              </AppText>
            </View>
            <View style={styles.options} accessibilityRole="radiogroup">
              <RadioCard
                title={t('startTrip.splitTitle', { name: other.display_name })}
                body={t('startTrip.splitBody')}
                selected={mode === 'split'}
                onPress={() => setMode('split')}
              />
              <RadioCard
                title={t('startTrip.soloTitle')}
                body={t(`startTrip.soloBody_${g}`, { name: other.display_name })}
                selected={mode === 'solo'}
                onPress={() => setMode('solo')}
              />
            </View>
          </>
        )}
      </ScrollView>

      <UndoToast />

      <View style={[styles.footer, { paddingBottom: tabBarSpace + spacing.sm }]}>
        <View style={styles.notifyRow}>
          <Bell size={size.icon - spacing.xs} color={colors.success} strokeWidth={size.iconStroke} />
          <AppText variant="body" style={styles.flex}>
            {t(`startTrip.notify_${g}`)}
          </AppText>
        </View>
        <SheetButton label={t(`startTrip.start_${g}`)} onPress={start} />
      </View>

      <Sheet visible={picking} onClose={() => setPicking(false)} title={t('market.whichList')}>
        <View style={styles.pickCard} accessibilityRole="radiogroup">
          {list.lists.map((l, index) => {
            const current = l.householdId === list.householdId;
            return (
              <Pressable
                key={l.householdId}
                onPress={() => onPickList(l.householdId)}
                style={[styles.pickRow, index > 0 && styles.pickDivider]}
                accessibilityRole="radio"
                accessibilityState={{ selected: current }}>
                <View style={styles.pickCheck}>
                  {current && <Check size={size.icon - spacing.xs} color={colors.accent} strokeWidth={size.iconStroke + 1} />}
                </View>
                <AppText variant="item" weight={current ? 'bold' : 'regular'} style={styles.flex} numberOfLines={1}>
                  {l.name}
                </AppText>
                {l.members.length > 0 && <AvatarStack members={l.members} ring="surface" max={MAX_CARD_AVATARS} small />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
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
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    lineHeight: size.titleLine,
  },
  shrink: {
    flexShrink: 1,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listCard: {
    gap: spacing.xs,
    padding: spacing.lg,
  },
  listName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickCard: {
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  pickRow: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pickDivider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  pickCheck: {
    width: size.checkbox,
    alignItems: 'center',
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    flexBasis: '45%',
    flexGrow: 1,
    borderWidth: size.borderThick,
    borderColor: 'transparent',
  },
  tileInner: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  tileSelected: {
    borderColor: colors.accent,
  },
  section: {
    gap: spacing.md,
  },
  otherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.accentTint,
  },
  options: {
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
