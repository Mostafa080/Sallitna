// «حدّث سلّتنا» — covers the whole app when this version is older than the oldest one still allowed
// (public.app_config.min_version). Checked at launch and whenever the app comes back to the front.
// Offline or not set: nothing shows.

import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Brand } from '@/components/onboarding/OnboardingParts';
import { SheetButton } from '@/components/shop/Sheet';
import { t } from '@/i18n';
import { appVersion, isOlderThan, loadAppConfig } from '@/lib/appVersion';
import { colors, size, spacing } from '@/theme';

// Until the store pages exist, the website explains where to get the app
const FALLBACK_URL = 'https://sallitna.online';

export function UpdateGate() {
  const insets = useSafeAreaInsets();
  const [storeUrl, setStoreUrl] = useState<string | null>(null); // set = this version must update

  useEffect(() => {
    const check = () =>
      loadAppConfig()
        .then((config) => {
          if (!config || !isOlderThan(appVersion, config.minVersion)) return setStoreUrl(null);
          const url = Platform.OS === 'android' ? config.androidStoreUrl : config.iosStoreUrl;
          setStoreUrl(url ?? FALLBACK_URL);
        })
        .catch(() => {});
    check();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => subscription.remove();
  }, []);

  if (!storeUrl) return null;

  return (
    <View
      style={[styles.cover, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.sm }]}
      accessibilityViewIsModal>
      <Brand />
      <View style={styles.text}>
        <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
          {t('update.title')}
        </AppText>
        <AppText variant="item" color="muted">
          {t('update.body')}
        </AppText>
      </View>
      <SheetButton label={t('update.button')} onPress={() => Linking.openURL(storeUrl).catch(() => {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: colors.ground,
  },
  text: {
    gap: spacing.md,
  },
  title: {
    lineHeight: size.titleLine,
  },
});
