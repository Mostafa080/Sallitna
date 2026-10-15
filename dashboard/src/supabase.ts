// The same database as the app, with the same *public* key (from ../.env). Admin powers come only from
// the database checking that the signed-in person is on the admin list — no secret keys here.
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(import.meta.env.EXPO_PUBLIC_SUPABASE_URL, import.meta.env.EXPO_PUBLIC_SUPABASE_KEY);

export type Overview = {
  users_total: number;
  users_today: number;
  users_week: number;
  users_month: number;
  users_blocked: number;
  active_week: number;
  lists_active: number;
  lists_with_helper: number;
  helpers: number;
  items_today: number;
  items_week: number;
  trips_week: number;
  spent_week: number;
  signups_by_day: { day: string; count: number }[];
  top_items: { name: string; count: number }[];
};

export type AdminUser = {
  id: string;
  phone: string | null;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  blocked: boolean;
  is_admin: boolean;
  lists: { name: string; role: 'owner' | 'member' | 'helper' }[];
  items_added: number;
};

export type Admin = { user_id: string; phone: string | null; name: string | null; added_at: string };

// Call an admin-only database function; throws with the database's message
export async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
