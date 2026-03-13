'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { type AnimationStatus } from '@/lib/types';

interface AnimRow {
  id: string; title: string; status: AnimationStatus; created_at: string;
  scenes_count: number; resolution: string; job_id: string | null;
}

const st: Record<AnimationStatus, { cls: string; label: string }> = {
  completed: { cls: 'bg-[rgba(74,222,128,0.08)] text-[rgba(74,222,128,0.65)]', label: 'Done' },
  processing: { cls: 'bg-[rgba(250,204,21,0.08)] text-[rgba(250,204,21,0.65)]', label: 'Running' },
  failed: { cls: 'bg-[rgba(248,113,113,0.08)] text-[rgba(248,113,113,0.65)]', label: 'Failed' },
  queued: { cls: 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.35)]', label: 'Queued' },
};

export default function DashboardPage() {
  const supabase = createClient();
  const [animations, setAnimations] = useState<AnimRow[]>([]);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase.from('users').select('credits, plan').eq('id', user.id).single();
      if (profile) { setCredits(profile.credits); setPlan(profile.plan); }

      // Fetch animations
      const { data: anims } = await supabase
        .from('animations')
        .select('id, title, status, created_at, scenes_count, resolution, job_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (anims) setAnimations(anims as AnimRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-5 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.5px]">Your Animations</h1>
        <Link href="/create"
          className="px-3.5 py-2 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v12M1 7h12"/></svg>
          New
        </Link>
      </div>

      {/* Credit bar */}
      <div className="border border-[rgba(255,255,255,0.07)] rounded-xl p-4 mb-6 flex items-center justify-between bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[11px] text-[rgba(255,255,255,0.3)] mb-0.5">Credits</div>
            <span className="text-[22px] font-semibold tracking-[-1px]">{credits.toLocaleString()}</span>
          </div>
          <span className="text-[11px] text-[rgba(255,255,255,0.25)] border border-[rgba(255,255,255,0.06)] rounded-full px-2 py-0.5 capitalize">{plan}</span>
        </div>
        <Link href="/billing" className="px-3 py-1.5 text-[12px] border border-[rgba(255,255,255,0.08)] rounded-lg text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)] transition-all">
          Buy Credits
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden bg-[#0a0a0a] animate-pulse">
              <div className="aspect-video bg-[#111]" />
              <div className="p-3"><div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-2/3 mb-2" /><div className="h-2 bg-[rgba(255,255,255,0.03)] rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : animations.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {animations.map((a) => {
            const s = st[a.status];
            return (
              <Link key={a.id} href={a.job_id ? `/status/${a.job_id}` : '#'}
                className="border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden bg-[#0a0a0a] hover:border-[rgba(255,255,255,0.1)] hover:-translate-y-[1px] transition-all group block">
                {/* Thumb */}
                <div className="aspect-video bg-[#0e0e0e] relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2"/><polygon points="9,7 16,10 9,13" fill="rgba(255,255,255,0.04)" stroke="none"/></svg>
                  </div>
                  <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium ${s.cls}`}>{s.label}</div>
                </div>
                {/* Info */}
                <div className="px-3 py-2.5">
                  <h3 className="text-[12px] font-medium truncate mb-1 group-hover:text-white text-[rgba(255,255,255,0.8)]">{a.title}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-[rgba(255,255,255,0.25)]">
                    <span>{a.scenes_count}s</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[rgba(255,255,255,0.12)]" />
                    <span>{a.resolution}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[rgba(255,255,255,0.12)]" />
                    <span>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="border border-[rgba(255,255,255,0.06)] rounded-xl py-16 flex flex-col items-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2"/><polygon points="10,7 16,10 10,13" fill="rgba(255,255,255,0.05)" stroke="none"/></svg>
          <p className="text-[13px] text-[rgba(255,255,255,0.3)] mt-3 mb-3">No animations yet</p>
          <Link href="/create" className="px-4 py-2 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-colors">Create your first</Link>
        </div>
      )}
    </div>
  );
}
