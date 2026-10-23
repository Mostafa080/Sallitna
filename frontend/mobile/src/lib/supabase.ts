// The one Supabase connection for the whole app.
// Only the PUBLIC address + publishable key are used (from .env). What each person may read or change
// is decided by Row Level Security in the database (supabase/migrations), not by this key.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY — copy .env.example to .env');
}

// The web version first draws its pages on the computer (no browser yet, so nothing saved to read)
const drawingOnServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(url, key, {
  auth: {
    storage: drawingOnServer ? undefined : AsyncStorage, // stay signed in after closing the app
    autoRefreshToken: !drawingOnServer,
    persistSession: !drawingOnServer,
    detectSessionInUrl: false,
  },
});

// Refresh the sign-in only while the app is open (Supabase's recommendation for mobile)
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
