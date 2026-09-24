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
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-hidden">
        <div className="absolute inset-0 ui-grid-bg [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <div className="relative px-5 md:px-10 pt-10 pb-20 max-w-[1180px] mx-auto">
        <header className="mb-10 ui-rise">
          <div className="ui-eyebrow mb-3">Account</div>
          <h1 className="text-[34px] md:text-[40px] font-semibold tracking-[-0.045em] leading-[1.05]">Billing</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-2">Manage your plan, top up credits and review usage.</p>
        </header>

        {/* ── Overview ── */}
        <section className="grid lg:grid-cols-[1.1fr_1fr] gap-3 mb-16 ui-rise ui-rise-1">
          {/* Balance */}
          <div className="relative ui-card overflow-hidden p-7 flex flex-col min-h-[240px]">
            <div className="absolute -right-24 -top-24 w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.09),transparent_65%)]" />
            <div className="absolute inset-0 ui-dots-bg opacity-40 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
            <div className="relative flex items-center justify-between mb-8">
              <span className="ui-eyebrow">Balance</span>
              <span className="ui-chip ui-chip-solid capitalize">{plan} plan</span>
            </div>
            <div className="relative text-[56px] font-semibold tracking-[-0.06em] leading-none tabular-nums min-h-[56px]">
              {credits === null ? <span className="inline-block w-40 h-12 rounded-lg ui-shimmer" /> : credits.toLocaleString()}
            </div>
            <div className="relative text-[13px] text-[var(--fg-3)] mt-2">credits · ≈ {Math.floor(seconds / 60)}m {seconds % 60}s of animation</div>
            <div className="relative mt-auto pt-8 flex flex-wrap gap-2">
              <button className="ui-btn ui-btn-secondary">Manage subscription</button>
              <a href="#plans" className="ui-btn ui-btn-ghost">Compare plans</a>
            </div>
          </div>

          {/* Top-up */}
          <div className="ui-card p-7 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <span className="ui-eyebrow">Top up</span>
              <span className="text-[11.5px] text-[var(--fg-4)]">Credits never expire</span>
            </div>
            <div className="flex flex-col gap-2 mb-5">
              {CREDIT_PACKS.map((pk, i) => {
                const on = pack === i;
                const per1k = (pk.price / pk.credits) * 1000;
                return (
                  <button key={pk.credits} onClick={() => setPack(i)}
                    className={`flex items-center gap-3 h-[52px] px-4 rounded-xl border text-left transition-all ${on ? 'border-white bg-white/[0.06]' : 'border-[var(--line)] hover:border-[var(--line-2)] hover:bg-white/[0.02]'}`}>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${on ? 'border-white bg-white' : 'border-white/25'}`}>
                      {on && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </span>
                    <span className="flex-1 text-[13.5px] font-medium tabular-nums">{pk.label}</span>
                    <span className="ui-mono text-[11px] text-[var(--fg-4)] hidden sm:inline">${per1k.toFixed(2)} / 1k</span>
                    <span className="text-[14px] font-semibold tabular-nums w-12 text-right">${pk.price}</span>
                  </button>
                );
              })}
            </div>
            <button className="ui-btn ui-btn-primary ui-btn-lg w-full mt-auto">
              Buy {selectedPack.label} — ${selectedPack.price}
            </button>
          </div>
        </section>

        {/* ── Plans ── */}
        <section id="plans" className="mb-16 scroll-mt-8">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Plans</h2>
              <p className="text-[13px] text-[var(--fg-3)] mt-1">Monthly credits, higher resolution and priority rendering.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLANS.map((p) => {
              const current = p.name.toLowerCase() === plan;
              const hi = !!p.highlighted;
              return (
                <div key={p.name}
                  className={`relative rounded-2xl p-6 flex flex-col transition-all ${hi
                    ? 'bg-white text-black shadow-[0_30px_80px_-30px_rgba(255,255,255,0.35)]'
                    : 'ui-card'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <span className={`text-[13px] font-semibold ${hi ? 'text-black' : 'text-white'}`}>{p.name}</span>
                    {hi && <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-black/50">Recommended</span>}
                    {current && !hi && <span className="ui-chip ui-chip-muted">Current</span>}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[40px] font-semibold tracking-[-0.05em] leading-none tabular-nums">${p.price}</span>
                    {p.period && <span className={`text-[13px] ${hi ? 'text-black/45' : 'text-[var(--fg-4)]'}`}>{p.period}</span>}
                  </div>
                  <p className={`text-[12.5px] mb-5 min-h-[36px] ${hi ? 'text-black/55' : 'text-[var(--fg-3)]'}`}>{p.description}</p>

                  <div className={`text-[12px] font-medium py-2.5 px-3 rounded-lg mb-5 ${hi ? 'bg-black/[0.06]' : 'bg-white/[0.04] border border-[var(--line)]'}`}>{p.credits}</div>

                  <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className={`text-[12.5px] flex items-start gap-2.5 ${hi ? 'text-black/75' : 'text-[var(--fg-2)]'}`}>
                        <Check className={`mt-[3px] flex-shrink-0 ${hi ? 'text-black' : 'text-white/50'}`} />{f}
                      </li>
                    ))}
                  </ul>
                  <button disabled={current}
                    className={`ui-btn w-full ${current
                      ? (hi ? 'bg-black/[0.06] text-black/40' : 'border border-[var(--line)] text-[var(--fg-4)]')
                      : hi ? 'bg-black text-white hover:bg-[#1a1a1a]' : 'ui-btn-secondary'} ${current ? '!opacity-100' : ''}`}>
                    {current ? 'Current plan' : p.cta}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-[11.5px] text-[var(--fg-4)] mt-5 text-center ui-mono">1 credit ≈ 1 second of animation · prices in USD</p>
        </section>

        {/* ── Usage ── */}
        <section>
          <h2 className="text-[17px] font-semibold tracking-[-0.02em] mb-5">Usage history</h2>
          <div className="ui-card !rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[96px_1fr_96px] md:grid-cols-[140px_1fr_120px] px-5 h-10 items-center ui-eyebrow border-b border-[var(--line)]">
              <span>Date</span><span>Description</span><span className="text-right">Credits</span>
            </div>
            {usage.map((r, i) => {
              const topUp = r.credits < 0;
              return (
                <div key={i} className="grid grid-cols-[96px_1fr_96px] md:grid-cols-[140px_1fr_120px] px-5 h-12 items-center border-b border-[var(--line)] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <span className="ui-mono text-[11.5px] text-[var(--fg-4)] tabular-nums">{r.date}</span>
                  <span className="text-[13px] text-[var(--fg-2)] truncate pr-4 flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${topUp ? 'bg-white' : 'bg-white/20'}`} />
                    {r.description}
                  </span>
                  <span className={`ui-mono text-[12.5px] text-right tabular-nums ${topUp ? 'text-white font-medium' : r.credits === 0 ? 'text-[var(--fg-4)]' : 'text-[var(--fg-3)]'}`}>
                    {topUp ? `+${Math.abs(r.credits).toLocaleString()}` : r.credits === 0 ? '0' : `−${r.credits.toLocaleString()}`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
