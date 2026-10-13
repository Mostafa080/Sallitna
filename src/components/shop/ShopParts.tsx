import * as Haptics from 'expo-haptics';
import { Check, ChevronLeft, ChevronRight, WifiOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import type { Item } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { isRTLLayout } from '@/lib/direction';
import { formatQuantity } from '@/lib/format';
import { colors, radius, size, spacing } from '@/theme';

const BackIcon = isRTLLayout ? ChevronRight : ChevronLeft;
const CHECK_HIT_SLOP = (size.touch - size.checkbox) / 2;

// Dark rounded header of the shopping screens
type HeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onTitleLongPress?: () => void;
  badge?: ReactNode; // shown on the end side of the top row
  children?: ReactNode; // progress, etc.
};

export function ShopHeader({ title, subtitle, onBack, onTitleLongPress, badge, children }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('shop.back')}>
          <BackIcon size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke} />
        </Pressable>
        {badge}
      </View>
      <Pressable onLongPress={onTitleLongPress} accessibilityHint={onTitleLongPress ? t('shop.offlineA11y') : undefined}>
        <AppText variant="title" weight="bold" color="onDark" accessibilityRole="header">
          {title}
        </AppText>
      </Pressable>
      {subtitle && (
        <AppText variant="body" color="onDarkMuted">
          {subtitle}
        </AppText>
      )}
      {children}
    </View>
  );
}

// "● العائلة تدري إنك هنا"
export function LivePill() {
  return (
    <View style={styles.livePill}>
      <View style={styles.liveDot} />
      <AppText variant="body" color="onDark">
        {t('shop.familyKnows')}
      </AppText>
    </View>
  );
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressLabels}>
        <AppText variant="body" weight="bold" color="onDark">
          {t('shop.progress', { done, total })}
        </AppText>
        <AppText variant="body" color="onDarkMuted">
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
};

export function ShopRow({ item, subtitle, highlight, checked, onToggle, onLongPress, trailing }: RowProps) {
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
      accessibilityLabel={onToggle ? t(checked ? 'shop.uncartA11y' : 'shop.cartA11y', { name: item.name }) : item.name}>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
    borderBottomStartRadius: radius.card * 2,
    borderBottomEndRadius: radius.card * 2,
    backgroundColor: colors.darkGround,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    width: size.touch + spacing.xs,
    height: size.touch + spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.darkSurface,
  },
  liveDot: {
    width: size.liveDot - spacing.xxs,
    height: size.liveDot - spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.live,
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
    backgroundColor: colors.darkLine,
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
