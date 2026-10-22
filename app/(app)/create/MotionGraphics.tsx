'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motionCost, MOTION_DURATIONS } from '@/lib/types';
import {
  EditorHeader, EditorPage, Intro, Section, Label, Segmented, Toggle, TextArea, ActionBar, Credits,
  AspectGlyph, Ico, ErrorNote, Spinner, StudioPanel, StatusDot, Stage, StageEmpty, VoiceGrid, type KitVoice,
} from '@/components/editor/kit';

/* ─────────────────────────── types ─────────────────────────── */

type Aspect = '16:9' | '9:16' | '1:1';
type View = 'setup' | 'production';

interface RefFrame { t: number; data_url: string }
interface BrandKit { name: string; colors: string[]; fonts: string[]; tone: string; notes: string; logo_data_url: string | null }

interface PlanShot { n: number; id: string; duration: number; purpose?: string; on_screen_text?: string; visual?: string; motion?: string; transition_out?: string; sfx?: string }
interface Plan {
  title?: string; concept?: string; reference_analysis?: string;
  design?: { palette?: Record<string, string>; fonts?: Record<string, string>; texture?: string; motion_language?: string; rules?: string[] };
  shots: PlanShot[];
}
interface ShotState {
  n: number; duration: number; purpose?: string; on_screen_text?: string; status: string;
  score?: number; attempts?: number; thumb_url?: string | null; video_url?: string | null;
  issues?: { t?: number | null; problem: string; fix?: string }[];
}
interface Gate { stage: 'shot_list' | 'style_frame'; deadline: number; timeout: number; image_url?: string }
interface MotionJob {
  status: 'queued' | 'processing' | 'awaiting_approval' | 'completed' | 'failed';
  stage?: string; step?: number; total_steps?: number; message?: string;
  plan?: Plan | null; shots?: ShotState[]; gate?: Gate | null;
  activity?: { role: string; text: string; t: number }[];
  style_frame_url?: string | null; final_video_url?: string | null; average_score?: number;
  error?: string | null;
}

const ASPECTS: { id: Aspect; label: string; sub: string }[] = [
  { id: '16:9', label: '16:9', sub: 'YouTube' },
  { id: '9:16', label: '9:16', sub: 'TikTok / Reels' },
  { id: '1:1', label: '1:1', sub: 'Instagram' },
];

const EMPTY_KIT: BrandKit = { name: '', colors: [], fonts: [], tone: '', notes: '', logo_data_url: null };
const KIT_LOCAL_KEY = 'animave.brandKit';
const PAYLOAD_BUDGET = 3_600_000; // stay under Vercel's 4.5 MB request limit

const ROLE_ORDER = ['Director', 'Animator', 'Render engineer', 'Critic', 'Sound designer'];
// Approved default narrator (ElevenLabs "Matilda — knowledgeable, professional"); see animia/MOTION_SETTINGS.md
const DEFAULT_VOICE_ID = 'XrExE9yKIg1WjnnlVkGX';

/* ─────────────────────────── browser media helpers ─────────────────────────── */

async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function resizeImage(file: File, maxSide: number, type: 'image/jpeg' | 'image/png', quality = 0.85): Promise<string> {
  if (file.type === 'image/svg+xml') return fileToDataUrl(file);
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL(type, quality);
}

// Reference videos never leave the browser: we sample timestamped frames here and the
// director reads them as contact sheets.
async function extractVideoFrames(file: File, onProgress: (p: number) => void): Promise<{ frames: RefFrame[]; duration: number }> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('Could not read this video.')); });
    const duration = Math.min(60, v.duration || 0);
    if (!duration) throw new Error('Could not read this video.');
    const step = Math.max(0.5, duration / 48);
    const c = document.createElement('canvas');
    const w = 360;
    c.width = w; c.height = Math.round((v.videoHeight / v.videoWidth) * w) || 202;
    const ctx = c.getContext('2d')!;
    const frames: RefFrame[] = [];
    for (let t = 0; t < duration; t += step) {
      await new Promise<void>(res => { v.onseeked = () => res(); v.currentTime = Math.min(t + 0.01, duration - 0.05); });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      frames.push({ t: Math.round(t * 10) / 10, data_url: c.toDataURL('image/jpeg', 0.7) });
      onProgress(Math.min(1, t / duration));
    }
    return { frames, duration };
  } finally {
    URL.revokeObjectURL(url);
  }
}

