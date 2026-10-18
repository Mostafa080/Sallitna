import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { getLanguage, tIn, type Language } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, motion, radius, size, spacing } from '@/theme';

type Props = {
  bottomOffset: number; // distance from the screen bottom (e.g. above the bottom bar)
  language?: Language; // the helper's screen shows "Undo" in their language
};

// Dark bar that confirms the last change, with "undo" when it can be reversed.
export function UndoToast({ bottomOffset, language = getLanguage() }: Props) {
  const { toast, undo, dismissToast } = useList();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, motion.toastDuration);
    return () => clearTimeout(timer);
    // Restart the timer for every new toast
  }, [toast?.id]);

  if (!toast) return null;

  const onUndo = () => {
    Haptics.selectionAsync();
    undo();
  };

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(motion.normal)}
      exiting={FadeOutDown.duration(motion.fast)}
      style={[styles.toast, { bottom: bottomOffset }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <AppText variant="body" color="onDark" style={styles.message} numberOfLines={2}>
        {toast.message}
      </AppText>
      {toast.undo && (
        <Pressable onPress={onUndo} style={styles.undo} accessibilityRole="button">
          <AppText variant="label" weight="bold" color="accent">
            {tIn(language, 'toast.undo')}
          </AppText>
        </Pressable>
      )}
      {!toast.undo && <View style={styles.spacer} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    start: spacing.lg,
    end: spacing.lg,
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingStart: spacing.xl,
    paddingEnd: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
  },
  message: {
    flex: 1,
  },
  undo: {
    minHeight: size.control,
    minWidth: size.control,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    backgroundColor: colors.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    height: size.control,
  },
});
