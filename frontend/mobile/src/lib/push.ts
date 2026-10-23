// Push notifications on this phone: permission, its Expo push address (saved for the signed-in person),
// and telling the `notify` Edge Function what just happened (backend/supabase/functions/notify), which decides
// who hears about it. Nothing secret here: the function checks everything against the database.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse } from 'expo-notifications';
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

// Only loaded when this build of the app has notifications inside it. Expo Go does; a development build made
// before notifications were added doesn't — then the app works as before, just without notifications.
const Notifications: typeof import('expo-notifications') | null =
  Platform.OS !== 'web' && requireOptionalNativeModule('ExpoPushTokenManager') ? require('expo-notifications') : null;

const supported =
  !!Notifications && Device.isDevice && !(Platform.OS === 'android' && isRunningInExpoGo());
const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// While the app is open, the screen already updates live — only a question / answer also shows a banner,
// since someone is waiting for it
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = (notification.request.content.data as PushData | undefined)?.type;
      const show = type === 'question' || type === 'answer';
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
}

export async function pushStatus(): Promise<PushStatus> {
  if (!supported || !Notifications) return 'unavailable';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

// Ask once (iOS shows «Allow notifications?»), then save this phone's address for the signed-in person
export async function registerForPush(): Promise<PushStatus> {
  if (!supported || !Notifications) return 'unavailable';
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

// A notification was tapped: now (the app was open or in the background) or to open the app (cold start)
export function watchOpenedNotifications(open: (data: PushData, id: string) => void) {
  if (!Notifications) return () => {};
  const handle = (response: NotificationResponse | null) => {
    if (!response) return;
    open((response.notification.request.content.data ?? {}) as PushData, response.notification.request.identifier);
  };
  handle(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
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
