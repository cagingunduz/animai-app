'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PLANS, CREDIT_PACKS, MOCK_USAGE } from '@/lib/types';

export default function BillingPage() {
  const supabase = createClient();
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [usage, setUsage] = useState(MOCK_USAGE);

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

  return (
    <div className="px-5 md:px-8 py-6 max-w-[1060px]">
      <h1 className="text-[20px] font-semibold tracking-[-0.5px] mb-6">Billing</h1>

      {/* Current plan */}
      <div className="border border-[rgba(255,255,255,0.06)] rounded-xl p-5 mb-8 bg-[#0a0a0a] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider mb-0.5">Current Plan</div>
          <div className="text-[20px] font-semibold tracking-[-0.5px] capitalize mb-0.5">{plan}</div>
          <div className="text-[13px] text-[rgba(255,255,255,0.35)]">{credits.toLocaleString()} credits remaining</div>
        </div>
        <button className="px-4 py-2 border border-[rgba(255,255,255,0.08)] rounded-lg text-[12px] text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)] transition-all self-start">Manage Subscription</button>
      </div>

      {/* Plans */}
      <h2 className="text-[15px] font-semibold tracking-[-0.2px] mb-4">Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden mb-8">
        {PLANS.map((p) => (
          <div key={p.name} className={`bg-black p-5 flex flex-col ${p.highlighted ? 'bg-[rgba(255,255,255,0.012)]' : ''}`}>
            <div className="text-[11px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[1px] mb-2.5">{p.name}</div>
            <div className="text-[28px] font-semibold tracking-[-1.5px] mb-0.5">
              ${p.price}{p.period && <span className="text-[13px] font-normal text-[rgba(255,255,255,0.3)]"> {p.period}</span>}
            </div>
            <p className="text-[12px] text-[rgba(255,255,255,0.3)] mb-2">{p.description}</p>
            <p className="text-[11px] text-[rgba(255,255,255,0.4)] font-medium mb-4 pb-3.5 border-b border-[rgba(255,255,255,0.04)]">{p.credits}</p>
            <ul className="flex flex-col gap-2 mb-5 flex-1">
              {p.features.map((f, i) => (
                <li key={i} className="text-[12px] text-[rgba(255,255,255,0.4)] flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.15)] mt-1.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <button className={`w-full py-2 rounded-lg text-[12px] font-medium transition-all ${
              p.name.toLowerCase() === plan ? 'border border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.25)] cursor-default'
              : p.highlighted ? 'bg-white text-black hover:bg-gray-200'
              : 'border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)]'
            }`}>
              {p.name.toLowerCase() === plan ? 'Current Plan' : p.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Top-up */}
      <h2 className="text-[15px] font-semibold tracking-[-0.2px] mb-4">Top-up Credits</h2>
      <div className="border border-[rgba(255,255,255,0.06)] rounded-xl p-5 bg-[#0a0a0a] flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-[14px] font-medium mb-0.5">Need more credits?</p>
          <p className="text-[12px] text-[rgba(255,255,255,0.3)]">Purchase anytime. They never expire.</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          {CREDIT_PACKS.map((pk) => (
            <button key={pk.credits}
              className="px-3.5 py-2 border border-[rgba(255,255,255,0.08)] rounded-lg text-[12px] text-[rgba(255,255,255,0.45)] hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-all whitespace-nowrap">
              {pk.label} — ${pk.price}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-[rgba(255,255,255,0.18)] mb-8 text-center">1,000 credits = $4 · 1 credit ≈ 1 second of animation · Prices in USD</p>

      {/* Usage */}
      <h2 className="text-[15px] font-semibold tracking-[-0.2px] mb-4">Usage History</h2>
      <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden bg-[#0a0a0a]">
        <div className="grid grid-cols-[100px_1fr_90px] px-4 py-2.5 text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider border-b border-[rgba(255,255,255,0.04)]">
          <span>Date</span><span>Description</span><span className="text-right">Credits</span>
        </div>
        {usage.map((r, i) => (
          <div key={i} className="grid grid-cols-[100px_1fr_90px] px-4 py-3 border-b border-[rgba(255,255,255,0.025)] last:border-0 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
            <span className="text-[12px] text-[rgba(255,255,255,0.3)] tabular-nums">{r.date}</span>
            <span className="text-[12px] text-[rgba(255,255,255,0.45)]">{r.description}</span>
            <span className={`text-[12px] text-right tabular-nums ${r.credits < 0 ? 'text-[rgba(74,222,128,0.55)]' : r.credits === 0 ? 'text-[rgba(255,255,255,0.15)]' : 'text-[rgba(255,255,255,0.45)]'}`}>
              {r.credits < 0 ? `+${Math.abs(r.credits).toLocaleString()}` : r.credits === 0 ? '0' : `-${r.credits.toLocaleString()}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
