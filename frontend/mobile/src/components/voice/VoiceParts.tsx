// Small building blocks shared by the voice screens.

import { Minus, Plus, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { household } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { colors, motion, opacity, radius, size, spacing } from '@/theme';

// "تضيف لقائمة · بيت أبو خالد" with a close button on the end side
export function VoiceHeader({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View>
        <AppText variant="body" color="onDarkMuted">
          {t('voice.addingTo')}
        </AppText>
        <AppText variant="heading" weight="bold" color="onDark">
          {household.name}
        </AppText>
      </View>
      <Pressable
        onPress={onClose}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel={t('voice.close')}>
        <X size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke} />
      </Pressable>
    </View>
  );
}

// Moving sound bars while listening
const BAR_PATTERN = [0.25, 0.4, 0.55, 0.8, 0.6, 1, 0.7, 0.85, 0.5, 0.35, 0.25];
const ACTIVE_BARS = new Set([3, 4, 5, 6, 7, 8]); // the loud middle bars are orange

function WaveBar({ index, active }: { index: number; active: boolean }) {
  const scale = useSharedValue(BAR_PATTERN[index]);

  useEffect(() => {
    if (!active) {
      scale.value = withTiming(0.2, { duration: motion.normal });
      return;
    }
    const duration = motion.fast + (index % 4) * 70;
    scale.value = withRepeat(
      withSequence(
        withTiming(BAR_PATTERN[index], { duration, easing: Easing.inOut(Easing.quad) }),
        withTiming(Math.max(0.15, BAR_PATTERN[index] * 0.35), { duration, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [active, index, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: ACTIVE_BARS.has(index) ? colors.accent : colors.onDarkMuted }, style]}
    />
  );
}

export function Waveform({ active }: { active: boolean }) {
  return (
    <View style={styles.wave} accessible={false}>
      {BAR_PATTERN.map((_, index) => (
        <WaveBar key={index} index={index} active={active} />
      ))}
    </View>
  );
}

// Orange arc spinning on a dark ring
export function Spinner() {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: motion.pulse, easing: Easing.linear }), -1);
  }, [rotation]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return <Animated.View style={[styles.spinner, style]} />;
}

// Coloured label on review cards: تحديث / جديد / تأكيد / حذف
type BadgeTone = 'info' | 'new' | 'ink' | 'danger';
const BADGE: Record<BadgeTone, { bg: keyof typeof colors; fg: keyof typeof colors }> = {
  info: { bg: 'info', fg: 'onDark' },
  new: { bg: 'accentTint', fg: 'accentInk' },
  ink: { bg: 'ink', fg: 'onDark' },
  danger: { bg: 'danger', fg: 'onDark' },
};

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors[BADGE[tone].bg] }]}>
      <AppText variant="meta" weight="semibold" color={BADGE[tone].fg}>
        {label}
      </AppText>
    </View>
  );
}

// "+ 1 كيس −" pill
type StepperProps = {
  label: string;
  canDecrease: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
};

export function Stepper({ label, canDecrease, onIncrease, onDecrease }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onIncrease} style={styles.stepButton} accessibilityRole="button" accessibilityLabel={t('detail.increase')}>
        <Plus size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
      </Pressable>
      <AppText variant="label" weight="bold" style={styles.stepValue} accessibilityLiveRegion="polite">
        {label}
      </AppText>
      <Pressable
        onPress={onDecrease}
        disabled={!canDecrease}
        style={[styles.stepButton, !canDecrease && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canDecrease }}
        accessibilityLabel={t('detail.decrease')}>
        <Minus size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  closeButton: {
    width: size.touch + spacing.sm,
    height: size.touch + spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    height: size.waveHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + spacing.xxs,
  },
  bar: {
    width: size.waveBar,
    height: size.waveHeight,
    borderRadius: radius.pill,
  },
  spinner: {
    width: size.spinner,
    height: size.spinner,
    borderRadius: radius.pill,
    borderWidth: size.spinnerStroke,
    borderColor: colors.darkSurface,
    borderTopColor: colors.accent,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.badge,
  },
  stepper: {
    height: size.control,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
  },
  stepButton: {
    width: size.touch,
    height: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: size.touch + spacing.xl,
    textAlign: 'center',
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
