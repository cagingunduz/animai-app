'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface DeletedProject {
  id: string; title: string; genre: string | null; style: string | null;
  thumbnail_url: string | null; deleted_at: string;
}

function daysLeft(deletedAt: string) {
  const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000);
  return Math.max(0, diff);
}

export default function RecentlyDeletedPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<DeletedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from('projects')
        .select('id, title, genre, style, thumbnail_url, deleted_at')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .gte('deleted_at', cutoff)
        .order('deleted_at', { ascending: false });
      if (data) setProjects(data as DeletedProject[]);
      setLoading(false);
    })();
  }, []);

  const restore = async (id: string) => {
    setActionId(id);
    await supabase.from('projects').update({ deleted_at: null }).eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setActionId(null);
  };

  const deletePermanently = async (id: string) => {
    if (!confirm('Permanently delete this project? This cannot be undone.')) return;
    setActionId(id);
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setActionId(null);
  };

  return (
    <div className="px-5 md:px-8 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-[11px] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors">← Dashboard</Link>
        <span className="text-[rgba(255,255,255,0.1)]">/</span>
        <h1 className="text-[18px] font-semibold tracking-[-0.5px]">Recently Deleted</h1>
      </div>

      <p className="text-[12px] text-[rgba(255,255,255,0.3)] mb-6">
        Projects are permanently deleted after 30 days. Restore them before time runs out.
      </p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-[rgba(255,255,255,0.05)] rounded-xl overflow-hidden bg-[#0a0a0a] animate-pulse">
              <div className="aspect-video bg-[#111]" />
              <div className="p-3"><div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-2/3 mb-2" /></div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-[rgba(255,255,255,0.06)] rounded-xl py-16 flex flex-col items-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          <p className="text-[13px] text-[rgba(255,255,255,0.3)] mt-3">No deleted projects</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {projects.map(p => {
            const days = daysLeft(p.deleted_at);
            const urgent = days <= 3;
            return (
              <div key={p.id} className="border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden bg-[#0a0a0a] group opacity-70 hover:opacity-100 transition-opacity">
                {/* Thumb */}
                <div className="aspect-video bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] relative flex items-center justify-center overflow-hidden">
                  {p.thumbnail_url
                    ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover grayscale" />
                    : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  }
                  {/* Days left badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${urgent ? 'bg-[rgba(239,68,68,0.2)] text-[rgba(239,68,68,0.8)]' : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]'}`}>
                      {days}d left
                    </span>
                  </div>
                </div>
                {/* Info */}
                <div className="px-3 pt-2.5 pb-1">
                  <h3 className="text-[12px] font-medium truncate text-[rgba(255,255,255,0.6)]">{p.title}</h3>
                  {p.genre && <p className="text-[10px] text-[rgba(255,255,255,0.2)] capitalize mt-0.5">{p.genre}</p>}
                </div>
                {/* Actions */}
                <div className="px-3 pb-3 flex gap-2">
                  <button onClick={() => restore(p.id)} disabled={actionId === p.id}
                    className="flex-1 py-1.5 text-[11px] font-medium bg-white text-black rounded-md hover:bg-gray-200 disabled:opacity-50 transition-all">
                    {actionId === p.id ? '...' : 'Restore'}
                  </button>
                  <button onClick={() => deletePermanently(p.id)} disabled={actionId === p.id}
                    className="py-1.5 px-2.5 text-[11px] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.3)] rounded-md hover:border-red-500/40 hover:text-red-400 disabled:opacity-50 transition-all">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
