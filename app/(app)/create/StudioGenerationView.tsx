'use client';

// The production screen every reel format shows after "Generate": a phone frame (the style's preview loop while it
// is being made, the finished reel when it is ready), an honest time-left estimate, the production stages, the live
// message from the server and a few tips. Same props as before, so every format uses it unchanged.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ico, Spinner } from '@/components/editor/kit';

type StudioStatus = 'idle' | 'processing' | 'completed' | 'failed';
type StudioAspect = '16:9' | '9:16' | '1:1';

interface StudioScene { scene_index?: number; scene_number?: number; status: string; image_url?: string | null; video_url?: string | null; title?: string }

// What each format usually takes end to end (seconds) and its preview loop in /create/formats.
const FORMAT_INFO: Record<string, { est: number; preview?: string }> = {
  'Explainer': { est: 240, preview: 'explainer' },
  '3D Build': { est: 600, preview: 'build3d' },
  '3D Health': { est: 600, preview: 'health3d' },
  'Block Horror': { est: 480, preview: 'block' },
  'Survival Story': { est: 720, preview: 'survival' },
  'Whiteboard Explainer': { est: 480, preview: 'whiteboard' },
  'Sci-Fi Sitcom Toon': { est: 390, preview: 'scifi_toon' },
  'Paper-cut Lightbox': { est: 480, preview: 'paper_lantern' },
  'Exploded Teardown': { est: 720, preview: 'teardown' },
  'Caption News': { est: 600, preview: 'caption_news' },
  'Sports Telestrator': { est: 480, preview: 'telestrator' },
  'Premium Faceless Reel': { est: 300, preview: 'premium' },
  'Collage Documentary': { est: 420, preview: 'collage_doc' },
  'Motion Graphics': { est: 420, preview: 'motion' },
};

// The seven production steps the reel pipelines report, and the share of the time each one usually takes.
const STAGES = [
  { label: 'Writing the script', hint: 'Story, beats and timing' },
  { label: 'Recording the voice', hint: 'Narration and word timing' },
  { label: 'Animating', hint: 'Every frame is written as code' },
  { label: 'Checking the frames', hint: 'Key stills reviewed and fixed' },
  { label: 'Rendering', hint: '1080 × 1920, frame by frame' },
  { label: 'Mixing the sound', hint: 'Voice, music and effects' },
  { label: 'Finishing', hint: 'Encoding and upload' },
];
const WEIGHTS = [0.07, 0.06, 0.22, 0.08, 0.42, 0.08, 0.07];

const TIPS = [
  { k: 'Hook', v: 'The first 1.5 seconds decide the view. Your reel opens on its strongest line, so post it as is.' },
  { k: 'Caption', v: 'Repeat the hook as the first line of your caption. People who watch without sound read it there.' },
  { k: 'Timing', v: 'Post when your audience is online. Check your app’s insights for the hours your followers are most active.' },
  { k: 'Series', v: 'Several reels in the same format build a series. Viewers who like one look for the next.' },
  { k: 'Loop', v: 'Short reels that loop cleanly get replayed, and replays count as watch time.' },
  { k: 'Cover', v: 'Pick a frame with large text as the cover so it reads on your profile grid.' },
  { k: 'Comments', v: 'End with a question or a choice. Comments push a reel further than likes do.' },
  { k: 'Consistency', v: 'Three reels a week for a month usually beats one perfect reel.' },
];

const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function fmtLeft(s: number) {
  if (s <= 20) return 'Almost done';
  if (s < 60) return 'Under a minute left';
  const m = Math.round(s / 60);
  return `About ${m} min left`;
}

