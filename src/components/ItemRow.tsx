import * as Haptics from 'expo-haptics';
import { Check, Mic, Pencil, Trash2, User, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import type { Item, Member } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { startSign } from '@/lib/direction';
import { formatQuantity, formatRelativeTime } from '@/lib/format';
import { colors, motion, radius, size, spacing } from '@/theme';

type Props = {
  item: Item;
  members: Member[];
  currentMemberId: string;
  isNew: boolean;
  isOpen: boolean; // swipe actions showing
  onOpenChange: (open: boolean) => void;
  onPress: () => void;
  onCheck: () => void;
  onClaim: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const CHECKBOX_HIT_SLOP = (size.touch - size.checkbox) / 2;
const ACTIONS_WIDTH = size.swipeAction * 3;
const SWIPE_ACTIVATE = spacing.xl; // sideways travel before a row swipe starts
const SCROLL_WINS = spacing.sm; // vertical travel that hands the touch to the list scroll
const NEVER = 10_000; // offset that can't be reached — disables one direction
const FLING_VELOCITY = 600;

export function ItemRow({
  item,
  members,
  currentMemberId,
  isNew,
  isOpen,
  onOpenChange,
  onPress,
  onCheck,
  onClaim,
  onEdit,
  onDelete,
}: Props) {
  const [checked, setChecked] = useState(false);

  // --- Swipe to reveal actions -------------------------------------------
  // `reveal` is how much of the actions panel shows: 0 (closed) → ACTIONS_WIDTH (open)
  const reveal = useSharedValue(0);
  const revealAtStart = useSharedValue(0);

  useEffect(() => {
    reveal.value = withTiming(isOpen ? ACTIONS_WIDTH : 0, { duration: motion.fast });
  }, [isOpen, reveal]);

  const onSwipeEnd = (open: boolean) => {
    if (open) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenChange(open);
  };

  // Closed rows only react to a swipe toward the start side (that's the only way they can open),
  // so drags in any other direction are left to the list scroll.
  const openDirection: [number, number] =
    startSign > 0 ? [-NEVER, SWIPE_ACTIVATE] : [-SWIPE_ACTIVATE, NEVER];
  const pan = Gesture.Pan()
    .activeOffsetX(isOpen ? [-SWIPE_ACTIVATE, SWIPE_ACTIVATE] : openDirection)
    .failOffsetY([-SCROLL_WINS, SCROLL_WINS])
    .onStart(() => {
      revealAtStart.value = reveal.value;
    })
    .onUpdate((e) => {
      const next = revealAtStart.value + e.translationX * startSign;
      reveal.value = Math.min(Math.max(next, 0), ACTIONS_WIDTH);
    })
    .onEnd((e) => {
      const velocity = e.velocityX * startSign;
      const open = velocity > FLING_VELOCITY || (velocity > -FLING_VELOCITY && reveal.value > ACTIONS_WIDTH / 2);
      reveal.value = withTiming(open ? ACTIONS_WIDTH : 0, { duration: motion.fast });
      scheduleOnRN(onSwipeEnd, open);
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reveal.value * startSign }],
  }));

  // --- Taps ----------------------------------------------------------------
  const closeThen = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };

  const onRowPress = () => (isOpen ? onOpenChange(false) : onPress());

  const onCheckPress = () => {
    if (isOpen) return onOpenChange(false);
    if (checked) return;
    setChecked(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Let the tick show for a moment before the row leaves
    setTimeout(onCheck, motion.checkDelay);
  };

  // Screen readers can't swipe — offer the same actions through the actions menu
  const claimedByMe = item.claimed_by === currentMemberId;
  const accessibilityActions = [
    { name: 'claim', label: t(claimedByMe ? 'swipe.unclaim' : 'swipe.claim') },
    { name: 'edit', label: t('swipe.edit') },
    { name: 'delete', label: t('swipe.delete') },
  ];
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'claim') onClaim();
    if (e.nativeEvent.actionName === 'edit') onEdit();
    if (e.nativeEvent.actionName === 'delete') onDelete();
  };

  // --- Text ------------------------------------------------------------------
  const byId = (id: string) => members.find((m) => m.id === id);
  const requesters = item.requested_by.map(byId).filter((m): m is Member => !!m);
  const addedBy = byId(item.added_by);
  const claimer = item.claimed_by ? byId(item.claimed_by) : undefined;
  const sep = t('item.metaSeparator');

  const meta =
    requesters.length > 1
      ? t('item.requestedBy', { n: requesters.length }) + sep + t('item.merged')
      : (addedBy?.display_name ?? '') + sep + formatRelativeTime(item.created_at);

  const claimLabel = claimer
    ? claimedByMe
      ? t('item.claimedByMe')
      : t('item.claimedBy', { name: claimer.display_name })
    : null;

  return (
    <View style={styles.container}>
      {/* Actions sit behind the row, on the end side */}
      <View style={styles.actions}>
        <SwipeAction
          icon={User}
          label={t(claimedByMe ? 'swipe.unclaim' : 'swipe.claim')}
          color="info"
          onPress={closeThen(onClaim)}
        />
        <SwipeAction icon={Pencil} label={t('swipe.edit')} color="muted" onPress={closeThen(onEdit)} />
        <SwipeAction icon={Trash2} label={t('swipe.delete')} color="danger" onPress={closeThen(onDelete)} />
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.content, contentStyle]}>
          <Pressable
            onPress={onRowPress}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={t('home.openItemA11y', { name: item.name })}
            accessibilityActions={accessibilityActions}
            onAccessibilityAction={onAccessibilityAction}>
            <Pressable
              onPress={onCheckPress}
              hitSlop={CHECKBOX_HIT_SLOP}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={t('home.markBoughtA11y', { name: item.name })}
              style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Check size={size.iconSmall} color={colors.onDark} strokeWidth={size.iconStroke + 1} />}
            </Pressable>

            <View style={styles.body}>
              <View style={styles.nameLine}>
                <AppText variant="item" weight="semibold" numberOfLines={1} style={styles.name}>
                  {item.name}
                </AppText>
                {isNew && (
                  <View style={styles.newBadge}>
                    <AppText variant="meta" weight="medium" color="accentInk">
                      {t('item.new')}
                    </AppText>
                  </View>
                )}
              </View>

              <View style={styles.metaLine}>
                {requesters.length > 1 ? (
                  <AvatarStack members={requesters} small ring="surface" />
                ) : (
                  item.added_via === 'voice' && (
                    <Mic
                      size={size.iconSmall}
                      color={colors.muted}
                      strokeWidth={size.iconStroke}
                      accessibilityLabel={t('item.addedByVoiceA11y')}
                    />
                  )
                )}
                <AppText variant="meta" color="muted" numberOfLines={1} style={styles.metaText}>
                  {meta}
                  {claimLabel && (
                    <AppText variant="meta" weight="semibold" color="info">
                      {sep + claimLabel}
                    </AppText>
                  )}
                </AppText>
              </View>
            </View>

            <View style={styles.qtyPill}>
              <AppText variant="body" weight="bold">
                {formatQuantity(item.qty, item.unit)}
              </AppText>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

type SwipeActionProps = {
  icon: LucideIcon;
  label: string;
  color: keyof typeof colors;
  onPress: () => void;
};

function SwipeAction({ icon: Icon, label, color, onPress }: SwipeActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, { backgroundColor: colors[color] }]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Icon size={size.icon - spacing.xs} color={colors.onDark} strokeWidth={size.iconStroke} />
      <AppText variant="meta" weight="semibold" color="onDark" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  actions: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    end: 0,
    width: ACTIONS_WIDTH,
    flexDirection: 'row',
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  content: {
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: size.touch + spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  checkbox: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: radius.pill,
    borderWidth: size.borderThick,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: colors.accentTint,
    borderRadius: radius.badge,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    flexShrink: 1,
  },
  qtyPill: {
    minHeight: size.qtyPill,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
