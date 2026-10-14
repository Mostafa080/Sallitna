// Small building blocks shared by the family screens (members, member detail, invite, settings).

import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { RadioCard, Sheet, SheetButton } from '@/components/shop/Sheet';
import { t } from '@/i18n';
import { isRTLLayout } from '@/lib/direction';
import { colors, radius, size, spacing } from '@/theme';

// Back points to the start side, "go into" points to the end side
export const BackIcon = isRTLLayout ? ChevronRight : ChevronLeft;
export const ForwardIcon = isRTLLayout ? ChevronLeft : ChevronRight;

// --- Round header button ---------------------------------------------------------

type CircleButtonProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

export function CircleButton({ icon: Icon, label, onPress }: CircleButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.circleButton} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
    </Pressable>
  );
}

// --- White card with divided rows ---------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="label" weight="semibold" color="muted" style={styles.sectionLabel}>
      {children}
    </AppText>
  );
}

type RowProps = {
  title: string;
  body?: string;
  value?: string; // shown on the end side, before the chevron
  onPress?: () => void;
  tone?: 'ink' | 'danger';
  divider?: boolean; // line above (every row but the first)
  end?: ReactNode; // custom end-side content (a switch, a pill…)
  accessibilityLabel?: string;
};

// A settings-style row: title (+ body) on the start side, value / chevron / switch on the end side
export function Row({ title, body, value, onPress, tone = 'ink', divider, end, accessibilityLabel }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, divider && styles.divider]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}>
      {/* With a value, the title keeps its width and a long value gets cut short instead */}
      <View style={value ? styles.titleWithValue : styles.flex}>
        <AppText variant="item" weight={tone === 'danger' ? 'semibold' : 'regular'} color={tone}>
          {title}
        </AppText>
        {body && (
          <AppText variant="body" color="muted">
            {body}
          </AppText>
        )}
      </View>
      {value && (
        <AppText variant="item" color="muted" style={styles.value} numberOfLines={1}>
          {value}
        </AppText>
      )}
      {end}
      {onPress && !end && tone !== 'danger' && (
        <ForwardIcon size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />
      )}
    </Pressable>
  );
}

// --- On/off switch (knob on the end side when on, as in settings.png) ------------------

type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
};

export function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={spacing.sm}
      style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}>
      <View style={styles.knob} />
    </Pressable>
  );
}

// --- Status pill («في السوق», «انضم», «بانتظاره») ---------------------------------------

const pillTones = {
  accent: { backgroundColor: colors.accentTint, color: 'accentInk' },
  success: { backgroundColor: colors.success, color: 'onDark' },
  neutral: { backgroundColor: colors.line, color: 'ink' },
} as const;

export function StatusPill({ label, tone }: { label: string; tone: keyof typeof pillTones }) {
  return (
    <View style={[styles.pill, { backgroundColor: pillTones[tone].backgroundColor }]}>
      <AppText variant="body" weight="semibold" color={pillTones[tone].color}>
        {label}
      </AppText>
    </View>
  );
}

// --- Pick one / pick several from a bottom sheet ------------------------------------------

type OptionSheetProps<K extends string> = {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: { key: K; label: string }[];
  selected: K[];
  multiple?: boolean; // several can be picked; closes with "تم"
  onChange: (selected: K[]) => void;
  onClose: () => void;
};

export function OptionSheet<K extends string>({
  visible,
  title,
  subtitle,
  options,
  selected,
  multiple,
  onChange,
  onClose,
}: OptionSheetProps<K>) {
  const onPick = (key: K) => {
    if (!multiple) {
      onChange([key]);
      onClose();
      return;
    }
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    // Always keep at least one
    if (next.length > 0) onChange(next);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={multiple ? <SheetButton label={t('memberDetail.done')} onPress={onClose} /> : undefined}>
      <View style={styles.options} accessibilityRole={multiple ? undefined : 'radiogroup'}>
        {options.map((option) => (
          <RadioCard
            key={option.key}
            title={option.label}
            selected={selected.includes(option.key)}
            multiple={multiple}
            onPress={() => onPick(option.key)}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
  card: {
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card + spacing.xs,
    backgroundColor: colors.surface,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    marginBottom: -spacing.xs,
  },
  row: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  titleWithValue: {
    flexGrow: 1,
    flexShrink: 0,
  },
  value: {
    flexShrink: 1,
  },
  toggle: {
    width: size.toggleWidth,
    height: size.toggleHeight,
    padding: spacing.xxs,
    borderRadius: radius.pill,
  },
  toggleOn: {
    backgroundColor: colors.success,
    alignItems: 'flex-end',
  },
  toggleOff: {
    backgroundColor: colors.line,
    alignItems: 'flex-start',
  },
  knob: {
    width: size.toggleHeight - spacing.xs,
    height: size.toggleHeight - spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  options: {
    gap: spacing.md,
  },
});
