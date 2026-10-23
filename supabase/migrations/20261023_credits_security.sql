-- ═══════════════════════════════════════
-- Credits security (2026-10-23)
-- Before: any signed-in user could UPDATE their own row in public.users (credits, plan,
-- is_admin) and INSERT credit transactions straight from the browser.
-- After: users can only read; credits move through two SECURITY DEFINER functions that
-- act on auth.uid() only.
-- Run once in the Supabase SQL editor, then deploy the app that calls spend_credits().
-- ═══════════════════════════════════════

-- 1) No direct writes to profiles or the ledger from client roles
drop policy if exists "Users can update own data" on public.users;
revoke insert, update, delete on public.users from anon, authenticated;

drop policy if exists "Users can insert own transactions" on public.credit_transactions;
revoke insert, update, delete on public.credit_transactions from anon, authenticated;

alter table public.credit_transactions add column if not exists refunded boolean not null default false;

-- 2) Spend: atomic check + deduct + ledger row. Admins are never charged.
create or replace function public.spend_credits(p_amount integer, p_description text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal integer;
  adm boolean;
  tx uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000000 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  select credits, is_admin into bal, adm from public.users where id = uid for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if adm then
    return jsonb_build_object('ok', true, 'admin', true, 'balance', bal, 'tx', null);
  end if;
  if bal < p_amount then
    return jsonb_build_object('ok', false, 'admin', false, 'balance', bal, 'required', p_amount);
  end if;

  update public.users set credits = credits - p_amount where id = uid returning credits into bal;
  insert into public.credit_transactions (user_id, amount, description)
  values (uid, -p_amount, left(coalesce(p_description, 'Credits spent'), 300))
  returning id into tx;
  return jsonb_build_object('ok', true, 'admin', false, 'balance', bal, 'tx', tx);
end;
$$;

-- 3) Refund: only the caller's own recent spend, only once (the job could not be started)
create or replace function public.refund_credits(p_tx uuid, p_description text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  amt integer;
  bal integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.credit_transactions set refunded = true
  where id = p_tx and user_id = uid and amount < 0 and not refunded
    and created_at > now() - interval '15 minutes'
  returning -amount into amt;
  if amt is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.users set credits = credits + amt where id = uid returning credits into bal;
  insert into public.credit_transactions (user_id, amount, description, refunded)
  values (uid, amt, left(coalesce(p_description, 'Refund'), 300), true);
  return jsonb_build_object('ok', true, 'balance', bal);
end;
$$;

revoke all on function public.spend_credits(integer, text) from public, anon;
revoke all on function public.refund_credits(uuid, text) from public, anon;
grant execute on function public.spend_credits(integer, text) to authenticated;
grant execute on function public.refund_credits(uuid, text) to authenticated;
