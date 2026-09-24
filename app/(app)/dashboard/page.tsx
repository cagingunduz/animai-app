'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import FormatArt, { FORMATS } from '@/components/FormatArt';

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

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
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
  if (src) return <img src={src} alt="" className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.035]" />;
  if (video) return (
    <video src={`${video}#t=0.1`} className="w-full h-full object-cover" muted playsInline preload="metadata"
      onMouseEnter={e => { (e.currentTarget as HTMLVideoElement).play().catch(() => {}); }}
      onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0.1; }} />
  );
  return (
    <div className="w-full h-full relative flex items-center justify-center text-white/15">
      <div className="absolute inset-0 ui-dots-bg opacity-50 ui-fade-mask" />
      <div className="relative">{fallback}</div>
    </div>
  );
}

function Meta({ parts }: { parts: (string | null | undefined | false)[] }) {
  const clean = parts.filter(Boolean) as string[];
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--fg-4)] min-w-0">
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
  const [hello, setHello] = useState('Welcome back');
  const [today, setToday] = useState('');

  useEffect(() => {
    setHello(greeting());
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);

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
    { label: 'Credits', value: credits.toLocaleString(), sub: <span className="ui-chip ui-chip-muted capitalize">{plan} plan</span>, href: '/billing' },
    { label: 'In progress', value: String(drafts.length), sub: <span className="text-[var(--fg-4)]">draft projects</span> },
    { label: 'Exported', value: String(exported.length), sub: <span className="text-[var(--fg-4)]">finished videos</span> },
    { label: 'Last 24h', value: String(recent.length), sub: <span className="text-[var(--fg-4)]">new renders</span> },
  ];

  const deleteBtn = (id: string) => (
    <button onClick={(e) => deleteProject(id, e)} aria-label="Delete project" title="Delete"
      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/80 transition-all">
      {deletingId === id ? <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" /> : I.trash}
    </button>
  );

  return (
    <div className="relative min-h-screen">
      {/* Ambient top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute inset-0 ui-grid-bg [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute left-1/2 -top-40 -translate-x-1/2 w-[900px] h-[400px] bg-[radial-gradient(ellipse,rgba(255,255,255,0.07),transparent_65%)]" />
      </div>

      <div className="relative px-5 md:px-10 pt-10 pb-16 max-w-[1320px] mx-auto">
        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10 ui-rise">
          <div>
            <div className="ui-eyebrow mb-3 min-h-[14px]">{today}</div>
            <h1 className="text-[34px] md:text-[40px] font-semibold tracking-[-0.045em] leading-[1.05]">
              {hello}.<br />
              <span className="text-[var(--fg-4)]">What are we making today?</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/billing" className="ui-btn ui-btn-secondary">Buy credits</Link>
            <Link href="/create" className="ui-btn ui-btn-primary">{I.plus}New video</Link>
          </div>
        </header>

        {/* ── Stats ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border border-[var(--line)] rounded-2xl overflow-hidden mb-14 ui-rise ui-rise-1">
          {stats.map(s => {
            const body = (
              <>
                <div className="ui-eyebrow mb-4">{s.label}</div>
                <div className="text-[30px] font-semibold tracking-[-0.045em] leading-none tabular-nums mb-3">
                  {loading ? <span className="inline-block w-16 h-7 rounded-md ui-shimmer align-middle" /> : s.value}
                </div>
                <div className="text-[11.5px] h-5 flex items-center">{s.sub}</div>
              </>
            );
            return s.href
              ? <Link key={s.label} href={s.href} className="bg-black p-5 md:p-6 hover:bg-[#070707] transition-colors group relative">
                  {body}
                  <span className="absolute top-5 right-5 text-white/20 group-hover:text-white group-hover:translate-x-0.5 transition-all">{I.arrow}</span>
                </Link>
              : <div key={s.label} className="bg-black p-5 md:p-6">{body}</div>;
          })}
        </section>

        {/* ── Start something new ── */}
        <section className="mb-16 ui-rise ui-rise-2">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Start something new</h2>
              <p className="text-[13px] text-[var(--fg-3)] mt-1">Pick a format — every one exports vertical and horizontal.</p>
            </div>
            <Link href="/create" className="hidden sm:flex items-center gap-1.5 text-[12.5px] text-[var(--fg-3)] hover:text-white transition-colors">
              All formats {I.arrow}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {FORMATS.map(f => (
              <Link key={f.key} href={`/create?mode=${f.key}`}
                className="group ui-card ui-card-hover overflow-hidden flex flex-col hover:-translate-y-0.5">
                <div className="relative">
                  <FormatArt k={f.key} className="aspect-[16/10] border-b border-[var(--line)]" />
                  {f.badge && (
                    <span className={`absolute top-2.5 left-2.5 ui-chip ${f.badge === 'Popular' ? 'ui-chip-solid' : ''}`}>{f.badge}</span>
                  )}
                </div>
                <div className="p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium tracking-[-0.01em] truncate">{f.title}</div>
                    <div className="text-[11.5px] text-[var(--fg-4)] mt-0.5 truncate">{f.tagline}</div>
                  </div>
                  <span className="text-white/20 group-hover:text-white group-hover:translate-x-0.5 transition-all mt-0.5 flex-shrink-0">{I.arrow}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {loading ? (
          <section>
            <div className="h-5 w-40 rounded ui-shimmer mb-5" />
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
              {[...Array(8)].map((_, i) => (
                <div key={i}>
                  <div className="aspect-video rounded-xl ui-shimmer mb-3" />
                  <div className="h-3 rounded ui-shimmer w-2/3 mb-2" />
                  <div className="h-2.5 rounded ui-shimmer w-1/3" />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            {/* ── Just rendered ── */}
            {recent.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center gap-3 mb-5">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-40" />
                    <span className="relative w-2 h-2 rounded-full bg-white" />
                  </span>
                  <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Just rendered</h2>
                  <span className="ui-mono text-[11px] text-[var(--fg-4)]">{String(recent.length).padStart(2, '0')}</span>
                  <span className="ml-auto text-[11.5px] text-[var(--fg-4)] hidden sm:block">Videos expire after 30 days</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
                  {recent.map(item => (
                    <article key={item.id} className="group">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#070707] border border-[var(--line)] group-hover:border-[var(--line-3)] transition-colors mb-3">
                        <Thumb src={item.thumbnail_url} video={item.video_url} fallback={I.play} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <span className="absolute top-2.5 left-2.5 ui-chip ui-chip-solid">New</span>
                        <button onClick={e => downloadVideo(e, item.video_url, item.title)}
                          className="absolute bottom-2.5 right-2.5 ui-btn ui-btn-sm ui-btn-primary opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0">
                          {I.download}Download
                        </button>
                      </div>
                      <h3 className="text-[13px] font-medium tracking-[-0.01em] truncate mb-1">{item.title}</h3>
                      <Meta parts={[item.resolution, timeAgo(item.created_at)]} />
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ── Projects ── */}
            {projects.length > 0 && (
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Projects</h2>
                  <div className="inline-flex p-[3px] rounded-[11px] bg-white/[0.03] border border-[var(--line)] self-start">
                    {([['all', 'All', projects.length], ['drafts', 'In progress', drafts.length], ['exported', 'Exported', exported.length]] as const).map(([k, label, n]) => (
                      <button key={k} onClick={() => setFilter(k)}
                        className={`h-7 px-3 rounded-[8px] text-[12px] font-medium flex items-center gap-2 transition-all ${filter === k ? 'bg-white text-black shadow-[0_1px_8px_rgba(255,255,255,0.15)]' : 'text-[var(--fg-3)] hover:text-white'}`}>
                        {label}
                        <span className={`ui-mono text-[10px] ${filter === k ? 'text-black/45' : 'text-[var(--fg-4)]'}`}>{n}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {visible.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--line-2)] py-14 text-center text-[13px] text-[var(--fg-3)]">
                    Nothing here yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
                    {visible.map(p => {
                      const done = !!p.final_video_url;
                      const cap = (x: string | null) => x ? x.charAt(0).toUpperCase() + x.slice(1) : null;
                      const style = p.style ? (p.style === 'custom' ? 'Realistic' : cap(p.style)) : null;
                      const chip = done
                        ? <span className="ui-chip ui-chip-solid"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>Exported</span>
                        : p.has_videos
                        ? <span className="ui-chip">{p.scenes_count} scenes ready</span>
                        : p.scenes_count > 0
                        ? <span className="ui-chip">{p.scenes_count} scenes</span>
                        : <span className="ui-chip ui-chip-muted">Draft</span>;

                      const media = (
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-[#070707] border border-[var(--line)] group-hover:border-[var(--line-3)] transition-colors mb-3">
                          <Thumb src={p.thumbnail_url} fallback={I.doc} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          <span className="absolute top-2.5 left-2.5">{chip}</span>
                          {deleteBtn(p.id)}
                          {done ? (
                            <button onClick={e => downloadVideo(e, p.final_video_url!, p.title)}
                              className="absolute bottom-2.5 right-2.5 ui-btn ui-btn-sm ui-btn-primary opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0">
                              {I.download}Download
                            </button>
                          ) : (
                            <span className="absolute bottom-2.5 right-2.5 ui-btn ui-btn-sm ui-btn-primary opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none">
                              Continue {I.arrow}
                            </span>
                          )}
                        </div>
                      );
                      const text = (
                        <>
                          <h3 className="text-[13px] font-medium tracking-[-0.01em] truncate mb-1">{p.title}</h3>
                          <Meta parts={[cap(p.genre), style, timeAgo(p.updated_at)]} />
                        </>
                      );
                      return done
                        ? <article key={p.id} className="group">{media}{text}</article>
                        : <Link key={p.id} href={`/create?projectId=${p.id}`} className="group block rounded-xl">{media}{text}</Link>;
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ── Empty state ── */}
            {projects.length === 0 && recent.length === 0 && (
              <section className="relative rounded-3xl border border-[var(--line)] overflow-hidden py-20 px-6 flex flex-col items-center text-center">
                <div className="absolute inset-0 ui-grid-bg ui-fade-mask" />
                <div className="relative w-14 h-14 rounded-2xl ui-card flex items-center justify-center mb-6 text-white">
                  {I.play}
                </div>
                <h3 className="relative text-[22px] font-semibold tracking-[-0.03em] mb-2">Your first video is one prompt away</h3>
                <p className="relative text-[13.5px] text-[var(--fg-3)] max-w-[380px] mb-7">Write an idea, pick a style, and Animave handles the script, visuals, voice and edit.</p>
                <Link href="/create" className="relative ui-btn ui-btn-primary ui-btn-lg">{I.plus}Create your first video</Link>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
