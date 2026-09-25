'use client';

// Animave Editor — assemble clips from your library into a new cut and export it.
// Library = the user's real renders (animations, exported projects, storytelling scene clips)
// plus any video URL. Export merges the timeline server-side via /api/merge-storybook.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Ico, Segmented, Spinner, StudioPanel, ErrorNote } from '@/components/editor/kit';

type Source = 'Video' | 'Scene' | 'Link';
interface Asset { id: string; title: string; url: string; source: Source; thumb?: string | null; created_at?: string }
interface Clip { key: string; assetId: string; title: string; url: string; thumb?: string | null; source: Source }

const DRAFT_KEY = 'animave-editor-draft-v1';
const ZOOMS = [12, 24, 48] as const;

let _k = 0;
const newKey = () => `c${Date.now().toString(36)}${(++_k).toString(36)}`;

function fmt(t: number) {
  const s = Math.max(0, Math.round(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function probeDuration(url: string): Promise<number> {
  return new Promise(resolve => {
    const v = document.createElement('video');
    let done = false;
    const finish = (d: number) => { if (done) return; done = true; v.removeAttribute('src'); v.load(); resolve(d); };
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => finish(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 8);
    v.onerror = () => finish(8);
    setTimeout(() => finish(8), 10000);
    v.src = url;
  });
}

export default function EditorPage() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

  // library
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [libTab, setLibTab] = useState<'all' | Source>('all');
  const [query, setQuery] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkErr, setLinkErr] = useState('');

  // timeline
  const [title, setTitle] = useState('Untitled cut');
  const [clips, setClips] = useState<Clip[]>([]);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(24);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // playback
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [localTime, setLocalTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const pendingSeek = useRef<number | null>(null);

  // export
  const [exportState, setExportState] = useState<'idle' | 'merging' | 'done' | 'error'>('idle');
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportErr, setExportErr] = useState('');

  /* ── Load library ── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingLib(false); return; }
      setUserId(user.id);
      const [animRes, projRes] = await Promise.all([
        supabase.from('animations').select('id, title, final_video_url, created_at')
          .eq('user_id', user.id).not('final_video_url', 'is', null)
          .order('created_at', { ascending: false }).limit(60),
        supabase.from('projects').select('id, title, final_video_url, thumbnail_url, state, updated_at')
          .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30),
      ]);
      const list: Asset[] = [];
      (animRes.data || []).forEach((a: any) => {
        if (a.final_video_url) list.push({ id: `a-${a.id}`, title: a.title || 'Untitled animation', url: a.final_video_url, source: 'Video', created_at: a.created_at });
      });
      (projRes.data || []).forEach((p: any) => {
        if (p.final_video_url) list.push({ id: `p-${p.id}`, title: p.title || 'Untitled project', url: p.final_video_url, source: 'Video', thumb: p.thumbnail_url, created_at: p.updated_at });
        const script: any[] = p.state?.generatedScript || [];
        script.forEach((s, i) => {
          if (s?.videoUrl) list.push({ id: `s-${p.id}-${s.id || i}`, title: `${p.title || 'Project'} · ${s.title || `Scene ${i + 1}`}`, url: s.videoUrl, source: 'Scene', thumb: s.imageUrl, created_at: p.updated_at });
        });
      });
      setAssets(prev => [...list, ...prev.filter(a => a.source === 'Link')]);
      setLoadingLib(false);
    })();
  }, [supabase]);

  /* ── Draft persistence (per browser) ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.title === 'string') setTitle(d.title);
        if (Array.isArray(d.clips)) setClips(d.clips);
        if (Array.isArray(d.links)) setAssets(prev => [...prev, ...d.links]);
      }
    } catch { /* storage unavailable */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, clips, links: assets.filter(a => a.source === 'Link') }));
    } catch { /* storage unavailable */ }
  }, [title, clips, assets, hydrated]);

  /* ── Probe clip durations ── */
  useEffect(() => {
    const missing = Array.from(new Set(clips.map(c => c.url))).filter(u => durations[u] === undefined);
    missing.forEach(u => {
      setDurations(d => ({ ...d, [u]: d[u] ?? 0 }));
      probeDuration(u).then(sec => setDurations(d => ({ ...d, [u]: sec })));
    });
  }, [clips, durations]);

  const durOf = useCallback((c: Clip) => durations[c.url] || 8, [durations]);
  const starts = useMemo(() => {
    let t = 0;
    return clips.map(c => { const s = t; t += durOf(c); return s; });
  }, [clips, durOf]);
  const total = clips.reduce((sum, c) => sum + durOf(c), 0);
  const globalTime = clips.length ? (starts[current] || 0) + localTime : 0;

  /* ── Timeline ops ── */
  const addClip = (a: Asset, at?: number) => {
    const clip: Clip = { key: newKey(), assetId: a.id, title: a.title, url: a.url, thumb: a.thumb, source: a.source };
    setClips(prev => {
      const next = [...prev];
      next.splice(at ?? next.length, 0, clip);
      return next;
    });
    setSelected(clip.key);
    setExportState('idle');
  };
  const removeClip = (key: string) => {
    setClips(prev => {
      const i = prev.findIndex(c => c.key === key);
      const next = prev.filter(c => c.key !== key);
      if (selected === key) setSelected(next[Math.min(i, next.length - 1)]?.key ?? null);
      if (current >= next.length) setCurrent(Math.max(0, next.length - 1));
      return next;
    });
    setExportState('idle');
  };
  const moveClip = (from: number, to: number) => {
    if (to < 0 || to >= clips.length || from === to) return;
    setClips(prev => { const n = [...prev]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; });
    setExportState('idle');
  };
  const duplicateClip = (key: string) => {
    const i = clips.findIndex(c => c.key === key);
    if (i < 0) return;
    const copy = { ...clips[i], key: newKey() };
    setClips(prev => { const n = [...prev]; n.splice(i + 1, 0, copy); return n; });
    setSelected(copy.key);
    setExportState('idle');
  };

  /* ── Playback ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.play().catch(() => setPlaying(false)); else v.pause();
  }, [playing, current]);

  const seekGlobal = (t: number) => {
    if (!clips.length) return;
    const clamped = Math.max(0, Math.min(total - 0.05, t));
    let i = starts.findIndex((s, idx) => clamped >= s && clamped < s + durOf(clips[idx]));
    if (i < 0) i = clips.length - 1;
    const offset = clamped - starts[i];
    if (i === current && videoRef.current) videoRef.current.currentTime = offset;
    else { pendingSeek.current = offset; setCurrent(i); }
    setLocalTime(offset);
    setSelected(clips[i].key);
  };

  const jumpTo = (i: number) => {
    if (i < 0 || i >= clips.length) return;
    pendingSeek.current = 0;
    setCurrent(i);
    setLocalTime(0);
    setSelected(clips[i].key);
  };

  const onEnded = () => {
    if (current < clips.length - 1) { pendingSeek.current = 0; setCurrent(current + 1); setLocalTime(0); }
    else setPlaying(false);
  };

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); if (clips.length) setPlaying(p => !p); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); removeClip(selected); }
      if (e.key === 'ArrowRight') { e.preventDefault(); jumpTo(Math.min(clips.length - 1, current + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); jumpTo(Math.max(0, current - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ── Library ── */
  const addLink = () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) { setLinkErr('Paste a full http(s) video URL.'); return; }
    const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Linked video');
    const a: Asset = { id: `l-${newKey()}`, title: name, url, source: 'Link' };
    setAssets(prev => [...prev, a]);
    addClip(a);
    setLinkUrl(''); setLinkErr('');
  };

  const visibleAssets = assets.filter(a =>
    (libTab === 'all' || a.source === libTab) &&
    (!query.trim() || a.title.toLowerCase().includes(query.trim().toLowerCase())));

  /* ── Export ── */
  const exportCut = async () => {
    if (!clips.length) return;
    setExportState('merging'); setExportErr(''); setExportUrl(null); setPlaying(false);
    try {
      const r = await fetch('/api/merge-storybook', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_urls: clips.map(c => c.url) }),
      });
      const d = await r.json();
      if (!r.ok || !d.final_video_url) throw new Error(d.error || d.detail || 'Merge failed');
      setExportUrl(d.final_video_url);
      setExportState('done');
      if (userId) {
        try {
          await supabase.from('animations').insert({
            user_id: userId, title: title.trim() || 'Untitled cut', status: 'completed',
            scenes_count: clips.length, final_video_url: d.final_video_url,
          });
        } catch { /* non-fatal: export still succeeded */ }
      }
    } catch (e: any) {
      setExportErr(e?.message || 'Export failed. Please try again.');
      setExportState('error');
    }
  };

  const selIndex = clips.findIndex(c => c.key === selected);
  const selClip = selIndex >= 0 ? clips[selIndex] : null;
  const active = clips[current] || null;
  const downloadHref = exportUrl ? `/api/download?url=${encodeURIComponent(exportUrl)}&filename=${encodeURIComponent(`${(title || 'animave-cut').replace(/[^\w .-]/g, '').trim() || 'animave-cut'}.mp4`)}` : '';

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ── */}
      <header className="flex-shrink-0 h-12 px-4 flex items-center gap-4 border-b border-[var(--line)] bg-black">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="min-w-0">
            <div className="ui-eyebrow !text-[9.5px] leading-none mb-1">Editor</div>
            <input value={title} onChange={e => setTitle(e.target.value)} aria-label="Cut title"
              className="bg-transparent text-[14px] font-semibold tracking-[-0.02em] outline-none border-b border-transparent hover:border-[var(--line-2)] focus:border-white/40 w-[240px] max-w-full transition-colors" />
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 ui-mono text-[11px] text-[var(--fg-4)]">
          <span>{clips.length} clips</span>
          <span>{fmt(total)}</span>
        </div>
        <button onClick={() => { setClips([]); setSelected(null); setCurrent(0); setLocalTime(0); setPlaying(false); setExportState('idle'); }}
          disabled={!clips.length} className="ui-btn ui-btn-sm ui-btn-ghost">Clear</button>
        <button onClick={exportCut} disabled={!clips.length || exportState === 'merging'} className="ui-btn ui-btn-primary">
          {exportState === 'merging' ? <><Spinner size={13} className="!border-black/15 !border-t-black" />Exporting…</> : <>Export{Ico.arrow}</>}
        </button>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-[280px_minmax(0,1fr)_288px] gap-3 p-3 pb-0">
        {/* ── Library ── */}
        <StudioPanel title="Library" sub={loadingLib ? 'loading' : `${assets.length} items`} bodyClass="flex flex-col">
          <div className="p-3 flex flex-col gap-2.5 border-b border-[var(--line)]">
            <div className="flex items-center gap-2 h-9 px-3 rounded-[10px] bg-white/[0.03] border border-[var(--line)] focus-within:border-white/30 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--fg-4)]"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search library" className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[var(--fg-4)] min-w-0" />
            </div>
            <Segmented full size="sm" value={libTab} onChange={setLibTab}
              options={[{ value: 'all' as const, label: 'All' }, { value: 'Video' as const, label: 'Videos' }, { value: 'Scene' as const, label: 'Scenes' }, { value: 'Link' as const, label: 'Links' }]} />
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loadingLib ? (
              <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[58px] rounded-[10px] ui-shimmer" />)}</div>
            ) : visibleAssets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-3">
                <span className="text-white/20">{Ico.film}</span>
                <p className="text-[12px] text-[var(--fg-4)] leading-relaxed">
                  {assets.length ? 'Nothing matches this filter.' : 'Your rendered videos and scene clips show up here.'}
                </p>
                {!assets.length && <Link href="/create" className="ui-btn ui-btn-sm ui-btn-secondary">Create a video</Link>}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {visibleAssets.map(a => (
                  <div key={a.id} draggable onDragStart={e => e.dataTransfer.setData('text/animave-asset', a.id)}
                    className="group flex items-center gap-2.5 p-1.5 pr-2 rounded-[10px] hover:bg-white/[0.04] transition-colors cursor-grab active:cursor-grabbing">
                    <div className="relative w-[72px] aspect-video rounded-[7px] overflow-hidden bg-[#111] border border-[var(--line)] flex-shrink-0">
                      {a.thumb
                        ? <img src={a.thumb} alt="" className="w-full h-full object-cover" />
                        : <video src={`${a.url}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium truncate">{a.title}</div>
                      <div className="ui-mono text-[9.5px] text-[var(--fg-4)] uppercase tracking-wider mt-0.5">{a.source}</div>
                    </div>
                    <button onClick={() => addClip(a)} aria-label={`Add ${a.title} to timeline`} title="Add to timeline"
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black transition-all">
                      {Ico.plus}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[var(--line)]">
            <div className="flex items-center gap-1.5">
              <input value={linkUrl} onChange={e => { setLinkUrl(e.target.value); setLinkErr(''); }} onKeyDown={e => { if (e.key === 'Enter') addLink(); }}
                placeholder="Paste a video URL" className="flex-1 min-w-0 h-8 px-3 rounded-[9px] bg-white/[0.03] border border-[var(--line)] text-[12px] outline-none focus:border-white/30 placeholder:text-[var(--fg-4)]" />
              <button onClick={addLink} disabled={!linkUrl.trim()} className="ui-btn ui-btn-sm ui-btn-secondary">Add</button>
            </div>
            {linkErr && <p className="text-[11px] text-[#ff8a8a] mt-1.5">{linkErr}</p>}
          </div>
        </StudioPanel>

        {/* ── Preview ── */}
        <StudioPanel title={active ? active.title : 'Preview'} sub={active ? `clip ${current + 1} of ${clips.length}` : undefined} bodyClass="flex flex-col">
          <div className="relative flex-1 min-h-0 p-3 flex items-center justify-center">
            {exportState === 'done' && exportUrl ? (
              <div className="relative w-full max-w-[720px]">
                <video src={exportUrl} controls autoPlay className="w-full aspect-video rounded-[12px] bg-black border border-[var(--line-2)]" />
              </div>
            ) : active ? (
              <video
                ref={videoRef}
                key={active.key}
                src={active.url}
                playsInline
                onClick={() => setPlaying(p => !p)}
                onLoadedMetadata={e => {
                  if (pendingSeek.current !== null) { e.currentTarget.currentTime = pendingSeek.current; pendingSeek.current = null; }
                  if (playing) e.currentTarget.play().catch(() => setPlaying(false));
                }}
                onTimeUpdate={e => setLocalTime(e.currentTarget.currentTime)}
                onEnded={onEnded}
                className="relative max-w-full max-h-full rounded-[12px] bg-black border border-[var(--line-2)] cursor-pointer"
              />
            ) : (
              <div className="relative text-center">
                <span className="inline-flex text-white/20 mb-3">{Ico.film}</span>
                <p className="text-[13px] text-[var(--fg-3)]">Add clips from the library to start a cut.</p>
                <p className="text-[11.5px] text-[var(--fg-4)] mt-1">Drag them onto the timeline or press +.</p>
              </div>
            )}
          </div>
          <div className="h-12 px-3 flex items-center gap-1.5 border-t border-[var(--line)] flex-shrink-0">
            <button onClick={() => jumpTo(current - 1)} disabled={current === 0 || !clips.length} aria-label="Previous clip" className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--fg-3)] hover:text-white hover:bg-white/[0.06] disabled:opacity-30">{Ico.rewind}</button>
            <button onClick={() => setPlaying(p => !p)} disabled={!clips.length || exportState === 'done'} aria-label={playing ? 'Pause' : 'Play'} className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-black disabled:opacity-30">{playing ? Ico.pause : Ico.play}</button>
            <button onClick={() => jumpTo(current + 1)} disabled={current >= clips.length - 1} aria-label="Next clip" className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--fg-3)] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 rotate-180">{Ico.rewind}</button>
            <span className="ml-2 ui-mono text-[11.5px] text-[var(--fg-2)] tabular-nums">{fmt(globalTime)} <span className="text-[var(--fg-4)]">/ {fmt(total)}</span></span>
            {exportState === 'done' && <button onClick={() => setExportState('idle')} className="ml-auto ui-btn ui-btn-sm ui-btn-ghost">Back to timeline</button>}
          </div>
        </StudioPanel>

        {/* ── Inspector ── */}
        <StudioPanel title={exportState === 'idle' ? 'Inspector' : 'Export'} bodyClass="overflow-y-auto">
          <div className="p-4 flex flex-col gap-4">
            {exportState === 'merging' && (
              <div className="rounded-[10px] border border-[var(--line)] p-4 flex items-center gap-3">
                <Spinner size={18} />
                <div>
                  <div className="text-[13px] font-medium">Merging {clips.length} clips…</div>
                  <div className="text-[11.5px] text-[var(--fg-4)]">This usually takes under a minute.</div>
                </div>
              </div>
            )}
            {exportState === 'done' && exportUrl && (
              <div className="rounded-[10px] border border-[var(--line-2)] bg-white/[0.03] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[13px] font-medium"><span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">{Ico.check}</span>Export ready</div>
                <p className="text-[11.5px] text-[var(--fg-3)]">{fmt(total)} · {clips.length} clips · saved to Home.</p>
                <a href={downloadHref} className="ui-btn ui-btn-primary w-full">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></svg>
                  Download MP4
                </a>
                <Link href="/dashboard" className="ui-btn ui-btn-sm ui-btn-ghost w-full">Open Home</Link>
              </div>
            )}
            {exportState === 'error' && <ErrorNote>{exportErr}</ErrorNote>}

            {selClip ? (
              <>
                <div>
                  <div className="ui-eyebrow mb-2">Clip {String(selIndex + 1).padStart(2, '0')}</div>
                  <div className="text-[14px] font-semibold tracking-[-0.01em] leading-snug">{selClip.title}</div>
                </div>
                <div className="grid grid-cols-2 gap-px rounded-[12px] overflow-hidden border border-[var(--line)] bg-[var(--line)]">
                  {[['Source', selClip.source], ['Duration', durations[selClip.url] ? fmt(durations[selClip.url]) : '…'], ['Starts at', fmt(starts[selIndex] || 0)], ['Position', `${selIndex + 1} / ${clips.length}`]].map(([k, v]) => (
                    <div key={k} className="bg-[#070707] p-3">
                      <div className="ui-eyebrow !text-[9px] mb-1">{k}</div>
                      <div className="text-[12.5px] ui-mono">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => moveClip(selIndex, selIndex - 1)} disabled={selIndex === 0} className="ui-btn ui-btn-sm ui-btn-secondary">{Ico.back}Earlier</button>
                  <button onClick={() => moveClip(selIndex, selIndex + 1)} disabled={selIndex === clips.length - 1} className="ui-btn ui-btn-sm ui-btn-secondary">Later{Ico.arrow}</button>
                  <button onClick={() => duplicateClip(selClip.key)} className="ui-btn ui-btn-sm ui-btn-secondary">Duplicate</button>
                  <button onClick={() => removeClip(selClip.key)} className="ui-btn ui-btn-sm ui-btn-secondary hover:!text-[#ff8a8a]">Remove</button>
                </div>
                <button onClick={() => { jumpTo(selIndex); setPlaying(true); }} className="ui-btn ui-btn-sm ui-btn-ghost">{Ico.play}Play from here</button>
              </>
            ) : exportState === 'idle' && (
              <div className="flex flex-col gap-3">
                <p className="text-[12.5px] text-[var(--fg-3)] leading-relaxed">Select a clip on the timeline to inspect, reorder or remove it.</p>
                <div className="rounded-[12px] border border-[var(--line)] p-3.5 flex flex-col gap-2">
                  <div className="ui-eyebrow !text-[9.5px]">How it works</div>
                  <ol className="text-[12px] text-[var(--fg-3)] leading-relaxed list-decimal pl-4 space-y-1">
                    <li>Add renders or scene clips from the library.</li>
                    <li>Drag clips on the timeline to reorder them.</li>
                    <li>Export merges everything into one MP4.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </StudioPanel>
      </div>

      {/* ── Timeline ── */}
      <section className="flex-shrink-0 m-3 rounded-[10px] bg-[#060606] border border-[var(--line)] overflow-hidden"
        onDragOver={e => { if (e.dataTransfer.types.includes('text/animave-asset')) e.preventDefault(); }}
        onDrop={e => {
          const id = e.dataTransfer.getData('text/animave-asset');
          const a = assets.find(x => x.id === id);
          if (a) addClip(a, dragOver ?? undefined);
          setDragOver(null);
        }}>
        <div className="flex items-center justify-between h-10 px-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            <span className="ui-eyebrow">Timeline</span>
            <span className="ui-mono text-[10.5px] text-[var(--fg-4)]">{clips.length} clips · {fmt(total)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden lg:flex items-center gap-2 text-[10.5px] text-[var(--fg-4)]">
              <span className="ui-kbd">Space</span>play <span className="ui-kbd">← →</span>clips <span className="ui-kbd">⌫</span>remove
            </span>
            <Segmented size="sm" value={zoom} onChange={setZoom} options={ZOOMS.map((z, i) => ({ value: z, label: `${i === 0 ? '−' : i === 1 ? '1×' : '+'}` }))} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="relative min-w-full" style={{ width: Math.max(900, total * zoom + 160) }}>
            {/* ruler */}
            <div className="h-7 border-b border-[var(--line)] relative cursor-pointer"
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekGlobal((e.clientX - r.left - 16) / zoom); }}>
              {Array.from({ length: Math.ceil((total + 10) / 5) + 1 }, (_, i) => i * 5).map(t => (
                <div key={t} className="absolute top-0 h-full" style={{ left: 16 + t * zoom }}>
                  <div className="ui-mono text-[9.5px] text-[var(--fg-4)] mt-1.5 ml-1">{fmt(t)}</div>
                  <div className="absolute bottom-0 left-0 h-2 w-px bg-white/20" />
                </div>
              ))}
            </div>

            {/* track */}
            <div className="h-[88px] relative flex items-center px-4 gap-1">
              {clips.length === 0 ? (
                <div className="h-[62px] w-[420px] rounded-[12px] border border-dashed border-[var(--line-2)] flex items-center justify-center text-[12px] text-[var(--fg-4)]">
                  Drop clips here
                </div>
              ) : clips.map((c, i) => {
                const on = c.key === selected;
                const w = Math.max(64, durOf(c) * zoom - 4);
                return (
                  <div key={c.key} draggable
                    onDragStart={e => { dragFrom.current = i; e.dataTransfer.setData('text/animave-clip', String(i)); }}
                    onDragOver={e => { e.preventDefault(); setDragOver(i); }}
                    onDrop={e => {
                      e.stopPropagation();
                      const assetId = e.dataTransfer.getData('text/animave-asset');
                      if (assetId) { const a = assets.find(x => x.id === assetId); if (a) addClip(a, i); }
                      else if (dragFrom.current !== null) moveClip(dragFrom.current, i);
                      dragFrom.current = null; setDragOver(null);
                    }}
                    onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                    onClick={() => { setSelected(c.key); jumpTo(i); }}
                    style={{ width: w }}
                    className={`relative h-[62px] rounded-[12px] border overflow-hidden flex-shrink-0 cursor-pointer transition-colors ${on ? 'border-white' : 'border-[var(--line-2)] hover:border-[var(--line-3)]'} ${dragOver === i ? 'ml-6' : ''}`}>
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: Math.max(1, Math.floor(w / 72)) }).map((_, k) => (
                        <div key={k} className="h-full flex-1 bg-[#131313] border-r border-black/40 overflow-hidden">
                          {c.thumb ? <img src={c.thumb} alt="" className="w-full h-full object-cover opacity-70" /> : k === 0 ? <video src={`${c.url}#t=0.1`} muted preload="metadata" className="w-full h-full object-cover opacity-70" /> : null}
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <div className="absolute left-2 right-2 bottom-1.5 flex items-center gap-1.5">
                      <span className="ui-mono text-[9.5px] text-white/60">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[10.5px] font-medium truncate">{c.title}</span>
                      <span className="ml-auto ui-mono text-[9.5px] text-white/60">{durations[c.url] ? fmt(durations[c.url]) : '…'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* playhead */}
            {clips.length > 0 && (
              <div className="absolute top-0 bottom-0 w-px bg-white pointer-events-none transition-[left] duration-100" style={{ left: 16 + globalTime * zoom }}>
                <div className="absolute -top-px -left-[5px] w-[11px] h-2.5 rounded-b-[3px] bg-white" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
