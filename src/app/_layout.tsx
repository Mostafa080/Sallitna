import {
  ReadexPro_400Regular,
  ReadexPro_500Medium,
  ReadexPro_600SemiBold,
  ReadexPro_700Bold,
  useFonts,
} from '@expo-google-fonts/readex-pro';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    ReadexPro_400Regular,
    ReadexPro_500Medium,
    ReadexPro_600SemiBold,
    ReadexPro_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <ListProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
            <Stack.Screen name="add" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="voice" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen
              name="start-trip"
              options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen name="shop" options={{ animation: 'fade' }} />
            <Stack.Screen name="trip-done" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="invite-expired" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="helper" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="notifications" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            {/* Sign-up and joining: each step opens over the last, and finishing closes them all */}
            {['welcome', 'verify', 'household-setup', 'setup-invite', 'join', 'join-setup'].map((name) => (
              <Stack.Screen key={name} name={name} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            ))}
          </Stack>
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
