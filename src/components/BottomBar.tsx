import { Keyboard, Mic, ShoppingCart, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { t } from '@/i18n';
import { colors, radius, shadow, size, spacing } from '@/theme';

// Height of the bar above the safe area — the screen uses it to pad its list.
export const BOTTOM_BAR_HEIGHT = size.micRing + spacing.xxxl;

type SideActionProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

function SideAction({ icon: Icon, label, onPress }: SideActionProps) {
  return (
    <Pressable onPress={onPress} style={styles.side} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={size.icon + spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
      <AppText variant="label" weight="medium">
        {label}
      </AppText>
    </Pressable>
  );
}

type Props = {
  onAtStore: () => void;
  onTalk: () => void;
  onLongTalk?: () => void;
  onType: () => void;
};

// Order is start → end: in RTL "at the store" sits on the right, "type" on the left.
export function BottomBar({ onAtStore, onTalk, onLongTalk, onType }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
      <SideAction icon={ShoppingCart} label={t('bottomBar.atStore')} onPress={onAtStore} />

      <Pressable
        onPress={onTalk}
        onLongPress={onLongTalk}
        style={styles.center}
        accessibilityRole="button"
        accessibilityLabel={t('bottomBar.talk')}>
        <View style={styles.micRing}>
          <View style={styles.micButton}>
            <Mic size={size.icon + spacing.md} color={colors.onDark} strokeWidth={size.iconStroke} />
          </View>
        </View>
        <AppText variant="label" weight="bold">
          {t('bottomBar.talk')}
        </AppText>
      </Pressable>

      <SideAction icon={Keyboard} label={t('bottomBar.type')} onPress={onType} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderTopWidth: size.border,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  side: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: size.touch,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    // Lift the mic so its ring sits on the bar's top edge
    marginTop: -(size.micRing / 2 + spacing.sm),
  },
  micRing: {
    width: size.micRing,
    height: size.micRing,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.floating,
  },
  micButton: {
    width: size.micButton,
    height: size.micButton,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
