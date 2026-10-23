// Credits move only through the spend_credits / refund_credits database functions
// (supabase/migrations/20261023_credits_security.sql): users cannot write their own balance.
import type { SupabaseClient } from '@supabase/supabase-js';

export type Spend =
  | { ok: true; admin: boolean; balance: number; tx: string | null }
  | { ok: false; balance: number; required: number };

/** Atomically checks and deducts `amount` from the signed-in user (admins are not charged).
 *  Returns null when the database call itself failed. */
export async function spendCredits(supabase: SupabaseClient, amount: number, description: string): Promise<Spend | null> {
  const { data, error } = await supabase.rpc('spend_credits', { p_amount: amount, p_description: description });
  if (error || !data) return null;
  return data as Spend;
}

/** Gives back a spend from this request (e.g. the job could not be started). */
export async function refundCredits(supabase: SupabaseClient, spend: Spend | null, description: string): Promise<void> {
  if (!spend?.ok || !spend.tx) return;
  await supabase.rpc('refund_credits', { p_tx: spend.tx, p_description: description });
}
