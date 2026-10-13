import { ShoppingCart } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { Member } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { colors, radius, size, spacing } from '@/theme';

type Props = {
  shopper: Member;
  self?: boolean; // this phone's member is the one shopping
  onPress?: () => void;
};

// "Sara is at the store now" — shown while someone is in shopper mode.
export function ShopperBanner({ shopper, self, onPress }: Props) {
  const g = shopper.gender;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.banner}
      accessibilityRole={onPress ? 'button' : 'summary'}>
      <View style={styles.iconCircle}>
        <ShoppingCart size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
        <View style={styles.liveDot} />
      </View>
      <View style={styles.text}>
        <AppText variant="label" weight="semibold">
          {self ? t(`banner.selfAtStore_${g}`) : t(`banner.atStore_${g}`, { name: shopper.display_name })}
        </AppText>
        <AppText variant="body" color="muted" numberOfLines={1}>
          {self ? t(`banner.selfHint_${g}`) : t(`banner.hint_${g}`)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentTint,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: size.bannerIcon,
    height: size.bannerIcon,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    position: 'absolute',
    top: -spacing.xxs,
    end: -spacing.xxs,
    width: size.liveDot,
    height: size.liveDot,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    borderWidth: size.borderThick,
    borderColor: colors.accentTint,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
});