export default function StudioGenerationView({
  title, modeLabel, aspect, status, message, error, finalVideo, step, totalSteps,
  onBack, onRetry, onCreateAnother, downloadHref, caption,
}: {
  title: string; modeLabel: string; aspect: StudioAspect; status: StudioStatus; message: string; error?: string;
  scenes: StudioScene[]; finalVideo: string | null; step: number; totalSteps: number;
  onBack: () => void; onRetry?: () => void; onCreateAnother?: () => void; downloadHref?: string;
  caption?: string | null;   // the post caption written with the script (Studio formats), shown with a copy button
}) {
  const info = FORMAT_INFO[modeLabel] || { est: 480 };
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef(Date.now());
  const stageStartRef = useRef<{ step: number; at: number }>({ step, at: Date.now() });
  const [tip, setTip] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status !== 'processing') return;
    const a = setInterval(() => setNow(Date.now()), 500);
    const b = setInterval(() => setTip(i => (i + 1) % TIPS.length), 8000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [status]);
  useEffect(() => {
    if (step !== stageStartRef.current.step) stageStartRef.current = { step, at: Date.now() };
  }, [step]);

  // progress: finished stages by weight + the current stage's share, from its own "(3/6)" counter when it has one,
  // otherwise from the time spent in it (never past 92 % of the stage until the server moves on)
  const seven = totalSteps === 7;
  const weights = seven ? WEIGHTS : Array.from({ length: Math.max(1, totalSteps) }, () => 1 / Math.max(1, totalSteps));
  const cur = Math.max(1, Math.min(weights.length, step || 1));
  const elapsed = (now - startRef.current) / 1000;
  const inStage = (now - stageStartRef.current.at) / 1000;
  const counter = /\((\d+)\s*\/\s*(\d+)\)/.exec(message || '');
  const stageFrac = counter ? Math.min(1, +counter[1] / Math.max(1, +counter[2]))
    : Math.min(0.92, inStage / Math.max(8, weights[cur - 1] * info.est));
  const done = weights.slice(0, cur - 1).reduce((a, b) => a + b, 0);
  const p = status === 'completed' ? 1 : Math.min(0.99, done + weights[cur - 1] * stageFrac);
  // time left: the format's usual time for what remains at first, then more and more the pace measured on this
  // screen (from the progress made since it opened, so coming back mid-way doesn't fake a fast pace)
  const p0Ref = useRef<number | null>(null);
  if (p0Ref.current === null && status === 'processing') p0Ref.current = p;
  const p0 = p0Ref.current ?? 0, gained = p - p0;
  const usual = info.est * (1 - p);
  const measured = gained > 0.02 ? elapsed / gained * (1 - p) : usual;
  const k = Math.min(1, Math.max(0, (gained - 0.08) / 0.4));
  const left = Math.max(0, usual * (1 - k) + measured * k);

  // the tab title shows progress, so the user can work in another tab
  useEffect(() => {
    const base = 'Animave';
    if (status === 'processing') document.title = `${Math.round(p * 100)}% · ${STAGES[cur - 1]?.label || 'Working'} — ${base}`;
    else if (status === 'completed') document.title = `✓ Ready — ${base}`;
    else if (status === 'failed') document.title = `Failed — ${base}`;
    return () => { document.title = base; };
  }, [status, p, cur]);

  const stages = useMemo(() => (seven ? STAGES : Array.from({ length: Math.max(1, totalSteps) }, (_, i) => ({ label: `Step ${i + 1}`, hint: '' }))), [seven, totalSteps]);
  const frame = aspect === '9:16' ? 'aspect-[9/16] w-[min(100%,340px)]' : aspect === '1:1' ? 'aspect-square w-[min(100%,420px)]' : 'aspect-video w-full';
  const preview = info.preview ? `/create/formats/${info.preview}.mp4` : null;

  return (
    <div className="min-h-[calc(100vh-48px)] px-4 md:px-8 py-6 md:py-10">
      <div className="max-w-[1080px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-8 lg:gap-14 items-start">

        {/* ── the frame: the style's loop while it is made, the reel when it is ready ── */}
        <div className="flex justify-center lg:sticky lg:top-8">
          <div className={`relative ${frame} rounded-[28px] border border-[var(--line-2)] bg-[#050505] overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)]`}>
            {status === 'completed' && finalVideo ? (
              <video key={finalVideo} src={finalVideo} controls autoPlay playsInline className="absolute inset-0 w-full h-full object-contain bg-black" />
            ) : (
              <>
                {preview && (
                  <video src={preview} muted loop autoPlay playsInline preload="metadata"
                    className={`absolute inset-0 w-full h-full object-cover transition-[filter,opacity] duration-700 ${status === 'failed' ? 'opacity-20 grayscale' : 'opacity-45 blur-[6px] scale-[1.06]'}`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
                {status === 'processing' && (
                  <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent animate-[scan_3.2s_ease-in-out_infinite]" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                  {status === 'failed' ? (
                    <span className="w-11 h-11 rounded-full bg-[rgba(255,90,90,0.12)] text-[#ff8a8a] flex items-center justify-center">{Ico.x}</span>
                  ) : (
                    <>
                      <div className="text-[44px] font-semibold tracking-[-0.04em] tabular-nums leading-none">{Math.round(p * 100)}<span className="text-[22px] text-[var(--fg-3)]">%</span></div>
                      <div className="mt-2 text-[12px] text-[var(--fg-2)]">{stages[cur - 1]?.label}</div>
                    </>
                  )}
                </div>
                <div className="absolute bottom-3 inset-x-0 text-center text-[10.5px] text-white/45">{status === 'failed' ? '' : `${modeLabel} · preview of the style`}</div>
              </>
            )}
          </div>
        </div>

        {/* ── the story of the production ── */}
        <div className="min-w-0">
          <div className="text-[12px] text-[var(--fg-4)] mb-2">{modeLabel}</div>
          <h1 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.03em] leading-[1.1] line-clamp-2">{title || modeLabel}</h1>

          {status === 'processing' && (
            <>
              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[22px] font-medium tracking-[-0.02em]">{fmtLeft(left)}</div>
                  <div className="text-[12.5px] text-[var(--fg-3)] mt-1 line-clamp-1">{message || 'Starting…'}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="ui-mono text-[13px] tabular-nums text-[var(--fg-2)]">{fmtClock(elapsed)}</div>
                  <div className="text-[11px] text-[var(--fg-4)]">elapsed</div>
                </div>
              </div>
              <div className="mt-4 h-[6px] rounded-full bg-white/[0.07] overflow-hidden">
                <div className="h-full rounded-full bg-[#ededed] transition-[width] duration-700 ease-out relative overflow-hidden" style={{ width: `${Math.max(3, p * 100)}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-[shine_1.8s_linear_infinite]" />
                </div>
              </div>
            </>
          )}

          {status === 'completed' && (
            <div className="mt-6">
              <div className="flex items-center gap-2.5 text-[15px]">
                <span className="w-6 h-6 rounded-full bg-[#ededed] text-black flex items-center justify-center">{Ico.check}</span>
                Your reel is ready{elapsed > 5 ? <span className="text-[var(--fg-4)]"> · made in {fmtClock(elapsed)}</span> : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {downloadHref && (
                  <a href={downloadHref} download className="ui-btn ui-btn-lg ui-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></svg>
                    Download MP4
                  </a>
                )}
                {onCreateAnother && <button onClick={onCreateAnother} className="ui-btn ui-btn-lg ui-btn-secondary">Make another</button>}
                <button onClick={onBack} className="ui-btn ui-btn-lg ui-btn-ghost">{Ico.back}Back to settings</button>
              </div>
              {caption && (
                <div className="mt-8 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[var(--fg-4)]">Ready to post · caption</span>
                    <button onClick={() => { navigator.clipboard?.writeText(caption).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {}); }}
                      className="ui-btn ui-btn-sm ui-btn-secondary">{copied ? 'Copied' : 'Copy'}</button>
                  </div>
                  <p className="text-[13.5px] leading-relaxed mt-2 whitespace-pre-wrap">{caption}</p>
                </div>
              )}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[['Vertical', '9:16 · 1080p'], ['Sound', 'Voice, music, effects'], ['Saved', 'In your library']].map(([k, v]) => (
                  <div key={k} className="rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3">
                    <div className="text-[11px] text-[var(--fg-4)]">{k}</div>
                    <div className="text-[13px] mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="mt-6 rounded-[14px] border border-[rgba(255,90,90,0.25)] bg-[rgba(255,90,90,0.05)] p-4">
              <div className="text-[14px] font-medium">This reel didn’t finish</div>
              <div className="text-[12.5px] text-[var(--fg-3)] mt-1.5 leading-relaxed break-words">{error || message || 'Something went wrong.'}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {onRetry && <button onClick={onRetry} className="ui-btn ui-btn-primary">Try again</button>}
                <button onClick={onBack} className="ui-btn ui-btn-secondary">{Ico.back}Back to settings</button>
              </div>
            </div>
          )}

          {/* the stages */}
          {status !== 'completed' && (
            <ol className="mt-8 flex flex-col">
              {stages.map((s, i) => {
                const n = i + 1, state = status === 'failed' ? (n < cur ? 'done' : n === cur ? 'fail' : 'todo') : n < cur ? 'done' : n === cur ? 'now' : 'todo';
                return (
                  <li key={s.label} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] border transition-colors duration-500 ${
                        state === 'done' ? 'bg-[#ededed] text-black border-transparent' : state === 'now' ? 'border-white/60 text-white' : state === 'fail' ? 'border-[rgba(255,90,90,0.5)] text-[#ff8a8a]' : 'border-[var(--line-2)] text-[var(--fg-4)]'}`}>
                        {state === 'done' ? Ico.check : state === 'now' ? <Spinner size={11} /> : state === 'fail' ? Ico.x : n}
                      </span>
                      {n < stages.length && <span className={`w-px flex-1 min-h-[18px] ${n < cur ? 'bg-white/40' : 'bg-[var(--line)]'}`} />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <div className={`text-[13.5px] leading-6 ${state === 'todo' ? 'text-[var(--fg-4)]' : 'text-[var(--fg)]'}`}>{s.label}</div>
                      {s.hint && state === 'now' && <div className="text-[12px] text-[var(--fg-3)]">{s.hint}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* tips while waiting */}
          {status === 'processing' && (
            <div className="mt-4 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--fg-4)]">While you wait · {TIPS[tip].k}</span>
                <span className="flex gap-1">{TIPS.map((_, i) => <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i === tip ? 'w-4 bg-white/70' : 'w-1 bg-white/20'}`} />)}</span>
              </div>
              <p key={tip} className="text-[13.5px] leading-relaxed mt-2 animate-[fadein_.6s_ease-out]">{TIPS[tip].v}</p>
            </div>
          )}

          {status === 'processing' && (
            <div className="mt-6 flex items-center justify-between gap-4 text-[12px] text-[var(--fg-4)]">
              <span>Keep this tab open until it finishes. You can work in another tab; its title shows the progress.</span>
              <button onClick={onBack} className="ui-btn ui-btn-sm ui-btn-ghost flex-shrink-0">{Ico.back}Settings</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
