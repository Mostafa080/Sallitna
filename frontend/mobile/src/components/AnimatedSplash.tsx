// The splash screen inside the app. The phone's own splash (just the logo on the app's background, app.json) stays
// until this logo is ready to draw (or 1.5 s, whichever first), then this one carries on from the same spot — the logo pops, then breathes while the app
// loads (sign-in and lists) — and fades away into the app. It stays at least MIN_SHOWN_MS so it's seen, even
// when everything is already ready.

import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { t } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, motion, spacing } from '@/theme';

const logo = require('../../assets/images/splash-icon.png');

// Same size as the phone's own splash (imageWidth in app.json), so the hand-over doesn't jump
const LOGO_SIZE = 160;
const MIN_SHOWN_MS = 1500;
const FADE_OUT_MS = 380;

export function AnimatedSplash() {
  const { mode } = useList();
  const reduceMotion = useReducedMotion();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [gone, setGone] = useState(false);
  const ready = mode !== 'loading' && minTimePassed;

  const pop = useSharedValue(1); // the logo
  const breathe = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const cover = useSharedValue(1); // the whole splash

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_SHOWN_MS);
    const failsafe = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 1500); // never stuck on the phone's splash
    if (reduceMotion) {
      textOpacity.value = 1;
    } else {
      // A little pop (starts at the size of the phone's splash), then a slow breath until the app is ready
      pop.value = withSequence(withTiming(1.12, { duration: 220, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 7, stiffness: 160 }));
      breathe.value = withDelay(
        700,
        withRepeat(withSequence(withTiming(1.04, { duration: 650 }), withTiming(1, { duration: 650 })), -1),
      );
      textOpacity.value = withDelay(250, withTiming(1, { duration: motion.normal * 2 }));
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(failsafe);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    cover.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
      if (finished) runOnJS(setGone)(true);
    });
  }, [ready]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value * breathe.value * (1 + (1 - cover.value) * 0.08) }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  if (gone) return null;

  return (
    <Animated.View style={[styles.cover, coverStyle]} pointerEvents={ready ? 'none' : 'auto'} accessibilityElementsHidden>
      <Animated.View style={logoStyle}>
        <Image
          source={logo}
          style={styles.logo}
          accessibilityIgnoresInvertColors
          onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
        />
      </Animated.View>
      <Animated.View style={[styles.name, textStyle]}>
        <AppText variant="title" weight="bold">
          {t('onboarding.appName')}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ground,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  name: {
    position: 'absolute',
    top: '50%',
    marginTop: LOGO_SIZE / 2 + spacing.xl,
  },
});
