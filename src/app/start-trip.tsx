// "Going shopping?" — opens over Home from «أنا في السوق».

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { FilterPill } from '@/components/FilterPill';
import { RadioCard, Sheet, SheetButton } from '@/components/shop/Sheet';
import { activeShopperId, activeShopperSinceMinutes, storeOrder, type StoreKey } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

export default function StartTripScreen() {
  const router = useRouter();
  const list = useList();
  const me = list.memberById(list.currentMemberId);
  // Only someone who's actually in this household (a brand-new household has nobody shopping)
  const other = activeShopperId && activeShopperId !== list.currentMemberId ? list.members.find((m) => m.id === activeShopperId) : undefined;
  const g = me?.gender ?? 'm';

  const [store, setStore] = useState<StoreKey>('supermarket');
  const [mode, setMode] = useState<'solo' | 'split'>(other ? 'split' : 'solo');
  const openCount = list.items.filter((i) => i.status === 'open').length;

  const start = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.startTrip(store, other ? mode : 'solo');
    router.replace('/shop');
  };

  return (
    <View style={styles.screen}>
      <Sheet
        visible
        onClose={() => router.back()}
        title={t(`startTrip.title_${g}`)}
        subtitle={t('startTrip.count', { count: t('home.itemCount', { n: openCount }) })}
        footer={
          <>
            <View style={styles.notifyRow}>
              <Bell size={size.icon - spacing.xs} color={colors.success} strokeWidth={size.iconStroke} />
              <AppText variant="body" style={styles.flex}>
                {t(`startTrip.notify_${g}`)}
              </AppText>
            </View>
            <SheetButton label={t(`startTrip.start_${g}`)} onPress={start} />
          </>
        }>
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
                  minutes: t('time.minutes', { n: activeShopperSinceMinutes }),
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
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
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
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
