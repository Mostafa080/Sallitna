// Push notifications, app-wide (in the root layout, next to PasswordGate):
// • once signed in to a list, asks for permission (first time only) and saves this phone's address;
// • tapping a notification opens the right list and screen — a question opens «رد على السؤال»,
//   news for the shopper opens «بالسوق», everything else the list.

import { useLastNotificationResponse } from 'expo-notifications';
import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import * as push from '@/lib/push';
import { useList } from '@/store/ListStore';

export function PushSetup() {
  const pathname = usePathname();
  const list = useList();
  const live = list.mode === 'live';
  const registered = useRef(false);

  // Ask / save once per sign-in (a new sign-in on this phone saves it again for the new person).
  // Not over the sign-in or password screens — iOS's «Allow notifications?» waits until the list is showing.
  const busySigningIn = pathname === '/verify' || pathname === '/set-password';
  useEffect(() => {
    if (list.mode === 'signedOut') registered.current = false;
    if (!live || busySigningIn || registered.current) return;
    registered.current = true;
    push.registerForPush().catch((error) => __DEV__ && console.warn('[push] register', error));
  }, [live, list.mode, busySigningIn]);

  // No notifications on the web version
  return Platform.OS === 'web' ? null : <OpenFromNotification />;
}

// Opened by tapping a notification
function OpenFromNotification() {
  const router = useRouter();
  const navigationReady = !!useRootNavigationState()?.key;
  const list = useList();
  const live = list.mode === 'live';
  const handled = useRef<string | null>(null);
  const response = useLastNotificationResponse();

  useEffect(() => {
    if (!response || !live || !navigationReady) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const data = (response.notification.request.content.data ?? {}) as push.PushData;
    (async () => {
      if (data.householdId && data.householdId !== list.householdId) await list.switchList(data.householdId);
      if (data.type === 'question' && data.questionId) {
        router.push({ pathname: '/answer', params: { id: data.questionId } });
      } else if (data.type === 'answer' || (data.type === 'items_added' && list.trip)) {
        router.navigate('/market'); // news for me while I'm shopping
      } else {
        router.navigate('/list');
      }
    })().catch((error) => __DEV__ && console.warn('[push] open', error));
  }, [response, live, navigationReady]);

  return null;
}
