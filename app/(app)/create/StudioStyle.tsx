'use client';

// Style Studio formats (Whiteboard Explainer, Sci-Fi Sitcom Toon, Paper-cut Lightbox, Exploded Teardown, Caption News,
// Sports Telestrator): one form driven by STUDIO_STYLES, uploads for the footage styles, polling like the other formats.
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { STUDIO_STYLES, type StudioFormat } from '@/lib/types';
import StudioGenerationView from './StudioGenerationView';
import { EditorHeader, EditorPage, Intro, Section, TextArea, Chip, Segmented, ActionBar, Credits, ErrorNote, Ico } from '@/components/editor/kit';

type Step = 'setup' | 'generating' | 'done';
type Upload = { name: string; url?: string; kind?: string; progress: number; error?: string };

const MAX_UPLOADS = 8;
const MAX_MB = 400;
const ACCEPT = 'video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp';

function uploadFile(file: File, token: string, onProgress: (p: number) => void): Promise<{ url: string; kind: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/studio/upload`);
    xhr.setRequestHeader('x-upload-token', token);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && d.url) resolve(d); else reject(new Error(d.detail || `Upload failed (${xhr.status})`));
      } catch { reject(new Error(`Upload failed (${xhr.status})`)); }
    };
    xhr.onerror = () => reject(new Error('Upload failed (network)'));
    const fd = new FormData(); fd.append('file', file); xhr.send(fd);
  });
}

export default function StudioStyle({ format, onBack }: { format: StudioFormat; onBack: () => void }) {
  const cfg = STUDIO_STYLES[format];
  const [step, setStep] = useState<Step>('setup');
  const [topic, setTopic] = useState('');
  const [seconds, setSeconds] = useState<number>(cfg.defaultSeconds);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [accent, setAccent] = useState(cfg.options?.accent?.[0] || '');
  const [handle, setHandle] = useState('');
  const [voice, setVoice] = useState(cfg.options?.voices?.[0]?.id || '');
  const [audience, setAudience] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState<string | null>(null);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [genErr, setGenErr] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const uploading = uploads.some(u => !u.url && !u.error);
  const ready = uploads.filter(u => u.url);
  const canGenerate = !uploading && (cfg.uploads !== 'required' || ready.length > 0);

  const addFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const list = Array.from(files).slice(0, MAX_UPLOADS - uploads.length);
    let token = '';
    try {
      const r = await fetch('/api/studio/upload-token', { method: 'POST' });
      const d = await r.json(); token = d.token || '';
      if (!token) throw new Error(d.error || 'Uploads are unavailable');
    } catch (e: any) {
      setUploads(prev => [...prev, ...list.map(f => ({ name: f.name, progress: 0, error: e?.message || 'Uploads are unavailable' }))]);
      return;
    }
    for (const f of list) {
      const name = f.name;
      if (f.size > MAX_MB * 1024 * 1024) { setUploads(prev => [...prev, { name, progress: 0, error: `Larger than ${MAX_MB} MB` }]); continue; }
      setUploads(prev => [...prev, { name, progress: 0 }]);
      uploadFile(f, token, p => setUploads(prev => prev.map(u => (u.name === name && !u.url ? { ...u, progress: p } : u))))
        .then(d => setUploads(prev => prev.map(u => (u.name === name && !u.url ? { ...u, url: d.url, kind: d.kind, progress: 1 } : u))))
        .catch(e => setUploads(prev => prev.map(u => (u.name === name && !u.url ? { ...u, error: e.message } : u))));
    }
  };

  const pollStatus = async (jid: string) => {
    try {
      const r = await fetch(`/api/studio/${jid}`);
      const d = await r.json();
      setGenMsg(d.message || ''); setGenStep(d.step || 0); setGenTotal(d.total_steps || 0);
      if (d.title) setTitle(d.title);
      if (d.post) setCaption(d.post);
      if (d.status === 'completed') {
        setGenStatus('completed'); setFinalVideo(d.final_video_url); setStep('done');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'completed', final_video_url: d.final_video_url, title: d.title || undefined }).eq('job_id', jid); } catch { /* noop */ }
      } else if (d.status === 'failed') {
        setGenStatus('failed'); setGenErr(d.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'failed' }).eq('job_id', jid); } catch { /* noop */ }
      } else setGenStatus('processing');
    } catch { /* keep polling */ }
  };

  const startGeneration = async () => {
    setStep('generating'); setGenStatus('processing'); setGenErr(''); setFinalVideo(null); setTitle('');
    try {
      const r = await fetch('/api/studio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, topic: topic.trim(), seconds, uploads: ready.map(u => u.url), options: cfg.options ? { accent, handle: handle.trim(), voice, audience: audience.trim() } : undefined }),
      });
      const raw = await r.text();
      let d: any = {};
      try { d = JSON.parse(raw); } catch {
        setGenStatus('failed');
        setGenErr(r.status === 504 ? 'The server took too long to answer. Please try again in a minute.' : `The server answered ${r.status}: ${raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || 'no details'}`);
        return;
      }
      if (r.status === 402) { setGenStatus('failed'); setGenErr(d.error || 'Not enough credits.'); return; }
      if (d.job_id) {
        pollRef.current = setInterval(() => pollStatus(d.job_id), 5000);
        pollStatus(d.job_id);
      } else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch (e: any) { setGenStatus('failed'); setGenErr(`Could not reach the server${e?.message ? ` (${e.message})` : ''}. Check your connection and try again.`); }
  };

  const shownTitle = title || (topic.trim() ? topic.trim().split('\n')[0].slice(0, 80) : cfg.title);

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader format={cfg.title} onBack={onBack} steps={['Setup', 'Render']} current={step === 'setup' ? 0 : 1} right={<Credits n={cfg.credits} />} />

      {step === 'setup' && (
        <>
          <EditorPage>
            <Intro title={cfg.intro} desc={cfg.desc} />

            {cfg.uploads !== 'none' && (
              <Section title={cfg.uploads === 'required' ? 'Your clip' : 'Your footage'} hint={cfg.uploadHint}>
                <input ref={fileRef} type="file" accept={ACCEPT} multiple={cfg.uploads === 'optional'} className="hidden"
                  onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploads.length >= MAX_UPLOADS || (cfg.uploads === 'required' && ready.length > 0)}
                  className="w-full rounded-[12px] border border-dashed border-[var(--line-3)] bg-[var(--surface)] px-4 py-6 text-[13px] text-[var(--fg-3)] hover:border-white/40 transition-colors disabled:opacity-40">
                  {cfg.uploads === 'required' ? 'Choose your match clip' : 'Add clips or photos'}
                  <span className="block text-[11.5px] text-[var(--fg-4)] mt-1">MP4 · MOV · WebM · JPG · PNG, up to {MAX_MB} MB each</span>
                </button>
                {uploads.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {uploads.map((u, i) => (
                      <div key={u.name + i} className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[12.5px]">
                        <span className="truncate flex-1">{u.name}</span>
                        {u.error ? <span className="text-red-400">{u.error}</span>
                          : u.url ? <span className="text-[var(--fg-4)]">{u.kind === 'image' ? 'Photo' : 'Clip'} ready</span>
                            : <span className="tabular-nums text-[var(--fg-4)]">{Math.round(u.progress * 100)}%</span>}
                        <button type="button" className="text-[var(--fg-4)] hover:text-white" onClick={() => setUploads(prev => prev.filter((_, k) => k !== i))} aria-label="Remove">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            <Section title={cfg.topicLabel} hint={cfg.topicHint}>
              <TextArea big value={topic} onChange={e => setTopic(e.target.value)} rows={3} maxLength={500} placeholder={cfg.placeholder} />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {cfg.ideas.map(i => <Chip key={i} on={topic.trim().toLowerCase() === i.toLowerCase()} onClick={() => setTopic(i)}>{i}</Chip>)}
              </div>
            </Section>

            {cfg.options?.audience && (
              <Section title="Audience" hint="Optional: who the reel speaks to.">
                <input value={audience} onChange={e => setAudience(e.target.value)} maxLength={160} placeholder={cfg.options.audienceHint || 'Founders of small agencies'}
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[14px] outline-none focus:border-white/40" />
              </Section>
            )}

            {cfg.options?.accent && (
              <Section title="Accent colour" hint="One colour for the key words and the hero shapes.">
                <div className="flex flex-wrap items-center gap-2">
                  {cfg.options.accent.map(c => (
                    <button key={c} type="button" onClick={() => setAccent(c)} aria-label={c}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${accent === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ background: c }} />
                  ))}
                  <input type="color" value={accent || '#5B21B6'} onChange={e => setAccent(e.target.value)} className="w-9 h-9 rounded-full bg-transparent cursor-pointer" aria-label="Custom colour" />
                </div>
              </Section>
            )}

            {cfg.options?.handle && (
              <Section title="End card" hint="Optional: your handle or brand, shown at the end.">
                <input value={handle} onChange={e => setHandle(e.target.value)} maxLength={40} placeholder="@yourbrand"
                  className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[14px] outline-none focus:border-white/40" />
              </Section>
            )}

            {cfg.options?.voices && (
              <Section title="Voice">
                <div className="flex flex-wrap gap-1.5">
                  {cfg.options.voices.map(v => <Chip key={v.id} on={voice === v.id} onClick={() => setVoice(v.id)}>{v.label}</Chip>)}
                </div>
              </Section>
            )}

            <Section title="Length">
              <Segmented<number> full value={seconds} onChange={setSeconds}
                options={cfg.seconds.map(s => ({ value: s, label: `${s} s`, sub: s === cfg.defaultSeconds ? 'best' : undefined }))} />
            </Section>

            <Section title="What you get">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {cfg.facts.map(([k, v]) => (
                  <div key={k} className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
                    <div className="text-[11.5px] text-[var(--fg-4)]">{k}</div>
                    <div className="text-[13px] mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[var(--fg-4)] mt-3">{cfg.eta} Style after lemo-opuscar (MIT).</p>
            </Section>

            {cfg.uploads === 'required' && !ready.length && !uploading && <ErrorNote>Upload your clip to continue.</ErrorNote>}
          </EditorPage>

          <ActionBar left={<><Credits n={cfg.credits} /><span className="hidden sm:inline">· deducted when you generate</span></>}>
            <button onClick={startGeneration} disabled={!canGenerate} className="ui-btn ui-btn-primary disabled:opacity-40">
              {uploading ? 'Uploading…' : 'Generate'}{Ico.arrow}
            </button>
          </ActionBar>
        </>
      )}

      {step === 'generating' && (
        <StudioGenerationView title={shownTitle} modeLabel={cfg.title} aspect="9:16" status={genStatus}
          message={genMsg || 'Writing the script...'} error={genErr} scenes={[]} finalVideo={finalVideo}
          step={genStep} totalSteps={genTotal} onBack={() => setStep('setup')} onRetry={startGeneration} />
      )}

      {step === 'done' && finalVideo && (
        <StudioGenerationView title={shownTitle} modeLabel={cfg.title} aspect="9:16" status={genStatus}
          message={`Your ${cfg.title} reel is ready`} scenes={[]} finalVideo={finalVideo} step={genTotal} totalSteps={genTotal || 1}
          onBack={() => setStep('setup')} caption={caption}
          downloadHref={`/api/download?url=${encodeURIComponent(finalVideo)}&filename=${encodeURIComponent(shownTitle + '.mp4')}`}
          onCreateAnother={() => { setStep('setup'); setFinalVideo(null); setGenStatus('idle'); setTitle(''); }} />
      )}
    </div>
  );
}
