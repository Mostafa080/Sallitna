import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { t } from '@/i18n';
import { colors, motion, opacity, radius, size, spacing } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

// Bottom sheet drawn inside the screen (not a native Modal), so it keeps the app's RTL layout.
export function Sheet({ visible, onClose, title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        entering={FadeIn.duration(motion.normal)}
        exiting={FadeOut.duration(motion.fast)}
        style={StyleSheet.absoluteFill}>
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('voice.close')}
        />
      </Animated.View>

      {/* Rises above the keyboard when the sheet has a text field (e.g. renaming a list) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}
        pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(motion.normal)}
          exiting={SlideOutDown.duration(motion.fast)}
          style={[
            styles.sheet,
            { maxHeight: height - insets.top - spacing.xl, paddingBottom: insets.bottom + spacing.sm },
          ]}
          accessibilityViewIsModal>
          <View style={styles.handle} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {title && (
              <View>
                <AppText variant="title" weight="bold" accessibilityRole="header">
                  {title}
                </AppText>
                {subtitle && (
                  <AppText variant="label" color="muted">
                    {subtitle}
                  </AppText>
                )}
              </View>
            )}
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

type RadioCardProps = {
  title: string;
  body?: string;
  selected: boolean;
  onPress: () => void;
  multiple?: boolean; // part of a pick-several list (checkbox instead of radio)
};

// Option card with a radio circle on the start side
export function RadioCard({ title, body, selected, onPress, multiple }: RadioCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.radioCard, selected ? styles.radioCardSelected : styles.radioCardIdle]}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={multiple ? { checked: selected } : { selected }}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.flex}>
        <AppText variant="item" weight="bold">
          {title}
        </AppText>
        {body && (
          <AppText variant="body" color="muted">
            {body}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'ink' | 'accent' | 'outline' | 'link' | 'danger'; // danger: can't be undone («احذف حسابي»)
  disabled?: boolean;
};

export function SheetButton({ label, onPress, tone = 'ink', disabled }: ButtonProps) {
  const textColor = tone === 'ink' || tone === 'danger' ? 'onDark' : tone === 'accent' ? 'onAccent' : 'ink';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[tone], disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}>
      <AppText variant={tone === 'link' ? 'label' : 'item'} weight="bold" color={textColor}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyboardArea: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  flex: {
    flex: 1,
  },
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
  },
  sheet: {
    // Sits at the bottom of the keyboard-aware area (which rises when the keyboard opens)
    paddingTop: spacing.md,
    borderTopStartRadius: radius.card * 2,
    borderTopEndRadius: radius.card * 2,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: size.sheetHandle,
    height: spacing.xs + spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1, // long content scrolls; the footer buttons stay visible
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  radioCard: {
    minHeight: size.toast + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  radioCardSelected: {
    borderWidth: size.borderThick,
    borderColor: colors.accent,
  },
  radioCardIdle: {
    borderWidth: size.border,
    borderColor: colors.line,
  },
  radio: {
    width: size.radio,
    height: size.radio,
    borderRadius: radius.pill,
    borderWidth: size.borderThick,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  radioDot: {
    width: size.radio / 3,
    height: size.radio / 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  button: {
    minHeight: size.button + spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  ink: {
    backgroundColor: colors.accent,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  outline: {
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  link: {
    minHeight: size.touch + spacing.sm,
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
