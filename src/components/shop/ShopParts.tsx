import * as Haptics from 'expo-haptics';
import { Check, SearchX, WifiOff } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import type { Item } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { isRTLLayout } from '@/lib/direction';
import { formatQuantity } from '@/lib/format';
import { colors, motion, opacity, radius, size, spacing } from '@/theme';

const CHECK_HIT_SLOP = (size.touch - size.checkbox) / 2;

// Header of the shopping screen — same look as the list screen: big title on the page, muted line under it
type HeaderProps = {
  title: string;
  subtitle?: string;
  onTitleLongPress?: () => void;
  badge?: ReactNode; // shown on the end side, next to the title
  children?: ReactNode; // progress, etc.
};

export function ShopHeader({ title, subtitle, onTitleLongPress, badge, children }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.topRow}>
        <Pressable
          style={styles.flex}
          onLongPress={onTitleLongPress}
          accessibilityHint={onTitleLongPress ? t('shop.offlineA11y') : undefined}>
          <AppText
            variant="title"
            weight="bold"
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            accessibilityRole="header">
            {title}
          </AppText>
        </Pressable>
        {badge}
      </View>
      {subtitle && (
        <AppText variant="body" color="muted">
          {subtitle}
        </AppText>
      )}
      {children}
    </View>
  );
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressLabels}>
        <AppText variant="body" weight="bold">
          {t('shop.progress', { done, total })}
        </AppText>
        <AppText variant="body" color="muted">
          {t('shop.left', { n: total - done })}
        </AppText>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: done }}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
    </View>
  );
}

