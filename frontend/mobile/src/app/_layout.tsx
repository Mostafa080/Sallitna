import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { PasswordGate } from '@/components/PasswordGate';
import { PushSetup } from '@/components/PushSetup';
import { UpdateGate } from '@/components/UpdateGate';
import { ListProvider } from '@/store/ListStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Arabic-first: always lay out right-to-left.
// Real builds get this from the `forcesRTL` option in app.json. Expo Go ignores that,
// so the root view below also sets direction: 'rtl' to keep layouts correct there.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Norsal (Arabic + Latin): fixed weights cut from the variable font in /Resources/Fonts/norsal
    'Norsal-Regular': require('../../assets/fonts/Norsal-Regular.ttf'),
    'Norsal-Medium': require('../../assets/fonts/Norsal-Medium.ttf'),
    'Norsal-SemiBold': require('../../assets/fonts/Norsal-SemiBold.ttf'),
    'Norsal-Bold': require('../../assets/fonts/Norsal-Bold.ttf'),
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
  });

  // The phone's splash stays until the animated one (components/AnimatedSplash.tsx) has its logo ready; if the
  // fonts fail, show the app anyway
  useEffect(() => {
    if (fontError) SplashScreen.hideAsync();
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <ListProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
            {/* «قوايمي» · «بالسوق» · «حسابي» — everything else opens over the tabs */}
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="voice" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="trip-done" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="invite-expired" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="helper" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="notifications" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            {/* Making a password can't be swiped away (changing it from «حسابي» has a back button) */}
            <Stack.Screen
              name="set-password"
              options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
            />
            {/* Sign-up and joining: each step opens over the last, and finishing closes them all */}
            {['welcome', 'verify', 'about-you', 'first-list', 'new-list', 'setup-invite', 'join', 'join-setup'].map((name) => (
              <Stack.Screen
                key={name}
                name={name}
                // Welcome can't be swiped away: there's nothing behind it until you sign in
                options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: name !== 'welcome' }}
              />
            ))}
          </Stack>
          <PasswordGate />
          <PushSetup />
          <UpdateGate />
          <AnimatedSplash />
        </ListProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    direction: 'rtl',
    backgroundColor: colors.ground,
  },
});
