// The two microphone-access screens: asking for the mic, and the mic being blocked.

import { ChevronLeft, ChevronRight, Keyboard, Lock, Mic, MicOff, Trash2, X, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { t } from '@/i18n';
import { isRTLLayout } from '@/lib/direction';
import { colors, radius, size, spacing } from '@/theme';

const BackIcon = isRTLLayout ? ChevronRight : ChevronLeft;

type Footer = {
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
};

function FooterButtons({ primary, onPrimary, secondary, onSecondary }: Footer) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
      <Pressable onPress={onPrimary} style={styles.primaryButton} accessibilityRole="button">
        <AppText variant="item" weight="bold" color="onDark">
          {primary}
        </AppText>
      </Pressable>
      <Pressable onPress={onSecondary} style={styles.linkButton} accessibilityRole="button">
        <AppText variant="label" weight="semibold">
          {secondary}
        </AppText>
      </Pressable>
    </View>
  );
}

function Row({ icon: Icon, label, last }: { icon: LucideIcon; label: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Icon size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
      </View>
      <AppText variant="label" style={styles.flex}>
        {label}
      </AppText>
    </View>
  );
}

type PermissionProps = {
  onAllow: () => void;
  onLater: () => void;
};

export function MicPermissionView({ onAllow, onLater }: PermissionProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={onLater} style={styles.circleButton} accessibilityRole="button" accessibilityLabel={t('detail.back')}>
          <BackIcon size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.micHalo}>
          <View style={styles.micCircle}>
            <Mic size={size.icon * 2} color={colors.onDark} strokeWidth={size.iconStroke} />
          </View>
        </View>
        <AppText variant="title" weight="bold" style={styles.center} accessibilityRole="header">
          {t('voice.permission.title')}
        </AppText>
        <AppText variant="item" color="muted" style={styles.center}>
          {t('voice.permission.body')}
        </AppText>
        <View style={styles.card}>
          <Row icon={Lock} label={t('voice.permission.noBackground')} />
          <Row icon={Trash2} label={t('voice.permission.deleted')} />
          <Row icon={Keyboard} label={t('voice.permission.typeAnytime')} last />
        </View>
      </ScrollView>
      <FooterButtons
        primary={t('voice.permission.allow')}
        onPrimary={onAllow}
        secondary={t('voice.permission.later')}
        onSecondary={onLater}
      />
    </View>
  );
}

type DeniedProps = {
  onOpenSettings: () => void;
  onType: () => void;
  onClose: () => void;
};

export function MicDeniedView({ onOpenSettings, onType, onClose }: DeniedProps) {
  const insets = useSafeAreaInsets();
  const steps = [t('voice.denied.step1'), t('voice.denied.step2'), t('voice.denied.step3')];

  return (
    <View style={styles.screen}>
      <View style={[styles.topBarEnd, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={onClose} style={styles.circleButton} accessibilityRole="button" accessibilityLabel={t('voice.close')}>
          <X size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.offCircle}>
          <MicOff size={size.icon * 2} color={colors.muted} strokeWidth={size.iconStroke} />
        </View>
        <AppText variant="title" weight="bold" style={styles.center} accessibilityRole="header">
          {t('voice.denied.title')}
        </AppText>
        <AppText variant="item" color="muted" style={styles.center}>
          {t('voice.denied.body')}
        </AppText>
        <View style={styles.card}>
          {steps.map((step, index) => (
            <View key={step} style={[styles.row, index < steps.length - 1 && styles.rowDivider]}>
              <View style={styles.stepNumber}>
                <AppText variant="body" weight="bold" color="onDark">
                  {String(index + 1)}
                </AppText>
              </View>
              <AppText variant="label" style={styles.flex}>
                {step}
              </AppText>
              {index === steps.length - 1 && (
                // Picture of the iOS switch, so people know what to look for
                <View style={styles.toggle} accessible={false}>
                  <View style={styles.toggleKnob} />
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <FooterButtons
        primary={t('voice.denied.openSettings')}
        onPrimary={onOpenSettings}
        secondary={t('voice.denied.typeInstead')}
        onSecondary={onType}
      />
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
  center: {
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
  },
  topBarEnd: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
  },
  circleButton: {
    width: size.touch + spacing.sm,
    height: size.touch + spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  micHalo: {
    alignSelf: 'center',
    width: size.voiceRing,
    height: size.voiceRing,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  micCircle: {
    width: size.voiceMic,
    height: size.voiceMic,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offCircle: {
    alignSelf: 'center',
    width: size.voiceMic,
    height: size.voiceMic,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card + spacing.sm,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: size.border,
    borderBottomColor: colors.line,
  },
  rowIcon: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: size.toggleWidth,
    height: size.toggleHeight,
    padding: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    // Knob on the end side, as drawn in mic-denied.png
    alignItems: 'flex-end',
  },
  toggleKnob: {
    width: size.toggleHeight - spacing.xs,
    height: size.toggleHeight - spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  primaryButton: {
    height: size.button + spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButton: {
    minHeight: size.touch + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
