// Push notifications on this phone: permission, its Expo push address (saved for the signed-in person),
// and telling the `notify` Edge Function what just happened (backend/supabase/functions/notify), which decides
// who hears about it. Nothing secret here: the function checks everything against the database.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type PushEvent =
  | { type: 'trip_started'; tripId: string }
  | { type: 'trip_done'; tripId: string; bought: number; notFound: number }
  | { type: 'question'; questionId: string }
  | { type: 'answer'; questionId: string }
  | { type: 'items_added'; itemIds: string[] };

// What a notification carries (set by the function) — used to open the right screen when it's tapped
export type PushData = { type?: PushEvent['type']; householdId?: string; questionId?: string };

// 'unavailable': web, a simulator, Expo Go on Android, or the app isn't linked to Expo yet (no project id)
export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const TOKEN_KEY = 'sallitna.pushToken';

const supported = Platform.OS !== 'web' && Device.isDevice && !(Platform.OS === 'android' && isRunningInExpoGo());
const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// While the app is open, the screen already updates live — only a question / answer also shows a banner,
// since someone is waiting for it
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = (notification.request.content.data as PushData | undefined)?.type;
      const show = type === 'question' || type === 'answer';
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
}

export async function pushStatus(): Promise<PushStatus> {
  if (!supported) return 'unavailable';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

// Ask once (iOS shows «Allow notifications?»), then save this phone's address for the signed-in person
export async function registerForPush(): Promise<PushStatus> {
  if (!supported) return 'unavailable';
  let { status } = await Notifications.getPermissionsAsync();
  if (status === 'undetermined') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return status === 'denied' ? 'denied' : 'undetermined';
  if (!projectId) {
    if (__DEV__) console.warn('[push] No Expo project id — run `npx eas-cli init` in frontend/mobile');
    return 'unavailable';
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Sallitna',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('save_push_token', {
    push_token: token,
    device_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    device_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  });
  if (error) throw new Error(error.message);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return 'granted';
}

// Signing out: this phone stops getting my notifications (must run while still signed in)
export async function forgetPush() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.rpc('forget_push_token', { push_token: token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    if (__DEV__) console.warn('[push] forget', error);
  }
}

// iPhone Settings → Sallitna (to turn notifications back on)
export const openPushSettings = () => Linking.openSettings();

// Tell the function what just happened. Never blocks or fails the action itself.
export function notify(event: PushEvent) {
  supabase.functions
    .invoke('notify', { body: event })
    .then(({ error }) => {
      if (error && __DEV__) console.warn('[push] notify', event.type, error.message);
    })
    .catch(() => {});
}
