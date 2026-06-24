import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  || 'placeholder-anon-key';

export const isMisconfigured =
  !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

if (isMisconfigured) {
  console.error(
    '❌ Supabase credentials missing.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

/* ── Auth helpers ── */
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });

export const logoutUser = () => supabase.auth.signOut();

/* ── Error helper ── */
export function handleSupabaseError(error: unknown, context: string): void {
  if (!error) return;
  const msg = error instanceof Error ? error.message : JSON.stringify(error);
  console.error(`[Supabase:${context}]`, msg);
}

/* ── Database types (mirrors schema) ── */
export type DbUser = {
  id: string;
  email: string;
  display_name: string;
  photo_url: string;
  seller_status: 'none' | 'approved' | 'admin';
  balance: number;
  created_at: string;
};

export type DbBot = {
  id: string;
  owner_id: string;
  owner_name: string;
  name: string;
  description: string;
  category: string;
  platform: string;
  strategy: string;
  price: number;
  win_rate: number;
  monthly_profit: number;
  max_drawdown: number;
  downloads: number;
  rating: number;
  status: string;
  source_file_name: string;
  created_at: string;
  updated_at: string;
};

export type DbPurchase = {
  id: string;
  buyer_id: string;
  bot_id: string;
  bot_name: string;
  price: number;
  license_key: string;
  purchase_date: string;
};

export type DbReview = {
  id: string;
  user_id: string;
  user_name: string;
  user_photo: string;
  bot_id: string;
  rating: number;
  comment: string;
  created_at: string;
};
