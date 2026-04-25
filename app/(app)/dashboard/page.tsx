'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { type AnimationStatus } from '@/lib/types';

interface AnimRow {
  id: string; title: string; status: AnimationStatus; created_at: string;
  scenes_count: number; resolution: string; job_id: string | null;
}

interface ProjectRow {
  id: string; title: string; genre: string | null; style: string | null;
  scenes_count: number; has_videos: boolean; thumbnail_url: string | null;
  final_video_url: string | null; updated_at: string; created_at: string;
}

const st: Record<AnimationStatus, { cls: string; label: string }> = {
  completed: { cls: 'bg-[rgba(74,222,128,0.08)] text-[rgba(74,222,128,0.65)]', label: 'Done' },
  processing: { cls: 'bg-[rgba(250,204,21,0.08)] text-[rgba(250,204,21,0.65)]', label: 'Running' },
  failed: { cls: 'bg-[rgba(248,113,113,0.08)] text-[rgba(248,113,113,0.65)]', label: 'Failed' },
  queued: { cls: 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.35)]', label: 'Queued' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const supabase = createClient();
  const [animations, setAnimations] = useState<AnimRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, animsRes, projectsRes] = await Promise.all([
        supabase.from('users').select('credits, plan').eq('id', user.id).single(),
        supabase.from('animations').select('id, title, status, created_at, scenes_count, resolution, job_id')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('projects').select('id, title, genre, style, scenes_count, has_videos, thumbnail_url, final_video_url, updated_at, created_at')
          .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20),
      ]);

      if (profileRes.data) { setCredits(profileRes.data.credits); setPlan(profileRes.data.plan); }
      if (animsRes.data) setAnimations(animsRes.data as AnimRow[]);
      if (projectsRes.data) setProjects(projectsRes.data as ProjectRow[]);
      setLoading(false);
    })();
  }, []);

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDeletingId(id);
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="px-5 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.5px]">Dashboard</h1>
        <Link href="/create"
          className="px-3.5 py-2 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1v12M1 7h12"/></svg>
          New
        </Link>
      </div>

      {/* Credit bar */}
      <div className="border border-[rgba(255,255,255,0.07)] rounded-xl p-4 mb-8 flex items-center justify-between bg-[#0a0a0a]">
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

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border border-[rgba(255,255,255,0.05)] rounded-xl overflow-hidden bg-[#0a0a0a] animate-pulse">
              <div className="aspect-video bg-[#111]" />
              <div className="p-3"><div className="h-3 bg-[rgba(255,255,255,0.04)] rounded w-2/3 mb-2" /><div className="h-2 bg-[rgba(255,255,255,0.03)] rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Draft Projects ── */}
          {projects.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[11px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mb-3">Continue where you left off</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {projects.map(p => (
                  <Link key={p.id} href={`/create?projectId=${p.id}`}
                    className="relative border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden bg-[#0a0a0a] hover:border-[rgba(255,255,255,0.15)] hover:-translate-y-[1px] transition-all group block">
                    {/* Thumb */}
                    <div className="aspect-video bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] relative flex items-center justify-center overflow-hidden">
                      {p.thumbnail_url
                        ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
                      }
                      {/* Status pill */}
                      <div className="absolute top-2 left-2">
                        {p.final_video_url
                          ? <span className="text-[9px] font-medium bg-[rgba(74,222,128,0.15)] text-[rgba(74,222,128,0.8)] px-1.5 py-0.5 rounded-full">✓ Exported</span>
                          : p.has_videos
                          ? <span className="text-[9px] font-medium bg-[rgba(74,222,128,0.12)] text-[rgba(74,222,128,0.7)] px-1.5 py-0.5 rounded-full">{p.scenes_count} scenes ready</span>
                          : p.scenes_count > 0
                          ? <span className="text-[9px] font-medium bg-[rgba(250,204,21,0.1)] text-[rgba(250,204,21,0.6)] px-1.5 py-0.5 rounded-full">{p.scenes_count} scenes</span>
                          : <span className="text-[9px] font-medium bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.3)] px-1.5 py-0.5 rounded-full">Draft</span>
                        }
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={(e) => deleteProject(p.id, e)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[rgba(0,0,0,0.6)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[rgba(239,68,68,0.3)]"
                      >
                        {deletingId === p.id
                          ? <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                          : <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><path d="M1 1l12 12M13 1L1 13"/></svg>
                        }
                      </button>
                    </div>
                    {/* Info */}
                    <div className="px-3 py-2.5">
                      <h3 className="text-[12px] font-medium truncate mb-1 group-hover:text-white text-[rgba(255,255,255,0.8)]">{p.title}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-[rgba(255,255,255,0.25)]">
                        {p.genre && <span className="capitalize">{p.genre}</span>}
                        {p.genre && p.style && <span className="w-0.5 h-0.5 rounded-full bg-[rgba(255,255,255,0.12)]" />}
                        {p.style && <span className="capitalize">{p.style === 'custom' ? 'Realistic' : p.style}</span>}
                        {(p.genre || p.style) && <span className="w-0.5 h-0.5 rounded-full bg-[rgba(255,255,255,0.12)]" />}
                        <span>{timeAgo(p.updated_at)}</span>
                      </div>
                    </div>
                    {/* Continue arrow */}
                    <div className="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><path d="M1 7h12M8 2l5 5-5 5"/></svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Completed Animations ── */}
          {animations.length > 0 && (
            <div>
              <h2 className="text-[11px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mb-3">Completed</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {animations.map((a) => {
                  const s = st[a.status];
                  return (
                    <Link key={a.id} href={a.job_id ? `/status/${a.job_id}` : '#'}
                      className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden bg-[#0a0a0a] hover:border-[rgba(255,255,255,0.1)] hover:-translate-y-[1px] transition-all group block">
                      <div className="aspect-video bg-[#0e0e0e] relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2"/><polygon points="9,7 16,10 9,13" fill="rgba(255,255,255,0.04)" stroke="none"/></svg>
                        </div>
                        <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium ${s.cls}`}>{s.label}</div>
                      </div>
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
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && animations.length === 0 && (
            <div className="border border-[rgba(255,255,255,0.06)] rounded-xl py-16 flex flex-col items-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2"/><polygon points="10,7 16,10 10,13" fill="rgba(255,255,255,0.05)" stroke="none"/></svg>
              <p className="text-[13px] text-[rgba(255,255,255,0.3)] mt-3 mb-3">No projects yet</p>
              <Link href="/create" className="px-4 py-2 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-colors">Create your first</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
