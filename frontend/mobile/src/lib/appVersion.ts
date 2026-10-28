// «حدّث التطبيق»: this app's version vs the oldest one still allowed (public.app_config, set in the database).

import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';

// The version people see in the store (app.json «version»)
export const appVersion: string = Constants.expoConfig?.version ?? '0.0.0';

// '1.2.0' older than '1.10.0'? Compared number by number.
export function isOlderThan(version: string, minimum: string) {
  const a = version.split('.').map(Number);
  const b = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

export type AppConfig = { minVersion: string; iosStoreUrl: string | null; androidStoreUrl: string | null };

// null when it can't be checked (offline…) — then the app just carries on
export async function loadAppConfig(): Promise<AppConfig | null> {
  const { data, error } = await supabase.from('app_config').select('min_version, ios_store_url, android_store_url').limit(1);
  const row = data?.[0];
  if (error || !row) return null;
  return { minVersion: row.min_version, iosStoreUrl: row.ios_store_url, androidStoreUrl: row.android_store_url };
}
