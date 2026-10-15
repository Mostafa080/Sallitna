// Swipe a row to act — shared by the shopping list and the helper's list.
// Physical directions (as agreed): swipe LEFT → green «bought», swipe RIGHT → orange «not found».
// Let go past the threshold (or flick) to act; a short drag springs back; a light tap when it's far enough.

import * as Haptics from 'expo-haptics';
import { Check, SearchX } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/AppText';
import { colors, motion, opacity, size, spacing } from '@/theme';

const SWIPE_THRESHOLD = size.swipeAction * 1.5; // how far to drag before letting go acts
const SWIPE_ACTIVATE = spacing.xl; // sideways travel before a row swipe starts
const SCROLL_WINS = spacing.sm; // vertical travel that hands the touch to the list scroll
const FLING_VELOCITY = 800;

type Props = {
  boughtLabel: string;
  notFoundLabel: string;
  onBought: () => void;
  onNotFound: () => void;
  children: ReactNode;
};

export function SwipeActions({ boughtLabel, notFoundLabel, onBought, onNotFound, children }: Props) {
  const offset = useSharedValue(0); // physical: negative = moved left
  const [armed, setArmed] = useState<'bought' | 'notFound' | null>(null);

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

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.panel, styles.bought, boughtStyle]}>
        <View style={[styles.label, armed === 'bought' && styles.labelArmed]}>
          <Check size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke + 1} />
          <AppText variant="body" weight="bold" color="onDark">
            {boughtLabel}
          </AppText>
        </View>
      </Animated.View>
      <Animated.View style={[styles.panel, styles.notFound, notFoundStyle]}>
        <View style={[styles.label, armed === 'notFound' && styles.labelArmed]}>
          <SearchX size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke} />
          <AppText variant="body" weight="bold" color="onDark">
            {notFoundLabel}
          </AppText>
        </View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  // Panels are laid out left-to-right in every language, so each label sits on the physical side
  // the row moves away from; the row itself keeps the screen's direction
  panel: {
    direction: 'ltr',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  // A left swipe uncovers the right edge, a right swipe the left edge
  bought: {
    justifyContent: 'flex-end',
    backgroundColor: colors.success,
  },
  notFound: {
    justifyContent: 'flex-start',
    backgroundColor: colors.accent,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    opacity: opacity.skeleton,
  },
  labelArmed: {
    opacity: 1,
  },
});
