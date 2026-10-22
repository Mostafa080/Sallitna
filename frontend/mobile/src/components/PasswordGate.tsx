// Everyone needs a password. Someone signed in from before passwords gets «اعمل كلمة سر» (app/set-password.tsx)
// over whatever screen is open — on launch, and again whenever the app comes back to the front.
// Not on the sign-in screen (it asks for the password itself) or the password screen.

import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as api from '@/lib/api';
import { useList } from '@/store/ListStore';

const SKIP = ['/verify', '/set-password'];

export function PasswordGate() {
  const router = useRouter();
  const pathname = usePathname();
  const navigationReady = !!useRootNavigationState()?.key;
  const { mode } = useList();
  const signedIn = mode === 'live' || mode === 'needsHousehold';
  const checking = useRef(false);
  const [foreground, setForeground] = useState(0); // bumps when the app comes back to the front

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForeground((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!navigationReady || !signedIn || SKIP.includes(pathname) || checking.current) return;
    checking.current = true;
    api
      .hasPassword()
      .then((has) => {
        if (!has) router.push('/set-password');
      })
      .finally(() => {
        checking.current = false;
      });
  }, [navigationReady, signedIn, pathname, foreground, router]);

  return null;
}
