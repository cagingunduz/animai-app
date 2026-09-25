'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FORMATS, FormatIcon } from '@/components/FormatArt';

interface ProjectRow {
  id: string; title: string; genre: string | null; style: string | null;
  scenes_count: number; has_videos: boolean; thumbnail_url: string | null;
  final_video_url: string | null; updated_at: string; created_at: string;
}

interface RecentItem {
  id: string; title: string; video_url: string; created_at: string;
  resolution?: string | null; thumbnail_url?: string | null;
}

type Filter = 'all' | 'drafts' | 'exported';

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

const I = {
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 20h16" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  trash: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>,
  doc: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>,
};

function Thumb({ src, video, fallback }: { src?: string | null; video?: string | null; fallback: React.ReactNode }) {
  if (src) return <img src={src} alt="" className="w-full h-full object-cover" />;
  if (video) return (
    <video src={`${video}#t=0.1`} className="w-full h-full object-cover" muted playsInline preload="metadata"
      onMouseEnter={e => { (e.currentTarget as HTMLVideoElement).play().catch(() => {}); }}
      onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0.1; }} />
  );
  return (
    <div className="w-full h-full flex items-center justify-center text-white/15">{fallback}</div>
  );
}

function Meta({ parts }: { parts: (string | null | undefined | false)[] }) {
  const clean = parts.filter(Boolean) as string[];
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-[var(--fg-4)] min-w-0">
      {clean.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          {i > 0 && <span className="w-[3px] h-[3px] rounded-full bg-white/15 flex-shrink-0" />}
          <span className="truncate">{p}</span>
        </span>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [profileRes, projectsRes, animationsRes] = await Promise.all([
        supabase.from('users').select('credits, plan').eq('id', user.id).single(),
        supabase.from('projects').select('id, title, genre, style, scenes_count, has_videos, thumbnail_url, final_video_url, updated_at, created_at')
          .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20),
        supabase.from('animations').select('id, title, job_id, status, final_video_url, resolution, created_at')
          .eq('user_id', user.id).gte('created_at', since)
          .order('created_at', { ascending: false }),
      ]);

      if (profileRes.data) { setCredits(profileRes.data.credits); setPlan(profileRes.data.plan); }
      const projectRows = (projectsRes.data || []) as ProjectRow[];
      if (projectsRes.data) setProjects(projectRows);

      // Backfill: any animation still missing its final video (e.g. the user left the
      // page before it finished) — re-check the backend job and persist the result.
      const animRows: any[] = animationsRes.data || [];
      const resolved = await Promise.all(animRows.map(async (a) => {
        if (a.final_video_url || !a.job_id || a.status === 'failed') return a;
        try {
          const sr = await fetch(`/api/status/${a.job_id}`);
          const s = await sr.json();
          if (s.status === 'completed' && s.final_video_url) {
            await supabase.from('animations')
              .update({ status: 'completed', final_video_url: s.final_video_url }).eq('id', a.id);
            return { ...a, status: 'completed', final_video_url: s.final_video_url };
          }
        } catch { /* ignore */ }
        return a;
      }));

      // "Last 24 Hours": completed animations + projects finished in the last 24h
      const fromAnimations: RecentItem[] = resolved
        .filter(a => a.final_video_url)
        .map((a: any) => ({
          id: `a-${a.id}`, title: a.title, video_url: a.final_video_url,
          created_at: a.created_at, resolution: a.resolution,
        }));
      const fromProjects: RecentItem[] = projectRows
        .filter(p => p.final_video_url && new Date(p.updated_at).getTime() >= Date.now() - 24 * 3600 * 1000)
        .map(p => ({
          id: `p-${p.id}`, title: p.title, video_url: p.final_video_url as string,
          created_at: p.updated_at, thumbnail_url: p.thumbnail_url,
        }));
      const merged = [...fromAnimations, ...fromProjects]
        .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
      setRecent(merged);
      setLoading(false);
    })();
  }, []);

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setDeletingId(null);
  };

  // Download via the backend streaming endpoint (attachment disposition).
  // No Vercel size limit, no R2 CORS needed.
  const downloadVideo = (e: React.MouseEvent, url: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    const name = `${(title || 'video').replace(/[^\w .-]/g, '').trim() || 'video'}.mp4`;
    window.location.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(name)}`;
  };

  const drafts = projects.filter(p => !p.final_video_url);
  const exported = projects.filter(p => p.final_video_url);
  const visible = filter === 'drafts' ? drafts : filter === 'exported' ? exported : projects;

  const stats = [
    { label: 'Credits', value: credits.toLocaleString(), sub: <span className="capitalize">{plan} plan</span>, href: '/billing' },
    { label: 'In progress', value: String(drafts.length), sub: 'Draft projects' },
    { label: 'Exported', value: String(exported.length), sub: 'Finished videos' },
    { label: 'Last 24 hours', value: String(recent.length), sub: 'New renders' },
  ];

  const deleteBtn = (id: string) => (
    <button onClick={(e) => deleteProject(id, e)} aria-label="Delete project" title="Delete"
      className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/70 border border-white/10 flex items-center justify-center text-white/70 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity">
      {deletingId === id ? <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" /> : I.trash}
    </button>
  );

  const card = 'group block';
  const media = 'relative aspect-video rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--line-3)] transition-colors mb-2.5';

  return (
    <div className="px-5 md:px-8 py-6 max-w-[1280px] mx-auto">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Home</h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-0.5">Your projects and recent renders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/billing" className="ui-btn ui-btn-secondary">Buy credits</Link>
          <Link href="/create" className="ui-btn ui-btn-primary">{I.plus}New video</Link>
        </div>
      </header>

      {/* ── Stats ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border border-[var(--line)] rounded-[10px] overflow-hidden mb-8">
        {stats.map(s => {
          const body = (
            <>
              <div className="text-[12px] text-[var(--fg-3)] mb-1.5">{s.label}</div>
              <div className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-tight">
                {loading ? <span className="inline-block w-12 h-5 rounded ui-shimmer align-middle" /> : s.value}
              </div>
              <div className="text-[12px] text-[var(--fg-4)] mt-0.5">{s.sub}</div>
            </>
          );
          return s.href
            ? <Link key={s.label} href={s.href} className="bg-black px-4 py-3.5 hover:bg-[var(--surface)] transition-colors">{body}</Link>
            : <div key={s.label} className="bg-black px-4 py-3.5">{body}</div>;
        })}
      </section>

      {/* ── Start ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-medium">Start a new video</h2>
          <Link href="/create" className="text-[12px] text-[var(--fg-3)] hover:text-white transition-colors">All formats</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {FORMATS.map(f => (
            <Link key={f.key} href={`/create?mode=${f.key}`} className="ui-card ui-card-hover flex items-center gap-3 px-3 py-2.5">
              <span className="w-8 h-8 rounded-md bg-[var(--surface-3)] border border-[var(--line)] flex items-center justify-center text-[var(--fg-2)] flex-shrink-0">
                <FormatIcon k={f.key} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium truncate">{f.title}</span>
                <span className="block text-[12px] text-[var(--fg-4)] truncate">{f.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {loading ? (
        <section>
          <div className="h-4 w-24 rounded ui-shimmer mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <div className="aspect-video rounded-lg ui-shimmer mb-2.5" />
                <div className="h-3 rounded ui-shimmer w-2/3 mb-1.5" />
                <div className="h-2.5 rounded ui-shimmer w-1/3" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          {/* ── Recent renders ── */}
          {recent.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-medium">Recent renders <span className="text-[var(--fg-4)] font-normal ml-1">{recent.length}</span></h2>
                <span className="text-[12px] text-[var(--fg-4)] hidden sm:block">Videos expire after 30 days</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
                {recent.map(item => (
                  <article key={item.id} className={card}>
                    <div className={media}>
                      <Thumb src={item.thumbnail_url} video={item.video_url} fallback={I.play} />
                      <button onClick={e => downloadVideo(e, item.video_url, item.title)}
                        className="absolute bottom-2 right-2 ui-btn ui-btn-sm ui-btn-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        {I.download}Download
                      </button>
                    </div>
                    <h3 className="text-[13px] font-medium truncate mb-0.5">{item.title}</h3>
                    <Meta parts={[item.resolution, timeAgo(item.created_at)]} />
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ── Projects ── */}
          {projects.length > 0 && (
            <section>
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="text-[14px] font-medium">Projects</h2>
                <div className="flex items-center gap-1">
                  {([['all', 'All', projects.length], ['drafts', 'In progress', drafts.length], ['exported', 'Exported', exported.length]] as const).map(([k, label, n]) => (
                    <button key={k} onClick={() => setFilter(k)}
                      className={`h-7 px-2.5 rounded-md text-[12px] transition-colors ${filter === k ? 'bg-white/[0.08] text-white' : 'text-[var(--fg-3)] hover:text-white'}`}>
                      {label} <span className="text-[var(--fg-4)] tabular-nums ml-0.5">{n}</span>
                    </button>
                  ))}
                </div>
              </div>

              {visible.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[var(--line-2)] py-10 text-center text-[13px] text-[var(--fg-3)]">Nothing here yet.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
                  {visible.map(p => {
                    const done = !!p.final_video_url;
                    const cap = (x: string | null) => x ? x.charAt(0).toUpperCase() + x.slice(1) : null;
                    const style = p.style ? (p.style === 'custom' ? 'Realistic' : cap(p.style)) : null;
                    const status = done ? 'Exported' : p.has_videos ? `${p.scenes_count} scenes ready` : p.scenes_count > 0 ? `${p.scenes_count} scenes` : 'Draft';
                    const inner = (
                      <>
                        <div className={media}>
                          <Thumb src={p.thumbnail_url} fallback={I.doc} />
                          <span className={`absolute top-2 left-2 ui-chip ${done ? 'ui-chip-solid' : ''}`}>{status}</span>
                          {deleteBtn(p.id)}
                          {done && (
                            <button onClick={e => downloadVideo(e, p.final_video_url!, p.title)}
                              className="absolute bottom-2 right-2 ui-btn ui-btn-sm ui-btn-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              {I.download}Download
                            </button>
                          )}
                        </div>
                        <h3 className="text-[13px] font-medium truncate mb-0.5">{p.title}</h3>
                        <Meta parts={[cap(p.genre), style, timeAgo(p.updated_at)]} />
                      </>
                    );
                    return done
                      ? <article key={p.id} className={card}>{inner}</article>
                      : <Link key={p.id} href={`/create?projectId=${p.id}`} className={card}>{inner}</Link>;
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── Empty state ── */}
          {projects.length === 0 && recent.length === 0 && (
            <section className="rounded-[10px] border border-[var(--line)] py-16 px-6 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-[var(--surface-3)] border border-[var(--line)] flex items-center justify-center mb-4 text-[var(--fg-2)]">{I.play}</div>
              <h3 className="text-[14px] font-medium mb-1">No videos yet</h3>
              <p className="text-[13px] text-[var(--fg-3)] max-w-[340px] mb-5">Pick a format, write an idea, and Animave handles the script, visuals, voice and edit.</p>
              <Link href="/create" className="ui-btn ui-btn-primary">{I.plus}Create your first video</Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
