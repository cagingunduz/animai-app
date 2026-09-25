'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PLANS, CREDIT_PACKS, MOCK_USAGE } from '@/lib/types';

const Check = ({ className = '' }: { className?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m5 12 5 5L20 7" /></svg>
);

export default function BillingPage() {
  const supabase = createClient();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState('free');
  const [usage, setUsage] = useState(MOCK_USAGE);
  const [pack, setPack] = useState(1);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('credits, plan').eq('id', user.id).single();
      if (data) { setCredits(data.credits); setPlan(data.plan); }

      // Fetch real transactions when available
      const { data: txns } = await supabase
        .from('credit_transactions')
        .select('created_at, description, amount')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txns && txns.length > 0) {
        setUsage(txns.map(t => ({
          date: new Date(t.created_at).toLocaleDateString('en-CA'),
          description: t.description,
          credits: t.amount,
        })));
      }
    })();
  }, []);

  const seconds = Math.round(credits ?? 0); // 1 credit ≈ 1 second of animation
  const selectedPack = CREDIT_PACKS[pack];

  return (
    <div className="px-5 md:px-8 py-6 max-w-[1080px] mx-auto">
      <header className="mb-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Billing</h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-0.5">Manage your plan, buy credits and review usage.</p>
      </header>

      {/* ── Overview ── */}
      <section className="grid lg:grid-cols-2 gap-3 mb-10">
        <div className="ui-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-[var(--fg-3)]">Balance</span>
            <span className="ui-chip ui-chip-muted capitalize">{plan} plan</span>
          </div>
          <div className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums leading-none">
            {credits === null ? <span className="inline-block w-24 h-7 rounded ui-shimmer align-middle" /> : credits.toLocaleString()}
          </div>
          <div className="text-[12px] text-[var(--fg-4)] mt-1.5">credits · about {Math.floor(seconds / 60)}m {seconds % 60}s of animation</div>
          <div className="mt-auto pt-5 flex gap-2">
            <button className="ui-btn ui-btn-secondary">Manage subscription</button>
            <a href="#plans" className="ui-btn ui-btn-ghost">Compare plans</a>
          </div>
        </div>

        <div className="ui-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-[var(--fg-3)]">Buy credits</span>
            <span className="text-[12px] text-[var(--fg-4)]">Credits never expire</span>
          </div>
          <div className="rounded-lg border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden mb-4">
            {CREDIT_PACKS.map((pk, i) => {
              const on = pack === i;
              const per1k = (pk.price / pk.credits) * 1000;
              return (
                <button key={pk.credits} onClick={() => setPack(i)}
                  className={`w-full flex items-center gap-3 h-10 px-3 text-left transition-colors ${on ? 'bg-white/[0.06]' : 'hover:bg-white/[0.02]'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${on ? 'border-white' : 'border-[var(--line-3)]'}`}>
                    {on && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="flex-1 text-[13px] tabular-nums">{pk.label}</span>
                  <span className="text-[12px] text-[var(--fg-4)] tabular-nums hidden sm:inline">${per1k.toFixed(2)} / 1k</span>
                  <span className="text-[13px] font-medium tabular-nums w-10 text-right">${pk.price}</span>
                </button>
              );
            })}
          </div>
          <button className="ui-btn ui-btn-primary w-full mt-auto">Buy {selectedPack.label} for ${selectedPack.price}</button>
        </div>
      </section>

      {/* ── Plans ── */}
      <section id="plans" className="mb-10 scroll-mt-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[14px] font-medium">Plans</h2>
          <span className="text-[12px] text-[var(--fg-4)]">1 credit ≈ 1 second of animation · USD</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border border-[var(--line)] rounded-[10px] overflow-hidden">
          {PLANS.map((p) => {
            const current = p.name.toLowerCase() === plan;
            return (
              <div key={p.name} className="bg-black p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3 h-5">
                  <span className="text-[13px] font-medium">{p.name}</span>
                  {current ? <span className="ui-chip ui-chip-muted">Current</span> : p.highlighted ? <span className="ui-chip">Recommended</span> : null}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[24px] font-semibold tracking-[-0.02em] tabular-nums">${p.price}</span>
                  {p.period && <span className="text-[12px] text-[var(--fg-4)]">{p.period}</span>}
                </div>
                <p className="text-[12px] text-[var(--fg-3)] mb-4 min-h-[32px]">{p.description}</p>
                <ul className="flex flex-col gap-2 mb-5 flex-1 border-t border-[var(--line)] pt-4">
                  {p.features.map((f, i) => (
                    <li key={i} className="text-[12.5px] text-[var(--fg-2)] flex items-start gap-2">
                      <Check className="mt-[3px] flex-shrink-0 text-[var(--fg-4)]" />{f}
                    </li>
                  ))}
                </ul>
                <button disabled={current} className={`ui-btn w-full ${p.highlighted && !current ? 'ui-btn-primary' : 'ui-btn-secondary'}`}>
                  {current ? 'Current plan' : p.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Usage ── */}
      <section>
        <h2 className="text-[14px] font-medium mb-3">Usage history</h2>
        <div className="rounded-[10px] border border-[var(--line)] overflow-hidden">
          <div className="grid grid-cols-[96px_1fr_96px] md:grid-cols-[120px_1fr_120px] px-4 h-9 items-center text-[12px] text-[var(--fg-4)] border-b border-[var(--line)] bg-[var(--surface)]">
            <span>Date</span><span>Description</span><span className="text-right">Credits</span>
          </div>
          {usage.map((r, i) => {
            const topUp = r.credits < 0;
            return (
              <div key={i} className="grid grid-cols-[96px_1fr_96px] md:grid-cols-[120px_1fr_120px] px-4 h-10 items-center border-b border-[var(--line)] last:border-0">
                <span className="text-[12.5px] text-[var(--fg-3)] tabular-nums">{r.date}</span>
                <span className="text-[12.5px] text-[var(--fg-2)] truncate pr-4">{r.description}</span>
                <span className={`text-[12.5px] text-right tabular-nums ${topUp ? 'text-[var(--fg)]' : 'text-[var(--fg-3)]'}`}>
                  {topUp ? `+${Math.abs(r.credits).toLocaleString()}` : r.credits === 0 ? '0' : `−${r.credits.toLocaleString()}`}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
