'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// Video analysis: drop in a reel you like (file or link) → how it's made: shots and cut rhythm, camera, look and palette,
// tempo and hits, contact sheets, and a written style breakdown. Measurement engine from ReelMimic (MIT), on the backend.

interface Shot { shot: number; start: number; end: number; camera: string[]; pace: string; brightness: number; colourfulness: number; dominant: string[] }
interface Report {
  video: { duration: number; width: number; height: number; fps: number; has_audio: boolean } | null;
  crop: { w: number; h: number; note: string } | null;
  pacing: { count: number; mean_shot_s: number | null; shortest_s: number | null; longest_s: number | null; mean_shot_beats?: number };
  look_summary?: { low_key_shots: number; moving_camera_shots: number; mean_brightness: number; camera_kinds: string[] };
  audio: { present: boolean; silent?: boolean; bpm?: number; first_beat?: number; beat_count?: number; note?: string;
           peak_candidates?: { t: number; kind: string }[] };
  flashes: number[];
  shots: Shot[];
  motion: { cadence?: { label?: string; drawings_per_second?: number }; peaks?: { t: number }[] } | null;
}
interface Breakdown {
  summary: string; format: string; hook: string; structure: { start: number; end: number; beat: string }[];
  pacing: string; camera: string; look: string; palette?: string[]; text_and_graphics: string; sound: string;
  recreate: string[]; animave_format: string;
}
interface Job {
  status: string; stage: string; step: number; total_steps: number; message: string; source: string; error?: string;
  report: Report | null; breakdown: Breakdown | null; breakdown_error?: string;
  files: { sheet_1fps?: string; sheet_scenes?: string; fingerprint?: string; report?: string };
}

