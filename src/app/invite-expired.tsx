// "رابط الدعوة انتهى" — what someone sees when they open an old invite link.
// Simulated: reached from the test menu (long-press the household name on Home).

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MessageCircle, ShoppingBasket, Unlink } from 'lucide-react-native';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { SheetButton } from '@/components/shop/Sheet';
import { INVITE_VALID_DAYS } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

export default function InviteExpiredScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const owner = list.members.find((m) => m.role === 'owner');

  const onAsk = () => {
    Haptics.selectionAsync();
    Share.share({ message: t('inviteExpired.message', { list: list.householdName }) });
  };

  // Creating a household needs sign-in (Supabase) — for now, go back to the list
  const onStartNew = () => {
    if (router.canGoBack()) router.back();
    list.notify(t('toast.comingSoon'));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <ShoppingBasket size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
        </View>
        <AppText variant="heading" weight="bold">
          {t('inviteExpired.appName')}
        </AppText>
      </View>

      <View style={styles.body}>
        <View style={styles.iconTile}>
          <Unlink size={size.icon * 2} color={colors.muted} strokeWidth={size.iconStroke} />
        </View>
        <AppText variant="title" weight="bold" style={styles.center} accessibilityRole="header">
          {t('inviteExpired.title')}
        </AppText>
        <AppText variant="item" color="muted" style={styles.center}>
          {t('inviteExpired.body', { n: INVITE_VALID_DAYS, name: owner?.display_name ?? '' })}
        </AppText>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={onAsk} style={styles.askButton} accessibilityRole="button">
          <MessageCircle size={size.icon} color={colors.onDark} strokeWidth={size.iconStroke} />
          <AppText variant="item" weight="bold" color="onDark">
            {t('inviteExpired.ask')}
          </AppText>
        </Pressable>
        <SheetButton label={t('inviteExpired.startNew')} tone="link" onPress={onStartNew} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.ground,
  },
  center: {
    textAlign: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: size.bannerIcon,
    height: size.bannerIcon,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  iconTile: {
    width: size.emptyIcon + spacing.lg,
    height: size.emptyIcon + spacing.lg,
    borderRadius: radius.card * 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  footer: {
    gap: spacing.xs,
  },
  askButton: {
    minHeight: size.button + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
});
