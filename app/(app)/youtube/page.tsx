'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LONG_TEMPLATES, type LongTemplate } from '@/lib/long';

// Long videos (YouTube, 16:9): a few templates, and every project you started, ready to continue.

interface Row { id: string; template: string; title: string; status: string; minutes: number; credits: number; thumbnail_url: string | null; final_video_url: string | null; updated_at: string }

const STATUS: Record<string, { label: string; tone: string }> = {
  planning: { label: 'Writing the plan', tone: 'text-sky-300 border-sky-300/30' },
  awaiting_approval: { label: 'Plan ready · review', tone: 'text-amber-300 border-amber-300/30' },
  producing: { label: 'In production', tone: 'text-violet-300 border-violet-300/30' },
  completed: { label: 'Ready', tone: 'text-emerald-300 border-emerald-300/30' },
  failed: { label: 'Stopped', tone: 'text-rose-300 border-rose-300/30' },
};

function ago(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LongVideosPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [creating, setCreating] = useState<LongTemplate | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('video_projects').select('*').order('updated_at', { ascending: false }).limit(60);
      if (error) { setTableMissing(/relation|does not exist|schema cache/i.test(error.message)); setRows([]); return; }
      setRows(data as Row[]);
    })();
  }, []);

  const open = rows?.filter(r => r.status !== 'completed') || [];
  const done = rows?.filter(r => r.status === 'completed') || [];

  return (
    <div className="min-h-screen">
      <div className="max-w-[1180px] mx-auto px-8 pt-10 pb-20">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <div className="ui-eyebrow mb-2">YouTube · 16:9 · 1080p</div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Long videos</h1>
            <p className="text-[14px] text-[var(--fg-3)] mt-1.5 max-w-[560px]">Minutes-long videos made part by part. You read and approve the script and the shot plan first; every finished step is saved, so you can leave and continue any time.</p>
          </div>
        </div>

        <div className="ui-eyebrow mb-3">Templates</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {LONG_TEMPLATES.map(t => (
            <button key={t.key} type="button" disabled={!t.ready} onClick={() => setCreating(t)}
              className={`group text-left ui-card overflow-hidden transition ${t.ready ? 'hover:border-[var(--line-3)]' : 'opacity-55 cursor-default'}`}>
              <div className="relative aspect-video bg-[#111] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.poster} alt="" className={`w-full h-full object-cover ${t.ready ? 'group-hover:scale-[1.03]' : 'grayscale'} transition-transform duration-500`} />
                <span className="absolute top-2.5 left-2.5 ui-chip">{t.ready ? 'New' : 'Soon'}</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[14px] font-medium">{t.title}</div>
                  {t.ready && <div className="text-[11px] text-[var(--fg-4)]">{t.perMinute} credits / min</div>}
                </div>
                <div className="text-[12.5px] text-[var(--fg-3)] mt-1 line-clamp-2">{t.ready ? t.desc : t.tagline}</div>
              </div>
            </button>
          ))}
        </div>

        {tableMissing && (
          <div className="ui-card p-4 mb-8 text-[13px] text-amber-200/90 border-amber-300/20">
            Projects can’t be listed yet: run <code className="text-amber-100">supabase/migrations/20261103_video_projects.sql</code> once in the Supabase SQL editor.
          </div>
        )}

        <Section title="In progress" rows={open} empty={rows !== null && !open.length ? 'Nothing in progress. Pick a template to start a video.' : ''} loading={rows === null} />
        {done.length > 0 && <Section title="Finished" rows={done} />}
      </div>
      {creating && <NewProject tpl={creating} onClose={() => setCreating(null)} />}
    </div>
  );
}

function Section({ title, rows, empty, loading }: { title: string; rows: Row[]; empty?: string; loading?: boolean }) {
  return (
    <div className="mb-10">
      <div className="ui-eyebrow mb-3">{title}</div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <div key={i} className="aspect-video rounded-[10px] bg-white/[0.04] animate-pulse" />)}</div>
      ) : rows.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rows.map(r => {
            const st = STATUS[r.status] || STATUS.planning;
            return (
              <Link key={r.id} href={`/youtube/${r.id}`} className="group">
                <div className="relative aspect-video rounded-[10px] overflow-hidden bg-[#0e0e10] border border-[var(--line)] group-hover:border-[var(--line-3)] transition">
                  {r.thumbnail_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center text-[var(--fg-4)]"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2.5" y="5.5" width="19" height="13" rx="3.5" /><path d="m10.5 9.5 4 2.5-4 2.5z" /></svg></div>}
                  <span className={`absolute bottom-2 left-2 text-[10.5px] px-2 py-0.5 rounded-full border bg-black/70 backdrop-blur ${st.tone}`}>{st.label}</span>
                  <span className="absolute bottom-2 right-2 text-[10.5px] px-1.5 py-0.5 rounded bg-black/70 text-white/80">{r.minutes} min</span>
                </div>
                <div className="mt-2 text-[13px] truncate">{r.title}</div>
                <div className="text-[11.5px] text-[var(--fg-4)]">{ago(r.updated_at)} · {r.status === 'completed' ? 'Open' : 'Continue'} →</div>
              </Link>
            );
          })}
        </div>
      ) : empty ? <div className="text-[13px] text-[var(--fg-4)] py-6">{empty}</div> : null}
    </div>
  );
}