const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

/* ─────────────────────────── component ─────────────────────────── */

type Look = 'motion' | 'cinematic3d';

// One engine, two Create sections: "Motion Graphics" (drawn in code) and "3D Render"
// (a 3D-rendered still per scene, animated in code).
const LOOK_COPY: Record<Look, { name: string; title: string; desc: string; placeholder: string }> = {
  motion: {
    name: 'Motion Graphics',
    title: 'What should we animate?',
    desc: 'Claude plans it like a director, writes every shot as animation code, then reviews the rendered frames and fixes anything under 8/10.',
    placeholder: "A 15-second launch teaser for our budgeting app: hook with '73% of people don't know where their money goes', show three features, end on the logo.",
  },
  cinematic3d: {
    name: '3D Render',
    title: 'What should we explain in 3D?',
    desc: 'Every scene is a 3D render — x-ray cutaways, close-ups, dramatic light — brought to life with camera moves, scans and effects, cut to the narration.',
    placeholder: "What happens to your body if you don't sleep for three days?",
  },
};

export default function MotionGraphics({ onBack, look = 'motion' }: { onBack: () => void; look?: Look }) {
  const copy = LOOK_COPY[look];
  const [view, setView] = useState<View>('setup');

  // brief
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [seconds, setSeconds] = useState<number>(15);
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(false);
  const [narration, setNarration] = useState(true);
  const [voices, setVoices] = useState<KitVoice[]>([]);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loop, setLoop] = useState(false);
  const [review, setReview] = useState<'review' | 'auto'>('review');

  // references
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refFrames, setRefFrames] = useState<RefFrame[]>([]);
  const [refVideoName, setRefVideoName] = useState('');
  const [refBusy, setRefBusy] = useState<number | null>(null);
  const [refErr, setRefErr] = useState('');

  // brand kit
  const [kit, setKit] = useState<BrandKit>(EMPTY_KIT);
  const [useKit, setUseKit] = useState(true);
  const [kitOpen, setKitOpen] = useState(false);
  const [kitNote, setKitNote] = useState('');
  const [colorDraft, setColorDraft] = useState('#ff4b1f');

  // production
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<MotionJob | null>(null);
  const [startErr, setStartErr] = useState('');
  const [starting, setStarting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now() / 1000);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cost = motionCost(seconds);

  useEffect(() => {
    fetch('/api/voices').then(r => r.json()).then(d => {
      const list: KitVoice[] = Array.isArray(d) ? d : (d?.voices || []);
      setVoices(list);
      setVoiceId(v => v ?? (list.some(x => x.voice_id === DEFAULT_VOICE_ID) ? DEFAULT_VOICE_ID : null));
    }).catch(() => {});
    return () => { audioRef.current?.pause(); };
  }, []);

  const previewVoice = (v: KitVoice) => {
    audioRef.current?.pause();
    if (previewing === v.voice_id || !v.preview_url) { setPreviewing(null); return; }
    const a = new Audio(v.preview_url);
    audioRef.current = a;
    a.onended = () => setPreviewing(null);
    a.play().then(() => setPreviewing(v.voice_id)).catch(() => setPreviewing(null));
  };

  /* brand kit load / save */
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data, error } = await sb.from('brand_kits').select('*').eq('user_id', user.id).maybeSingle();
          if (!error && data) {
            setKit({ name: data.name || '', colors: data.colors || [], fonts: data.fonts || [], tone: data.tone || '', notes: data.notes || '', logo_data_url: data.logo_data_url || null });
            return;
          }
        }
      } catch { /* fall back to this device */ }
      try {
        const raw = localStorage.getItem(KIT_LOCAL_KEY);
        if (raw) setKit({ ...EMPTY_KIT, ...JSON.parse(raw) });
      } catch { /* noop */ }
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const saveKit = async () => {
    setKitNote('Saving…');
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('signed out');
      const { error } = await sb.from('brand_kits').upsert({ user_id: user.id, ...kit, updated_at: new Date().toISOString() });
      if (error) throw error;
      setKitNote('Saved to your account');
    } catch {
      try { localStorage.setItem(KIT_LOCAL_KEY, JSON.stringify(kit)); setKitNote('Saved on this device'); }
      catch { setKitNote('Could not save'); }
    }
  };

  const kitHasContent = !!(kit.name || kit.colors.length || kit.fonts.some(Boolean) || kit.tone || kit.notes || kit.logo_data_url);

  /* references */
  const onPickImages = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - refImages.length);
    e.target.value = '';
    setRefErr('');
    try {
      const urls = await Promise.all(files.map(f => resizeImage(f, 1400, 'image/jpeg', 0.82)));
      setRefImages(prev => [...prev, ...urls].slice(0, 3));
    } catch { setRefErr('Could not read that image.'); }
  };

  const onPickVideo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setRefErr(''); setRefBusy(0);
    try {
      const { frames } = await extractVideoFrames(f, p => setRefBusy(p));
      setRefFrames(frames); setRefVideoName(f.name);
    } catch (err) {
      setRefErr(err instanceof Error ? err.message : 'Could not read this video.');
    } finally { setRefBusy(null); }
  };

  const onPickLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setKit(k => ({ ...k, logo_data_url: null })); const url = await resizeImage(f, 512, 'image/png'); setKit(k => ({ ...k, logo_data_url: url })); }
    catch { setKitNote('Could not read that logo.'); }
  };

  /* polling */
  const poll = async (jid: string) => {
    try {
      const r = await fetch(`/api/motion/${jid}`, { cache: 'no-store' });
      if (!r.ok) return;
      const d: MotionJob = await r.json();
      setJob(d);
      if (d.status === 'completed' || d.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        try {
          await createClient().from('animations').update(
            d.status === 'completed' ? { status: 'completed', final_video_url: d.final_video_url } : { status: 'failed' },
          ).eq('job_id', jid);
        } catch { /* noop */ }
      }
    } catch { /* keep polling */ }
  };

  useEffect(() => {
    if (!job?.gate) return;
    const t = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(t);
  }, [job?.gate]);

  const buildPayload = () => {
    let frames = refFrames;
    const brand = useKit && kitHasContent ? { ...kit, fonts: kit.fonts.filter(Boolean) } : null;
    const size = () => JSON.stringify({ refImages, frames, brand }).length;
    while (size() > PAYLOAD_BUDGET && frames.length > 8) frames = frames.filter((_, i) => i % 2 === 0);
    return {
      prompt: prompt.trim(), aspect_ratio: aspect, resolution, duration_seconds: seconds,
      include_music: music, include_sfx: sfx, loop, auto_approve: review === 'auto', approval_timeout: 600, look,
      narration: narration && !!voiceId, narrator_voice_id: narration ? voiceId : null,
      reference_images: refImages, reference_video_frames: frames, brand,
    };
  };

  const start = async () => {
    setStarting(true); setStartErr('');
    try {
      const r = await fetch('/api/motion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) });
      const d = await r.json();
      if (!r.ok || !d.job_id) { setStartErr(d.error || 'Failed to start.'); return; }
      setJobId(d.job_id); setJob({ status: 'queued', message: 'The crew is getting ready…' }); setView('production');
      pollRef.current = setInterval(() => poll(d.job_id), 2500);
      poll(d.job_id);
    } catch { setStartErr('Failed to start. Check your connection and try again.'); }
    finally { setStarting(false); }
  };

  const answerGate = async (approved: boolean) => {
    if (!jobId) return;
    setSending(true);
    try {
      await fetch(`/api/motion/${jobId}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, feedback: approved ? '' : feedback }),
      });
      setFeedback('');
      poll(jobId);
    } finally { setSending(false); }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setView('setup'); setJob(null); setJobId(null); setFeedback(''); setStartErr('');
  };

  /* stepper */
  const stage = job?.stage || '';
  const stepIndex = view === 'setup' ? 0
    : ['queued', 'analyzing', 'directing'].includes(stage) || job?.gate?.stage === 'shot_list' ? 1
      : stage === 'style_frame' ? 2 : 3;

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader
        format={copy.name}
        onBack={view === 'setup' ? onBack : reset}
        steps={['Brief', 'Shot list', 'Style frame', 'Production']}
        current={stepIndex}
        right={<Credits n={cost} suffix="credits" />}
      />

      {view === 'setup' && (
        <>
          <EditorPage width={760}>
            <Intro title={copy.title} desc={copy.desc} />

            <Section title="Brief">
              <TextArea big value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
                placeholder={copy.placeholder} />
            </Section>

            <Section title="References" hint="Optional — we borrow the look and rhythm, never the content">
              <div className="grid sm:grid-cols-2 gap-2.5">
                <label className="rounded-[10px] border border-[var(--line)] hover:border-[var(--line-2)] p-3 cursor-pointer transition-colors">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} disabled={refImages.length >= 3} />
                  <div className="text-[13px] font-medium">Frame reference</div>
                  <div className="text-[12px] text-[var(--fg-4)] mt-0.5">Screenshots for palette, type and texture · up to 3</div>
                  {refImages.length > 0 && (
                    <div className="flex gap-1.5 mt-2.5">
                      {refImages.map((src, i) => (
                        <span key={i} className="relative">
                          <img src={src} alt="" className="w-14 h-14 rounded-md object-cover border border-[var(--line)]" />
                          <button type="button" onClick={e => { e.preventDefault(); setRefImages(p => p.filter((_, j) => j !== i)); }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-black border border-[var(--line-2)] flex items-center justify-center text-[var(--fg-3)]">{Ico.x}</button>
                        </span>
                      ))}
                    </div>
                  )}
                </label>
                <label className="rounded-[10px] border border-[var(--line)] hover:border-[var(--line-2)] p-3 cursor-pointer transition-colors">
                  <input type="file" accept="video/*" className="hidden" onChange={onPickVideo} />
                  <div className="text-[13px] font-medium">Video reference</div>
                  <div className="text-[12px] text-[var(--fg-4)] mt-0.5">Shots, cuts and pacing are analysed · first 60s</div>
                  {refBusy !== null && <div className="flex items-center gap-2 mt-2.5 text-[12px] text-[var(--fg-3)]"><Spinner size={12} />Reading frames… {Math.round(refBusy * 100)}%</div>}
                  {refBusy === null && refFrames.length > 0 && (
                    <div className="mt-2.5">
                      <div className="flex gap-1 overflow-hidden">
                        {refFrames.filter((_, i) => i % Math.ceil(refFrames.length / 6) === 0).slice(0, 6).map(f => (
                          <img key={f.t} src={f.data_url} alt="" className="h-10 rounded border border-[var(--line)]" />
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[11.5px] text-[var(--fg-4)]">
                        <span className="truncate">{refVideoName} · {refFrames.length} frames</span>
                        <button type="button" onClick={e => { e.preventDefault(); setRefFrames([]); setRefVideoName(''); }} className="hover:text-white">Remove</button>
                      </div>
                    </div>
                  )}
                </label>
              </div>
              {refErr && <div className="mt-2"><ErrorNote>{refErr}</ErrorNote></div>}
            </Section>

            <Section title="Brand kit" hint={kitHasContent ? (kit.name || 'Saved kit') : 'Colours, fonts, tone and logo — reused in every video'}
              right={<div className="flex items-center gap-3">
                {kitHasContent && <Toggle on={useKit} onChange={setUseKit} label="Use brand kit" />}
                <button type="button" onClick={() => setKitOpen(o => !o)} className="text-[12px] text-[var(--fg-3)] hover:text-white">{kitOpen ? 'Close' : kitHasContent ? 'Edit' : 'Set up'}</button>
              </div>}>
              {kitHasContent && !kitOpen && (
                <div className="flex items-center gap-3 rounded-[10px] border border-[var(--line)] px-3 h-12">
                  {kit.logo_data_url && <img src={kit.logo_data_url} alt="" className="h-7 w-7 object-contain" />}
                  <div className="flex gap-1">{kit.colors.map(c => <span key={c} className="w-4 h-4 rounded-full border border-white/10" style={{ background: c }} />)}</div>
                  <span className="text-[12px] text-[var(--fg-3)] truncate">{kit.fonts.filter(Boolean).join(' · ')}{kit.tone ? ` · ${kit.tone}` : ''}</span>
                </div>
              )}
              {kitOpen && (
                <div className="rounded-[10px] border border-[var(--line)] p-3.5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Brand name</Label>
                      <input value={kit.name} onChange={e => setKit(k => ({ ...k, name: e.target.value }))} placeholder="Animave"
                        className="w-full h-9 rounded-lg bg-[var(--surface)] border border-[var(--line-2)] px-3 text-[13px] outline-none focus:border-white/40" />
                    </div>
                    <div>
                      <Label>Logo</Label>
                      <label className="flex items-center gap-2.5 h-9 rounded-lg border border-[var(--line-2)] px-3 cursor-pointer hover:border-[var(--line-3)]">
                        <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={onPickLogo} />
                        {kit.logo_data_url ? <img src={kit.logo_data_url} alt="" className="h-6 w-6 object-contain" /> : <span className="text-[var(--fg-4)]">{Ico.plus}</span>}
                        <span className="text-[12.5px] text-[var(--fg-3)]">{kit.logo_data_url ? 'Replace logo' : 'Upload PNG / SVG'}</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label>Colours</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {kit.colors.map(c => (
                        <button key={c} type="button" onClick={() => setKit(k => ({ ...k, colors: k.colors.filter(x => x !== c) }))} title="Remove"
                          className="flex items-center gap-1.5 h-7 pl-1 pr-2 rounded-md border border-[var(--line)] text-[12px] text-[var(--fg-3)] hover:text-white">
                          <span className="w-5 h-5 rounded" style={{ background: c }} />{c}
                        </button>
                      ))}
                      {kit.colors.length < 6 && (
                        <span className="flex items-center gap-1.5">
                          <input type="color" value={colorDraft} onChange={e => setColorDraft(e.target.value)} className="w-7 h-7 rounded bg-transparent border border-[var(--line-2)] cursor-pointer" />
                          <button type="button" onClick={() => setKit(k => k.colors.includes(colorDraft) ? k : ({ ...k, colors: [...k.colors, colorDraft] }))}
                            className="h-7 px-2 rounded-md border border-[var(--line-2)] text-[12px] text-[var(--fg-3)] hover:text-white">Add</button>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[0, 1].map(i => (
                      <div key={i}>
                        <Label>{i === 0 ? 'Display font' : 'Body font'}</Label>
                        <input value={kit.fonts[i] || ''} placeholder={i === 0 ? 'e.g. Space Grotesk' : 'e.g. Inter'}
                          onChange={e => setKit(k => { const f = [...k.fonts]; f[i] = e.target.value; return { ...k, fonts: f }; })}
                          className="w-full h-9 rounded-lg bg-[var(--surface)] border border-[var(--line-2)] px-3 text-[13px] outline-none focus:border-white/40" />
                      </div>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Tone</Label>
                      <input value={kit.tone} onChange={e => setKit(k => ({ ...k, tone: e.target.value }))} placeholder="Confident, playful, no jargon"
                        className="w-full h-9 rounded-lg bg-[var(--surface)] border border-[var(--line-2)] px-3 text-[13px] outline-none focus:border-white/40" />
                    </div>
                    <div>
                      <Label>Style notes</Label>
                      <input value={kit.notes} onChange={e => setKit(k => ({ ...k, notes: e.target.value }))} placeholder="Lots of white space, grain, no gradients"
                        className="w-full h-9 rounded-lg bg-[var(--surface)] border border-[var(--line-2)] px-3 text-[13px] outline-none focus:border-white/40" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--fg-4)]">{kitNote}</span>
                    <button type="button" onClick={saveKit} className="ui-btn ui-btn-secondary">Save brand kit</button>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Output">
              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <Label>Format</Label>
                  <Segmented full value={aspect} onChange={setAspect}
                    options={ASPECTS.map(a => ({ value: a.id, label: a.label, icon: <AspectGlyph a={a.id} />, sub: a.sub }))} />
                </div>
                <div>
                  <Label>Quality</Label>
                  <Segmented full value={resolution} onChange={setResolution}
                    options={(['720p', '1080p'] as const).map(r => ({ value: r, label: r }))} />
                </div>
              </div>
              <Label>Length</Label>
              <Segmented full value={seconds} onChange={setSeconds}
                options={MOTION_DURATIONS.map(d => ({ value: d, label: `${d}s`, sub: `${motionCost(d).toLocaleString()} cr` }))} />
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mt-5 pt-5 border-t border-[var(--line)]">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[var(--fg-3)]">Sound effects</span>
                  <Toggle on={sfx} onChange={setSfx} label="Sound effects synced to the animation" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[var(--fg-3)]">Music</span>
                  <Toggle on={music} onChange={setMusic} label="Background music" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[var(--fg-3)]">Seamless loop</span>
                  <Toggle on={loop} onChange={setLoop} label="Seamless loop" />
                </div>
              </div>
            </Section>

            <Section title="Narration" hint={narration ? 'Written per beat by the director, voiced by ElevenLabs — tap ▶ to preview' : 'Off — text and sound effects only'}
              right={<Toggle on={narration} onChange={setNarration} label="Narration" />}>
              {narration ? (
                <VoiceGrid voices={voices} value={voiceId} onChange={setVoiceId} previewing={previewing} onPreview={v => previewVoice(v as KitVoice)} />
              ) : (
                <div className="rounded-[10px] border border-dashed border-[var(--line-2)] py-6 text-center text-[12.5px] text-[var(--fg-4)]">No voiceover</div>
              )}
            </Section>

            <Section title="Direction" hint="Approve the plan before anything is rendered">
              <Segmented full value={review} onChange={setReview} options={[
                { value: 'review', label: 'Review shot list & style frame', sub: 'Auto-continues after 10 min' },
                { value: 'auto', label: 'Fully autonomous', sub: 'The crew decides everything' },
              ]} />
            </Section>

            {startErr && <ErrorNote>{startErr}</ErrorNote>}
          </EditorPage>

          <ActionBar left={narration && !voiceId ? <span>Pick a narrator voice to continue</span> : <><Credits n={cost} /><span className="hidden sm:inline">· deducted when you generate</span></>}>
            <button onClick={start} disabled={!prompt.trim() || starting || refBusy !== null || (narration && !voiceId)} className="ui-btn ui-btn-primary">
              {starting ? <Spinner size={13} /> : null}Generate{Ico.arrow}
            </button>
          </ActionBar>
        </>
      )}

      {view === 'production' && job && (
        <Production
          job={job} aspect={aspect} prompt={prompt} now={now} formatName={copy.name}
          feedback={feedback} setFeedback={setFeedback} sending={sending}
          onApprove={() => answerGate(true)} onRevise={() => answerGate(false)}
          onRetry={() => { reset(); }} onAnother={reset}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── production view ─────────────────────────── */

function Production({ job, aspect, prompt, now, formatName, feedback, setFeedback, sending, onApprove, onRevise, onRetry, onAnother }: {
  job: MotionJob; aspect: Aspect; prompt: string; now: number; formatName: string;
  feedback: string; setFeedback: (v: string) => void; sending: boolean;
  onApprove: () => void; onRevise: () => void; onRetry: () => void; onAnother: () => void;
}) {
  const gate = job.gate;
  const shots = job.shots || [];
  const plan = job.plan;
  const progress = Math.round(((job.step || 0) / (job.total_steps || 7)) * 100);
  const remaining = gate ? Math.max(0, gate.deadline - now) : 0;
  const title = plan?.title || prompt.split('\n')[0].slice(0, 60);
  const done = job.status === 'completed' && job.final_video_url;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-5 md:px-8 pt-6 pb-24 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5">
        {/* ── main column ── */}
        <div className="min-w-0 space-y-5">
          <div>
            <div className="text-[12px] text-[var(--fg-4)]">{formatName}</div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] truncate">{title || 'Untitled'}</h1>
            {plan?.concept && <p className="text-[13px] text-[var(--fg-3)] mt-1 max-w-[640px]">{plan.concept}</p>}
          </div>

          {job.status === 'failed' && (
            <StudioPanel title="Something went wrong">
              <div className="p-4 space-y-3">
                <ErrorNote>{job.error || 'Generation failed.'}</ErrorNote>
                <button onClick={onRetry} className="ui-btn ui-btn-secondary">Back to brief</button>
              </div>
            </StudioPanel>
          )}

          {gate?.stage === 'shot_list' && plan && (
            <StudioPanel title="Shot list — your approval" right={<span className="text-[12px] text-[var(--fg-4)] tabular-nums">Auto-continues in {fmtClock(remaining)}</span>}>
              <div className="p-4 space-y-4">
                <DesignSummary plan={plan} />
                <div className="rounded-lg border border-[var(--line)] divide-y divide-[var(--line)]">
                  {plan.shots.map(s => (
                    <div key={s.id} className="px-3.5 py-3 grid grid-cols-[44px_minmax(0,1fr)] gap-3">
                      <div className="text-[12px] tabular-nums text-[var(--fg-3)]">
                        <div className="text-white font-medium">#{s.n}</div>{s.duration}s
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {s.purpose && <span className="ui-chip ui-chip-muted">{s.purpose}</span>}
                          {s.on_screen_text && <span className="text-[13px] font-medium truncate">“{s.on_screen_text.replace(/\n/g, ' / ')}”</span>}
                        </div>
                        {s.visual && <p className="text-[12.5px] text-[var(--fg-2)] mt-1 leading-relaxed">{s.visual}</p>}
                        {s.motion && <p className="text-[12px] text-[var(--fg-4)] mt-0.5 leading-relaxed">Motion: {s.motion}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <GateActions feedback={feedback} setFeedback={setFeedback} sending={sending} onApprove={onApprove} onRevise={onRevise}
                  placeholder="Notes for the director — e.g. make the hook a question, fewer words in shot 3…" />
              </div>
            </StudioPanel>
          )}

          {gate?.stage === 'style_frame' && (
            <StudioPanel title="Style frame — your approval" right={<span className="text-[12px] text-[var(--fg-4)] tabular-nums">Auto-continues in {fmtClock(remaining)}</span>}>
              <div className="p-4 space-y-4">
                <p className="text-[12.5px] text-[var(--fg-3)]">This frame from shot 1 sets the look for every other shot — type, colour, texture and layout.</p>
                <div className="flex justify-center">
                  <Stage aspect={aspect} maxH="max-h-[520px]">
                    {gate.image_url ? <img src={gate.image_url} alt="Style frame" className="w-full h-full object-contain" /> : <StageEmpty label="Rendering the style frame…" />}
                  </Stage>
                </div>
                <GateActions feedback={feedback} setFeedback={setFeedback} sending={sending} onApprove={onApprove} onRevise={onRevise}
                  placeholder="Notes for the animator — e.g. bigger headline, warmer accent, more grain…" />
              </div>
            </StudioPanel>
          )}

          {!gate && job.status !== 'failed' && (
            <StudioPanel title={done ? 'Final cut' : 'Preview'} sub={done && job.average_score ? `Average score ${job.average_score}/10` : undefined}>
              <div className="p-4 flex flex-col items-center gap-4">
                <Stage aspect={aspect} maxH="max-h-[560px]" processing={!done} progress={progress}>
                  {done ? (
                    <video src={job.final_video_url!} controls autoPlay loop playsInline className="w-full h-full object-contain bg-black" />
                  ) : job.style_frame_url ? (
                    <>
                      <img src={job.style_frame_url} alt="" className="w-full h-full object-contain opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center"><StageEmpty label={job.message || 'Working…'} /></div>
                    </>
                  ) : <StageEmpty label={job.message || 'The crew is getting ready…'} />}
                </Stage>
                {done && (
                  <div className="flex items-center gap-2">
                    <a href={`/api/download?url=${encodeURIComponent(job.final_video_url!)}&filename=${encodeURIComponent((title || 'motion') + '.mp4')}`}
                      className="ui-btn ui-btn-primary">Download</a>
                    <button onClick={onAnother} className="ui-btn ui-btn-secondary">Create another</button>
                  </div>
                )}
              </div>
            </StudioPanel>
          )}

          {shots.length > 0 && (
            <StudioPanel title="Shots" sub={`${shots.filter(s => s.status === 'completed').length} / ${shots.length} done`}>
              <div className="divide-y divide-[var(--line)]">
                {shots.map(s => <ShotRow key={s.n} s={s} aspect={aspect} />)}
              </div>
            </StudioPanel>
          )}
        </div>

        {/* ── crew column ── */}
        <div className="space-y-5">
          <StudioPanel title="Crew">
            <div className="p-3 space-y-1.5">
              {ROLE_ORDER.map(role => {
                const last = [...(job.activity || [])].reverse().find(a => a.role === role);
                const lastAny = job.activity?.[job.activity.length - 1];
                const active = !done && job.status !== 'failed' && lastAny?.role === role;
                return (
                  <div key={role} className="flex items-start gap-2.5 px-1 py-1">
                    <span className="mt-1.5"><StatusDot status={active ? 'processing' : last ? 'completed' : 'queued'} /></span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium">{role}</div>
                      <div className="text-[12px] text-[var(--fg-4)] leading-snug">{last?.text || 'Waiting'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </StudioPanel>
          <StudioPanel title="Log">
            <div className="max-h-[360px] overflow-y-auto p-3 space-y-2">
              {[...(job.activity || [])].reverse().map((a, i) => (
                <div key={i} className="text-[12px] leading-snug">
                  <span className="text-[var(--fg-4)]">{a.role} · </span><span className="text-[var(--fg-2)]">{a.text}</span>
                </div>
              ))}
              {!job.activity?.length && <div className="text-[12px] text-[var(--fg-4)]">{job.message}</div>}
            </div>
          </StudioPanel>
        </div>
      </div>
    </div>
  );
}

function DesignSummary({ plan }: { plan: Plan }) {
  const d = plan.design || {};
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-[var(--fg-3)]">
      {d.palette && (
        <div className="flex items-center gap-1.5">
          {Object.values(d.palette).filter(c => /^#|rgb|hsl/.test(String(c))).map((c, i) => (
            <span key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ background: c }} title={c} />
          ))}
        </div>
      )}
      {d.fonts && <span>{Object.values(d.fonts).join(' · ')}</span>}
      {d.texture && <span>{d.texture}</span>}
      {d.motion_language && <span className="basis-full text-[var(--fg-4)]">Motion: {d.motion_language}</span>}
      {plan.reference_analysis && <span className="basis-full text-[var(--fg-4)]">From your references: {plan.reference_analysis}</span>}
    </div>
  );
}

function GateActions({ feedback, setFeedback, sending, onApprove, onRevise, placeholder }: {
  feedback: string; setFeedback: (v: string) => void; sending: boolean; onApprove: () => void; onRevise: () => void; placeholder: string;
}) {
  return (
    <div className="space-y-2.5">
      <TextArea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} placeholder={placeholder} />
      <div className="flex items-center justify-end gap-2">
        <button onClick={onRevise} disabled={sending || !feedback.trim()} className="ui-btn ui-btn-secondary">Request changes</button>
        <button onClick={onApprove} disabled={sending} className="ui-btn ui-btn-primary">{sending ? <Spinner size={13} /> : null}Approve{Ico.arrow}</button>
      </div>
    </div>
  );
}

const SHOT_STATUS: Record<string, string> = {
  queued: 'Queued', animating: 'Animating', rendering: 'Rendering', reviewing: 'In review',
  revising: 'Fixing notes', awaiting_approval: 'Awaiting you', completed: 'Done', failed: 'Failed',
};

function ShotRow({ s, aspect }: { s: ShotState; aspect: Aspect }) {
  const [open, setOpen] = useState(false);
  const busy = ['animating', 'rendering', 'reviewing', 'revising'].includes(s.status);
  const thumbBox = aspect === '9:16' ? 'w-9 h-16' : aspect === '1:1' ? 'w-12 h-12' : 'w-20 h-[45px]';
  return (
    <div className="px-3.5 py-2.5">
      <div className="flex items-center gap-3">
        <span className={`${thumbBox} rounded bg-black border border-[var(--line)] overflow-hidden flex-shrink-0 flex items-center justify-center`}>
          {s.video_url ? <video src={s.video_url} muted loop playsInline autoPlay className="w-full h-full object-cover" />
            : s.thumb_url ? <img src={s.thumb_url} alt="" className="w-full h-full object-cover" />
              : busy ? <Spinner size={11} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="font-medium tabular-nums">#{s.n}</span>
            <span className="text-[var(--fg-4)] tabular-nums">{s.duration}s</span>
            {s.on_screen_text && <span className="truncate text-[var(--fg-2)]">“{s.on_screen_text.replace(/\n/g, ' / ')}”</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--fg-4)] mt-0.5">
            <StatusDot status={s.status === 'completed' ? 'completed' : s.status === 'failed' ? 'failed' : busy ? 'processing' : 'queued'} />
            {SHOT_STATUS[s.status] || s.status}
            {s.attempts && s.attempts > 1 ? <span>· version {s.attempts}</span> : null}
          </div>
        </div>
        {typeof s.score === 'number' && (
          <button type="button" onClick={() => setOpen(o => !o)} title="Critic notes"
            className={`h-6 px-2 rounded-md text-[12px] tabular-nums border ${s.score >= 8 ? 'border-[var(--line-3)] text-white' : 'border-[rgba(255,90,90,0.3)] text-[#ff8a8a]'}`}>
            {s.score.toFixed(1)}
          </button>
        )}
      </div>
      {open && !!s.issues?.length && (
        <ul className="mt-2 ml-1 space-y-1">
          {s.issues.map((i, k) => (
            <li key={k} className="text-[12px] leading-snug text-[var(--fg-3)]">
              {typeof i.t === 'number' && <span className="text-[var(--fg-4)] tabular-nums">{i.t}s · </span>}{i.problem}
              {i.fix && <span className="text-[var(--fg-4)]"> → {i.fix}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
