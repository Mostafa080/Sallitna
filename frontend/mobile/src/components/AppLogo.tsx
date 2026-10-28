// The app icon (the cat with the basket) as a small rounded logo: next to «سلّتنا», and on the notification preview.

import { Image, StyleSheet } from 'react-native';

import { radius, size } from '@/theme';

const logo = require('../../assets/images/logo.png');

export function AppLogo({ small }: { small?: boolean }) {
  return (
    <Image
      source={logo}
      style={[styles.logo, small && styles.small]}
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: size.bannerIcon,
    height: size.bannerIcon,
    borderRadius: radius.control,
  },
  small: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.badge,
  },
});