function uploadFile(file: File, token: string, onProgress: (p: number) => void): Promise<{ url: string; kind: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/studio/upload`);
    xhr.setRequestHeader('x-upload-token', token);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => { try { const d = JSON.parse(xhr.responseText || '{}'); if (xhr.status < 300 && d.url) resolve(d); else reject(new Error(d.detail || `Upload failed (${xhr.status})`)); } catch { reject(new Error(`Upload failed (${xhr.status})`)); } };
    xhr.onerror = () => reject(new Error('Upload failed (network)'));
    const fd = new FormData(); fd.append('file', file); xhr.send(fd);
  });
}
type Up = { name: string; progress: number; url?: string; kind?: string; error?: string };

function NewProject({ tpl, onClose }: { tpl: LongTemplate; onClose: () => void }) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [minutes, setMinutes] = useState(tpl.defaultMinutes);
  const [voice, setVoice] = useState(tpl.voices[0]?.id || '');
  const [look, setLook] = useState(tpl.looks?.[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [pitches, setPitches] = useState<{ topic: string; angle: string }[] | null>(null);
  const [pitching, setPitching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ups, setUps] = useState<Up[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploading = ups.some(u => !u.url && !u.error);
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let token = '';
    try { const r = await fetch('/api/studio/upload-token', { method: 'POST' }); token = (await r.json()).token || ''; } catch { /* below */ }
    for (const f of Array.from(files).slice(0, 20 - ups.length)) {
      const name = f.name;
      if (!token) { setUps(p => [...p, { name, progress: 0, error: 'Uploads are unavailable right now' }]); continue; }
      if (f.size > 400 * 1024 * 1024) { setUps(p => [...p, { name, progress: 0, error: 'Larger than 400 MB' }]); continue; }
      setUps(p => [...p, { name, progress: 0 }]);
      uploadFile(f, token, pr => setUps(p => p.map(u => u.name === name && !u.url ? { ...u, progress: pr } : u)))
        .then(d => setUps(p => p.map(u => u.name === name && !u.url ? { ...u, url: d.url, kind: d.kind, progress: 1 } : u)))
        .catch(e => setUps(p => p.map(u => u.name === name && !u.url ? { ...u, error: e.message } : u)));
    }
  };

  const pitch = async () => {
    setPitching(true); setErr('');
    try {
      const r = await fetch('/api/long/pitch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: tpl.key, hint: topic }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not pitch ideas');
      setPitches(d.pitches || []);
    } catch (e: any) { setErr(e.message); } finally { setPitching(false); }
  };
  const start = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/long/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: tpl.key, topic, minutes, voice, notes, look, uploads: ups.filter(u => u.url).map(u => u.url) }) });
      const d = await r.json(); if (!r.ok || !d.id) throw new Error(d.error || 'Could not start the project');
      router.push(`/youtube/${d.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-[520px] h-full bg-[#0a0a0b] border-l border-[var(--line-2)] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="relative aspect-[16/7] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tpl.poster} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/30 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full bg-black/60 text-white/80 hover:text-white" aria-label="Close">✕</button>
          <div className="absolute bottom-3 left-6"><div className="ui-eyebrow">New long video</div><div className="text-[20px] font-semibold">{tpl.title}</div></div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="text-[12.5px] font-medium">Topic</label>
            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={2} maxLength={300} placeholder={tpl.ideas[0]} className="ui-input mt-2 !h-auto py-2.5 resize-none" />
            <div className="text-[11.5px] text-[var(--fg-4)] mt-1.5">{tpl.topicHint}</div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {tpl.ideas.map(i => <button key={i} type="button" onClick={() => setTopic(i)} className="ui-chip ui-chip-muted hover:text-[var(--fg)]">{i}</button>)}
            </div>
            <button type="button" onClick={pitch} disabled={pitching} className="ui-btn ui-btn-ghost ui-btn-sm mt-3 !px-0">{pitching ? 'Thinking of ideas…' : '✦ Pitch me 3 ideas'}</button>
            {pitches && (
              <div className="mt-2 space-y-2">
                {pitches.map(p => (
                  <button key={p.topic} type="button" onClick={() => setTopic(p.topic)} className={`w-full text-left ui-card p-3 hover:border-[var(--line-3)] ${topic === p.topic ? '!border-white/40' : ''}`}>
                    <div className="text-[13px] font-medium">{p.topic}</div><div className="text-[12px] text-[var(--fg-3)] mt-0.5">{p.angle}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {tpl.looks && (
            <div>
              <label className="text-[12.5px] font-medium">Look</label>
              {Array.from(new Set(tpl.looks.map(l => l.group || ''))).map(g => (
                <div key={g || 'looks'} className="mt-2">
                  {g && <div className="text-[11px] uppercase tracking-wide text-[var(--fg-4)] mt-3 mb-1.5">{g}</div>}
                  <div className="grid grid-cols-2 gap-2">
                    {tpl.looks!.filter(l => (l.group || '') === g).map(l => (
                      <button key={l.id} type="button" onClick={() => setLook(l.id)} title={l.desc}
                        className={`rounded-lg border overflow-hidden text-left transition ${look === l.id ? 'border-white/60 ring-1 ring-white/40' : 'border-[var(--line-2)] hover:border-[var(--line-3)]'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/long/looks/${l.id}.jpg`} alt="" className="w-full aspect-video object-cover" />
                        <div className="px-2.5 py-2"><div className="text-[12.5px] font-medium">{l.label}</div><div className="text-[11px] text-[var(--fg-4)] leading-snug line-clamp-2">{l.desc}</div></div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="text-[12.5px] font-medium">Length</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {tpl.minutes.map(m => (
                <button key={m} type="button" onClick={() => setMinutes(m)} className={`h-14 rounded-lg border text-left px-3 transition ${minutes === m ? 'border-white/50 bg-white/[0.06]' : 'border-[var(--line-2)] hover:border-[var(--line-3)]'}`}>
                  <div className="text-[14px] font-medium">{m} min</div><div className="text-[11px] text-[var(--fg-4)]">{(m * tpl.perMinute).toLocaleString()} cr</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[12.5px] font-medium">Narrator</label>
            <div className="flex flex-wrap gap-1.5 mt-2">{tpl.voices.map(v => <button key={v.id} type="button" onClick={() => setVoice(v.id)} className={`ui-chip ${voice === v.id ? '!border-white/50 !text-white' : 'ui-chip-muted'}`}>{v.label}</button>)}</div>
          </div>
          {tpl.uploads && (
            <div>
              <label className="text-[12.5px] font-medium">Your footage <span className="text-[var(--fg-4)] font-normal">(optional, recommended)</span></label>
              <div className="text-[11.5px] text-[var(--fg-4)] mt-1">Clips and photos of the real events you talk about (speeches, visits, tests, documents). They are placed on the lines they show; open archives and stock footage fill the rest. Only upload footage you have the right to use.</div>
              <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={ups.length >= 20}
                className="mt-2 w-full rounded-lg border border-dashed border-[var(--line-3)] hover:border-white/40 py-4 text-[12.5px] text-[var(--fg-3)] hover:text-white transition">+ Add clips or photos <span className="block text-[11px] text-[var(--fg-4)] mt-0.5">MP4 · MOV · WebM · JPG · PNG, up to 400 MB each, up to 20</span></button>
              {ups.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {ups.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className="w-5 text-[var(--fg-4)] tabular-nums">{i}</span>
                      <span className="flex-1 truncate">{u.name}</span>
                      {u.error ? <span className="text-rose-300">{u.error}</span> : u.url ? <span className="text-emerald-300">ready</span>
                        : <span className="w-20 h-1 rounded bg-white/10 overflow-hidden"><span className="block h-full bg-white" style={{ width: `${Math.round(u.progress * 100)}%` }} /></span>}
                      <button type="button" onClick={() => setUps(p => p.filter((_, k) => k !== i))} className="text-[var(--fg-4)] hover:text-white" aria-label="Remove">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="text-[12.5px] font-medium">Notes <span className="text-[var(--fg-4)] font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={600} placeholder="Audience, tone, things to include or avoid" className="ui-input mt-2 !h-auto py-2.5 resize-none" />
          </div>
          {err && <div className="text-[12.5px] text-rose-300">{err}</div>}
          <div className="pt-2 border-t border-[var(--line)]">
            <button type="button" onClick={start} disabled={busy || uploading} className="ui-btn ui-btn-primary ui-btn-lg w-full">{busy ? 'Starting…' : uploading ? 'Uploading…' : 'Write the script & shot plan'}</button>
            <div className="text-[11.5px] text-[var(--fg-4)] mt-2 text-center">Free. You review the plan before any credits are used ({(minutes * tpl.perMinute).toLocaleString()} credits on approval).</div>
          </div>
        </div>
      </div>
    </div>
  );
}