const STAGES = [['measuring', 'Measuring'], ['publishing', 'Saving'], ['describing', 'Writing breakdown']] as const;
const fmt = (s?: number | null) => (s == null ? '—' : s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

function send(fd: FormData, token: string, onProgress: (p: number) => void): Promise<{ job_id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/analyze-video`);
    xhr.setRequestHeader('x-upload-token', token);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      try { const d = JSON.parse(xhr.responseText || '{}'); if (xhr.status < 300 && d.job_id) resolve(d); else reject(new Error(d.detail || `Request failed (${xhr.status})`)); }
      catch { reject(new Error(`Request failed (${xhr.status})`)); }
    };
    xhr.onerror = () => reject(new Error('Request failed (network)'));
    xhr.send(fd);
  });
}

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [brief, setBrief] = useState('');
  const [lang, setLang] = useState<'en' | 'tr'>('en');
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { const id = sessionStorage.getItem('analysis-job'); if (id) setJobId(id); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/analysis/${jobId}`, { cache: 'no-store' });
        if (r.status === 404) { setJobId(null); setJob(null); try { sessionStorage.removeItem('analysis-job'); } catch {} return; }
        const d = await r.json();
        if (!stop) setJob(d);
        if (d.status === 'completed' || d.status === 'failed') return;
      } catch { /* retry */ }
      if (!stop) setTimeout(tick, 2500);
    };
    tick();
    return () => { stop = true; };
  }, [jobId]);

  const start = async () => {
    setErr('');
    if (!file && !url.trim()) { setErr('Add a video file or paste a link.'); return; }
    if (file && file.size > 300 * 1024 * 1024) { setErr('The file is larger than 300 MB.'); return; }
    let token = '';
    try { const r = await fetch('/api/studio/upload-token', { method: 'POST' }); const d = await r.json(); token = d.token || ''; if (!token) throw new Error(d.error); }
    catch (e) { setErr((e as Error).message || 'Analysis is unavailable right now.'); return; }
    const fd = new FormData();
    if (file) fd.append('file', file); else fd.append('url', url.trim());
    fd.append('brief', brief.trim()); fd.append('lang', lang);
    setProgress(0);
    try {
      const { job_id } = await send(fd, token, setProgress);
      setJob(null); setJobId(job_id);
      try { sessionStorage.setItem('analysis-job', job_id); } catch {}
    } catch (e) { setErr((e as Error).message); }
    setProgress(null);
  };

  const reset = () => { setJobId(null); setJob(null); setFile(null); setUrl(''); try { sessionStorage.removeItem('analysis-job'); } catch {} };
  const running = !!jobId && (!job || (job.status !== 'completed' && job.status !== 'failed'));

  return (
    <div className="min-h-screen">
      <div className="max-w-[1180px] mx-auto px-4 md:px-8 pt-10 pb-20">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <Link href="/youtube" className="ui-eyebrow mb-2 inline-block hover:text-[var(--fg-2)]">← Long videos</Link>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Video analysis</h1>
            <p className="text-[14px] text-[var(--fg-3)] mt-1.5 max-w-[600px]">Show it a reel you like. It measures the cuts, camera moves, colours and beat, then explains how the video is built and how to make your own in the same style.</p>
          </div>
          {jobId && !running && <button className="ui-btn ui-btn-secondary" onClick={reset}>New analysis</button>}
        </div>

        {!jobId && (
          <div className="ui-card p-5 md:p-6 max-w-[760px]">
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setUrl(''); } }}
              onClick={() => fileRef.current?.click()}
              className={`rounded-lg border border-dashed px-5 py-9 text-center cursor-pointer transition ${drag ? 'border-white/60 bg-white/[0.04]' : 'border-[var(--line-3)] hover:bg-white/[0.02]'}`}>
              <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setUrl(''); } }} />
              {file
                ? <div className="text-[13.5px]"><span className="font-medium">{file.name}</span> <span className="text-[var(--fg-4)]">· {(file.size / 1048576).toFixed(1)} MB</span></div>
                : <><div className="text-[14px] font-medium">Drop a video here or click to choose</div><div className="text-[12px] text-[var(--fg-4)] mt-1">MP4, MOV, WebM · up to 300 MB · up to 10 minutes</div></>}
            </div>
            <div className="flex items-center gap-3 my-4 text-[11px] text-[var(--fg-4)]"><div className="flex-1 h-px bg-[var(--line)]" />or paste a link<div className="flex-1 h-px bg-[var(--line)]" /></div>
            <input className="ui-input" placeholder="https://… (TikTok, Instagram, YouTube Shorts, direct MP4)" value={url}
              onChange={e => { setUrl(e.target.value); if (e.target.value) setFile(null); }} />
            <label className="block ui-eyebrow mt-5 mb-1.5">What do you want to make in this style? (optional)</label>
            <input className="ui-input" maxLength={400} placeholder="e.g. a 30 s reel about how coffee is roasted" value={brief} onChange={e => setBrief(e.target.value)} />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--fg-3)]">
                Breakdown language
                {(['en', 'tr'] as const).map(l => (
                  <button key={l} type="button" onClick={() => setLang(l)}
                    className={`ui-btn ui-btn-sm ${lang === l ? 'ui-btn-secondary' : 'ui-btn-ghost'}`}>{l === 'en' ? 'English' : 'Türkçe'}</button>
                ))}
              </div>
              <button className="ui-btn ui-btn-primary ui-btn-lg" disabled={progress !== null} onClick={start}>
                {progress !== null ? (file ? `Uploading ${Math.round(progress * 100)}%` : 'Starting…') : 'Analyze'}
              </button>
            </div>
            {err && <div className="text-[12.5px] text-rose-300 mt-3">{err}</div>}
            <p className="text-[11.5px] text-[var(--fg-4)] mt-4">Only analyse videos you have the right to use. The breakdown describes the style; it never copies the footage, characters or music.</p>
          </div>
        )}

        {running && (
          <div className="ui-card p-6 max-w-[760px]">
            <div className="text-[14px] font-medium mb-1">{job?.message || 'Queued'}</div>
            <div className="text-[12px] text-[var(--fg-4)] mb-5 truncate">{job?.source}</div>
            <div className="flex gap-2">
              {STAGES.map(([key, label], i) => {
                const step = job?.step || 0; const state = step > i + 1 ? 'done' : step === i + 1 ? 'now' : 'todo';
                return (
                  <div key={key} className="flex-1">
                    <div className={`h-1 rounded-full ${state === 'done' ? 'bg-white/70' : state === 'now' ? 'bg-white/40 animate-pulse' : 'bg-white/10'}`} />
                    <div className={`text-[11px] mt-1.5 ${state === 'todo' ? 'text-[var(--fg-4)]' : 'text-[var(--fg-2)]'}`}>{label}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-[12px] text-[var(--fg-4)] mt-5">A 30–60 s reel usually takes 1–3 minutes. You can leave this page and come back.</p>
          </div>
        )}

        {job?.status === 'failed' && (
          <div className="ui-card p-5 max-w-[760px] border-rose-300/20">
            <div className="text-[14px] font-medium text-rose-200">The analysis stopped</div>
            <div className="text-[13px] text-[var(--fg-3)] mt-1">{job.error}</div>
            <button className="ui-btn ui-btn-secondary mt-4" onClick={reset}>Try another video</button>
          </div>
        )}

        {job?.status === 'completed' && job.report && <Result job={job} />}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ui-card p-4">
      <div className="ui-eyebrow">{label}</div>
      <div className="text-[22px] font-semibold tracking-[-0.02em] mt-1">{value}</div>
      {sub && <div className="text-[11.5px] text-[var(--fg-4)] mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ui-card p-4">
      <div className="ui-eyebrow mb-1.5">{title}</div>
      <div className="text-[13.5px] text-[var(--fg-2)] leading-relaxed">{children}</div>
    </div>
  );
}

function Result({ job }: { job: Job }) {
  const r = job.report!; const b = job.breakdown; const dur = r.video?.duration || 1;
  const au = r.audio;
  const palette = b?.palette?.length ? b.palette : Array.from(new Set(r.shots.flatMap(s => s.dominant))).slice(0, 6);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Length" value={fmt(r.video?.duration)} sub={r.video ? `${r.video.width}×${r.video.height} · ${r.video.fps} fps` : undefined} />
        <Stat label="Shots" value={String(r.pacing.count || 1)} sub={r.pacing.mean_shot_s ? `avg ${r.pacing.mean_shot_s}s · ${r.pacing.shortest_s}–${r.pacing.longest_s}s` : 'one continuous shot'} />
        <Stat label="Tempo" value={au.bpm ? `${Math.round(au.bpm)} BPM` : au.present ? (au.silent ? 'Silent' : '—') : 'No audio'}
          sub={r.pacing.mean_shot_beats ? `${r.pacing.mean_shot_beats} beats per shot` : undefined} />
        <Stat label="Moving camera" value={r.look_summary ? `${Math.round(r.look_summary.moving_camera_shots * 100)}%` : '—'}
          sub={r.motion?.cadence?.label ? `motion: ${r.motion.cadence.label}` : undefined} />
      </div>

      {/* Timeline: shots coloured by their main colour; hits and flashes marked */}
      <div className="ui-card p-4">
        <div className="flex items-center justify-between mb-2"><div className="ui-eyebrow">Timeline</div>
          <div className="flex gap-3 text-[11px] text-[var(--fg-4)]"><span>▲ music hit</span><span>✦ flash frame</span></div></div>
        <div className="relative h-10 rounded-md overflow-hidden flex bg-white/5">
          {(r.shots.length ? r.shots : [{ shot: 1, start: 0, end: dur, dominant: ['#333'] } as Shot]).map(s => (
            <div key={s.shot} title={`Shot ${s.shot} · ${fmt(s.start)}–${fmt(s.end)}${s.camera ? ' · ' + s.camera.join(', ') : ''}`}
              style={{ width: `${((s.end - s.start) / dur) * 100}%`, background: s.dominant[0] }} className="h-full border-r border-black/50 last:border-0" />
          ))}
        </div>
        <div className="relative h-4 mt-1 text-[10px] text-[var(--fg-3)]">
          {(au.peak_candidates || []).map(p => <span key={`p${p.t}`} className="absolute -translate-x-1/2" style={{ left: `${(p.t / dur) * 100}%` }} title={`${p.kind} at ${fmt(p.t)}`}>▲</span>)}
          {r.flashes.map(t => <span key={`f${t}`} className="absolute -translate-x-1/2 text-amber-200" style={{ left: `${(t / dur) * 100}%` }} title={`flash at ${fmt(t)}`}>✦</span>)}
        </div>
        {b?.structure?.length ? (
          <div className="relative h-7 mt-1 flex">
            {b.structure.map((s, i) => (
              <div key={i} style={{ width: `${(Math.max(0, Math.min(s.end, dur) - s.start) / dur) * 100}%` }}
                className="h-full px-1.5 border-l border-[var(--line-3)] text-[11px] text-[var(--fg-3)] truncate leading-7" title={`${fmt(s.start)}–${fmt(s.end)} · ${s.beat}`}>{s.beat}</div>
            ))}
          </div>
        ) : null}
      </div>

      {b ? (
        <>
          <div className="ui-card p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2"><span className="ui-chip">{b.format}</span></div>
            <p className="text-[15px] leading-relaxed">{b.summary}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section title="Hook (first seconds)">{b.hook}</Section>
            <Section title="Pacing & editing">{b.pacing}</Section>
            <Section title="Camera">{b.camera}</Section>
            <Section title="Look">
              {b.look}
              {palette.length > 0 && <div className="flex gap-1.5 mt-3">{palette.map(c => <div key={c} title={c} className="w-7 h-7 rounded-md border border-white/10" style={{ background: c }} />)}</div>}
            </Section>
            <Section title="Text & graphics">{b.text_and_graphics}</Section>
            <Section title="Sound">{b.sound}</Section>
          </div>
          <div className="ui-card p-5">
            <div className="ui-eyebrow mb-2">Make one like it</div>
            <ol className="list-decimal pl-5 space-y-1.5 text-[13.5px] text-[var(--fg-2)]">{b.recreate.map((x, i) => <li key={i}>{x}</li>)}</ol>
            <div className="text-[13px] text-[var(--fg-3)] mt-4 pt-4 border-t border-[var(--line)]"><span className="text-[var(--fg)] font-medium">Closest Animave format: </span>{b.animave_format}</div>
          </div>
        </>
      ) : (
        <div className="ui-card p-4 text-[13px] text-amber-200/90">The written breakdown couldn’t be made this time{job.breakdown_error ? ` (${job.breakdown_error})` : ''}; the measurements below are complete.</div>
      )}

      {(job.files.sheet_scenes || job.files.sheet_1fps) && (
        <div className="space-y-3">
          {job.files.sheet_scenes && <figure className="ui-card p-3"><figcaption className="ui-eyebrow mb-2">Every shot (middle frame)</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src={job.files.sheet_scenes} alt="Middle frame of every shot" className="w-full rounded-md" /></figure>}
          {job.files.sheet_1fps && <figure className="ui-card p-3"><figcaption className="ui-eyebrow mb-2">One frame per second</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}<img src={job.files.sheet_1fps} alt="One frame per second" className="w-full rounded-md" /></figure>}
        </div>
      )}

      {r.shots.length > 0 && (
        <details className="ui-card p-4">
          <summary className="ui-eyebrow cursor-pointer">Shot list ({r.shots.length})</summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-[12.5px]">
              <thead className="text-[var(--fg-4)] text-left"><tr><th className="py-1.5 pr-3 font-medium">#</th><th className="pr-3 font-medium">Time</th><th className="pr-3 font-medium">Length</th><th className="pr-3 font-medium">Camera</th><th className="pr-3 font-medium">Pace</th><th className="font-medium">Colours</th></tr></thead>
              <tbody>{r.shots.map(s => (
                <tr key={s.shot} className="border-t border-[var(--line)]">
                  <td className="py-1.5 pr-3 text-[var(--fg-4)]">{s.shot}</td><td className="pr-3 ui-mono">{fmt(s.start)}</td><td className="pr-3 ui-mono">{(s.end - s.start).toFixed(1)}s</td>
                  <td className="pr-3">{s.camera.join(', ').replace(/_/g, ' ')}</td><td className="pr-3 text-[var(--fg-3)]">{s.pace}</td>
                  <td><div className="flex gap-1">{s.dominant.map(c => <span key={c} className="w-3.5 h-3.5 rounded-sm inline-block" style={{ background: c }} />)}</div></td>
                </tr>))}</tbody>
            </table>
          </div>
        </details>
      )}
      {job.files.report && <a href={job.files.report} target="_blank" rel="noreferrer" className="ui-btn ui-btn-ghost ui-btn-sm">Download raw report (JSON)</a>}
    </div>
  );
}
