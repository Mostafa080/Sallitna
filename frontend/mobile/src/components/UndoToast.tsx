import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { getLanguage, tIn, type Language } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, motion, radius, size, spacing } from '@/theme';

type Props = {
  language?: Language; // the helper's screen shows "Undo" in their language
};

// Dark bar at the top of the screen (under the status bar, where it's seen first) that confirms the last change,
// with "undo" when it can be reversed. Put it last in the screen so it sits over everything.
export function UndoToast({ language = getLanguage() }: Props) {
  const { toast, undo, dismissToast } = useList();
  const insets = useSafeAreaInsets();

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
      entering={FadeInUp.duration(motion.normal)}
      exiting={FadeOutUp.duration(motion.fast)}
      style={[styles.toast, { top: insets.top + spacing.sm }]}
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
    zIndex: 100, // over headers and cards
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