type RowProps = {
  item: Item;
  subtitle: string;
  highlight?: boolean; // just added by the family
  checked: boolean;
  onToggle?: () => void; // undefined = can't be ticked here
  onLongPress?: () => void;
  trailing?: ReactNode; // replaces the quantity pill
  accessibilityActions?: { name: string; label: string }[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
};

export function ShopRow({
  item,
  subtitle,
  highlight,
  checked,
  onToggle,
  onLongPress,
  trailing,
  accessibilityActions,
  onAccessibilityAction,
}: RowProps) {
  const toggle = () => {
    if (!onToggle) return;
    Haptics.impactAsync(checked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    onToggle();
  };

  return (
    <Pressable
      onPress={onToggle ? toggle : undefined}
      onLongPress={onLongPress}
      style={[styles.row, highlight && styles.rowHighlight]}
      accessibilityRole={onToggle ? 'checkbox' : undefined}
      accessibilityState={onToggle ? { checked } : undefined}
      accessibilityLabel={onToggle ? t(checked ? 'shop.uncartA11y' : 'shop.cartA11y', { name: item.name }) : item.name}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}>
      {onToggle && (
        <View hitSlop={CHECK_HIT_SLOP} style={[styles.check, checked && styles.checkOn]}>
          {checked && <Check size={size.icon - spacing.sm} color={colors.onDark} strokeWidth={size.iconStroke + 1} />}
        </View>
      )}
      <View style={styles.flex}>
        <AppText
          variant="item"
          weight="semibold"
          color={checked ? 'muted' : 'ink'}
          style={checked && styles.struck}
          numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="meta" weight={highlight ? 'medium' : 'regular'} color={highlight ? 'accentInk' : 'muted'} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {trailing ?? (
        <View style={[styles.qtyPill, highlight && styles.qtyPillLight]}>
          <AppText variant="body" weight="bold">
            {formatQuantity(item.qty, item.unit)}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

// --- Swipe a row while shopping ------------------------------------------------
// Physical directions (as agreed): swipe LEFT → «اشتريتها» (into the cart), swipe RIGHT → «ملقتهاش».
// Let go past the threshold to act; a short drag springs back.

const SWIPE_THRESHOLD = size.swipeAction * 1.5; // how far to drag before letting go acts
const SWIPE_ACTIVATE = spacing.xl; // sideways travel before a row swipe starts
const SCROLL_WINS = spacing.sm; // vertical travel that hands the touch to the list scroll
const FLING_VELOCITY = 800;
// Where each label sits: the side the row moves away from
const BOUGHT_SIDE = isRTLLayout ? 'flex-start' : 'flex-end'; // right edge (revealed by a left swipe)
const NOT_FOUND_SIDE = isRTLLayout ? 'flex-end' : 'flex-start'; // left edge (revealed by a right swipe)

type SwipeRowProps = Omit<RowProps, 'accessibilityActions' | 'onAccessibilityAction'> & {
  onBought: () => void;
  onNotFound: () => void;
};

export function SwipeShopRow({ onBought, onNotFound, ...rowProps }: SwipeRowProps) {
  const offset = useSharedValue(0); // physical: negative = moved left
  const [armed, setArmed] = useState<'bought' | 'notFound' | null>(null);

  // A light tap on the finger when the action is ready (and again if it's backed off)
  const onArmedChange = (next: 'bought' | 'notFound' | null) => {
    setArmed(next);
    if (next) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const act = (action: 'bought' | 'notFound') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (action === 'bought') onBought();
    else onNotFound();
  };

  const armedNow = useSharedValue<0 | 1 | -1>(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-SWIPE_ACTIVATE, SWIPE_ACTIVATE])
    .failOffsetY([-SCROLL_WINS, SCROLL_WINS])
    .onUpdate((e) => {
      offset.value = e.translationX;
      const next = e.translationX <= -SWIPE_THRESHOLD ? -1 : e.translationX >= SWIPE_THRESHOLD ? 1 : 0;
      if (next !== armedNow.value) {
        armedNow.value = next;
        scheduleOnRN(onArmedChange, next === -1 ? 'bought' : next === 1 ? 'notFound' : null);
      }
    })
    .onEnd((e) => {
      const left = e.translationX <= -SWIPE_THRESHOLD || (e.translationX < 0 && e.velocityX < -FLING_VELOCITY);
      const right = e.translationX >= SWIPE_THRESHOLD || (e.translationX > 0 && e.velocityX > FLING_VELOCITY);
      offset.value = withTiming(0, { duration: motion.fast });
      armedNow.value = 0;
      scheduleOnRN(onArmedChange, null);
      if (left) scheduleOnRN(act, 'bought');
      else if (right) scheduleOnRN(act, 'notFound');
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const boughtStyle = useAnimatedStyle(() => ({ opacity: offset.value < 0 ? 1 : 0 }));
  const notFoundStyle = useAnimatedStyle(() => ({ opacity: offset.value > 0 ? 1 : 0 }));

  // Screen readers can't swipe — same two actions through the actions menu
  const accessibilityActions = [
    { name: 'bought', label: t('shop.swipeBought') },
    { name: 'notFound', label: t('shop.swipeNotFound') },
  ];
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'bought') onBought();
    if (e.nativeEvent.actionName === 'notFound') onNotFound();
  };

  return (
    <View style={styles.swipeWrap}>
      <Animated.View style={[styles.swipePanel, styles.swipeBought, { justifyContent: BOUGHT_SIDE }, boughtStyle]}>
        <View style={[styles.swipeLabel, armed === 'bought' && styles.swipeLabelArmed]}>
          <Check size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke + 1} />
          <AppText variant="body" weight="bold" color="onDark">
            {t('shop.swipeBought')}
          </AppText>
        </View>
      </Animated.View>
      <Animated.View style={[styles.swipePanel, styles.swipeNotFound, { justifyContent: NOT_FOUND_SIDE }, notFoundStyle]}>
        <View style={[styles.swipeLabel, armed === 'notFound' && styles.swipeLabelArmed]}>
          <SearchX size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke} />
          <AppText variant="body" weight="bold" color="onDark">
            {t('shop.swipeNotFound')}
          </AppText>
        </View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>
          <ShopRow {...rowProps} accessibilityActions={accessibilityActions} onAccessibilityAction={onAccessibilityAction} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function SectionHeader({ label }: { label: string }) {
  return (
    <AppText variant="body" weight="semibold" color="muted" style={styles.sectionHeader}>
      {label}
    </AppText>
  );
}

// Group of rows on one white card, with dividers
export function RowCard({ children }: { children: ReactNode[] }) {
  return (
    <View style={styles.card}>
      {children.map((child, index) => (
        <View key={index} style={index > 0 && styles.divider}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function OfflineBanner({ body }: { body: string }) {
  return (
    <View style={styles.offline} accessibilityRole="alert">
      <WifiOff size={size.icon - spacing.xs} color={colors.warningInk} strokeWidth={size.iconStroke} />
      <View style={styles.flex}>
        <AppText variant="label" weight="bold" color="warningInk">
          {t('offline.title')}
        </AppText>
        <AppText variant="body" color="warningInk">
          {body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.ground,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    lineHeight: size.titleLine,
  },
  progressBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: size.progress,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: 'hidden',
    alignItems: 'flex-start', // fills from the start side
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  row: {
    minHeight: size.toast + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  rowHighlight: {
    backgroundColor: colors.accentTint,
  },
  check: {
    width: size.checkbox + spacing.sm,
    height: size.checkbox + spacing.sm,
    borderRadius: radius.pill,
    borderWidth: size.borderThick,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  qtyPill: {
    minHeight: size.qtyPill + spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyPillLight: {
    backgroundColor: colors.surface,
  },
  swipeWrap: {
    overflow: 'hidden',
  },
  swipePanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  swipeBought: {
    backgroundColor: colors.success,
  },
  swipeNotFound: {
    backgroundColor: colors.accent,
  },
  swipeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    opacity: opacity.skeleton,
  },
  swipeLabelArmed: {
    opacity: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  offline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.warningLine,
    backgroundColor: colors.warningTint,
  },
});
