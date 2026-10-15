// «رايح السوق؟» — the «بالسوق» tab before a trip starts: pick the store, split with whoever's
// already shopping, then «ابدأ التسوق» (the tab then becomes the live shopping screen).

import * as Haptics from 'expo-haptics';
import { Bell } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { FilterPill } from '@/components/FilterPill';
import { RadioCard, SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { activeShopperSinceMinutes, storeOrder, type StoreKey } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

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
  const openCount = list.items.filter((i) => i.status === 'open').length;
  const tabBarSpace = insets.bottom + size.tabBar;

  const start = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.startTrip(store, other ? mode : 'solo');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {t(`startTrip.title_${g}`)}
          </AppText>
          <AppText variant="item" color="muted">
            {t('startTrip.count', { count: t('home.itemCount', { n: openCount }) })}
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="label" weight="bold">
            {t('startTrip.where')}
          </AppText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {storeOrder.map((key) => (
              <FilterPill key={key} label={t(`stores.${key}`)} selected={store === key} onPress={() => setStore(key)} />
            ))}
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

      <UndoToast bottomOffset={tabBarSpace + size.button + spacing.xxl * 2} />

      <View style={[styles.footer, { paddingBottom: tabBarSpace + spacing.sm }]}>
        <View style={styles.notifyRow}>
          <Bell size={size.icon - spacing.xs} color={colors.success} strokeWidth={size.iconStroke} />
          <AppText variant="body" style={styles.flex}>
            {t(`startTrip.notify_${g}`)}
          </AppText>
        </View>
        <SheetButton label={t(`startTrip.start_${g}`)} onPress={start} />
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
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  intro: {
    gap: spacing.sm,
  },
  title: {
    lineHeight: size.titleLine,
  },
  section: {
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
