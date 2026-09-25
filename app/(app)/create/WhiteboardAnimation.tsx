'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { whiteboardCost } from '@/lib/types';
import StudioGenerationView from './StudioGenerationView';
import { EditorHeader, EditorPage, Intro, Section, Label, Segmented, Toggle, TextArea, VoiceGrid, ActionBar, Credits, AspectGlyph, Ico } from '@/components/editor/kit';

type Step = 'setup' | 'generating' | 'done';
type Aspect = '16:9' | '9:16' | '1:1';

interface Voice { voice_id: string; name: string; preview_url?: string; labels?: { gender?: string; descriptive?: string; accent?: string; age?: string; use_case?: string; [k: string]: string | undefined } }
interface SceneStatus { scene_index: number; status: string; image_url: string | null; video_url: string | null; }

const ASPECTS: { id: Aspect; label: string; sub: string }[] = [
  { id: '16:9', label: '16:9', sub: 'YouTube' },
  { id: '9:16', label: '9:16', sub: 'TikTok / Reels' },
  { id: '1:1', label: '1:1', sub: 'Instagram' },
];
const DURATIONS = [1, 2, 3, 5, 10];

export default function WhiteboardAnimation({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('setup');

  const [title, setTitle] = useState('');
  const [aspect, setAspect] = useState<Aspect>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [durationMinutes, setDurationMinutes] = useState(1);
  const [colored, setColored] = useState(false);
  const [includeNarrator, setIncludeNarrator] = useState(true);
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [narratorSpeed, setNarratorSpeed] = useState(1);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reqRef = useRef<string | null>(null);

  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [scenes, setScenes] = useState<SceneStatus[]>([]);
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [genErr, setGenErr] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/voices').then(r => r.json()).then(d => setVoices(Array.isArray(d) ? d : (d?.voices || []))).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const stopPreview = () => {
    reqRef.current = null;
    if (audioRef.current) { try { audioRef.current.pause(); } catch { /* noop */ } audioRef.current = null; }
    setPreviewVoice(null);
  };

  const playVoicePreview = (v: Voice) => {
    if (previewVoice === v.voice_id) { stopPreview(); return; }
    stopPreview();
    reqRef.current = v.voice_id;
    setPreviewVoice(v.voice_id);
    const startUrl = (url: string) => {
      if (reqRef.current !== v.voice_id || !url) { stopPreview(); return; }
      let failed = false;
      const onFail = () => {
        if (failed || reqRef.current !== v.voice_id) return;
        failed = true;
        if (url === v.preview_url) fallbackTTS(); else stopPreview();
      };
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => { if (reqRef.current === v.voice_id) stopPreview(); };
      a.onerror = onFail;
      a.play().catch(onFail);
    };
    const fallbackTTS = async () => {
      try {
        const res = await fetch('/api/tts-test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Let me show you how this works, step by step.', voice_id: v.voice_id }),
        });
        const data = await res.json();
        if (reqRef.current !== v.voice_id) return;
        startUrl(data?.audio_url || '');
      } catch { if (reqRef.current === v.voice_id) stopPreview(); }
    };
    if (v.preview_url) startUrl(v.preview_url); else fallbackTTS();
  };

  const pollStatus = async (jid: string) => {
    try {
      const r = await fetch(`/api/status/${jid}`);
      const d = await r.json();
      setGenMsg(d.message || ''); setGenStep(d.step || 0); setGenTotal(d.total_steps || 0);
      setScenes(d.scenes || []);
      if (d.status === 'completed') {
        setGenStatus('completed'); setFinalVideo(d.final_video_url); setStep('done');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'completed', final_video_url: d.final_video_url }).eq('job_id', jid); } catch { /* noop */ }
      } else if (d.status === 'failed') {
        setGenStatus('failed'); setGenErr(d.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'failed' }).eq('job_id', jid); } catch { /* noop */ }
      } else setGenStatus('processing');
    } catch { /* keep polling */ }
  };

  const startGeneration = async () => {
    setStep('generating'); setGenStatus('processing'); setGenErr(''); setFinalVideo(null); setScenes([]);
    try {
      const r = await fetch('/api/whiteboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, aspect_ratio: aspect, resolution, duration_minutes: durationMinutes, colored,
          render_style: colored ? 'illustrated' : 'classic',
          include_narrator: includeNarrator && !!voiceId,
          narrator_voice_id: voiceId,
          narrator_speed: narratorSpeed,
          include_subtitles: includeSubtitles && includeNarrator && !!voiceId,
        }),
      });
      const d = await r.json();
      if (r.status === 402) { setGenStatus('failed'); setGenErr(d.error || 'Not enough credits.'); return; }
      if (d.job_id) {
        pollRef.current = setInterval(() => pollStatus(d.job_id), 3000);
        pollStatus(d.job_id);
      } else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  const stepIndex = step === 'setup' ? 0 : 1;
  const cost = whiteboardCost(durationMinutes);

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader
        format="Whiteboard"
        onBack={onBack}
        steps={['Setup', 'Render']}
        current={stepIndex}
        right={<Credits n={cost} suffix="credits est." />}
      />

      {step === 'setup' && (
        <>
          <EditorPage>
            <Intro title="What should we explain?" desc="A hand-drawn doodle is sketched for each beat on a whiteboard, with narration and captions." />

            <Section n={1} title="Topic">
              <TextArea big value={title} onChange={e => setTitle(e.target.value)} rows={3}
                placeholder="Explain how compound interest works…" />
            </Section>

            <Section n={2} title="Drawing style">
              <div className="grid sm:grid-cols-2 gap-2.5">
                {[
                  { v: false, label: 'Black & white', sub: 'Classic single-ink line drawing' },
                  { v: true, label: 'Illustrated colour', sub: 'Scenes drawn, then coloured piece by piece' },
                ].map(o => {
                  const on = colored === o.v;
                  return (
                    <button key={String(o.v)} onClick={() => setColored(o.v)}
                      className={`group relative flex items-center gap-4 p-3 rounded-[10px] border text-left transition-all ${on ? 'border-[var(--line-3)] bg-white/[0.05]' : 'border-[var(--line)] hover:border-[var(--line-2)]'}`}>
                      <span className="relative w-[92px] h-[60px] rounded-[10px] bg-[#f4f4f2] overflow-hidden flex-shrink-0">
                        <svg viewBox="0 0 92 60" className="absolute inset-0 w-full h-full" fill="none">
                          <path d="M10 44c8-16 16-20 24-12s14 10 20-4 14-14 22-2" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="70" cy="16" r="7" stroke="#111" strokeWidth="1.6" fill={o.v ? '#bdbdbd' : 'none'} />
                          <rect x="10" y="10" width="20" height="12" rx="2" stroke="#111" strokeWidth="1.4" fill={o.v ? '#8c8c8c' : 'none'} />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium">{o.label}</span>
                        <span className="block text-[11.5px] text-[var(--fg-4)] leading-relaxed">{o.sub}</span>
                      </span>
                      
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section n={3} title="Output">
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
              <Segmented full value={durationMinutes} onChange={setDurationMinutes}
                options={DURATIONS.map(d => ({ value: d, label: `${d} min`, sub: `${whiteboardCost(d).toLocaleString()} cr` }))} />
            </Section>

            <Section n={4} title="Narrator" hint={includeNarrator ? 'Pick a voice — tap ▶ to preview' : 'Off — video will have no voiceover'}
              right={<Toggle on={includeNarrator} onChange={setIncludeNarrator} label="Narrator" />}>
              {includeNarrator ? (
                <>
                  <VoiceGrid voices={voices} value={voiceId} onChange={setVoiceId} previewing={previewVoice} onPreview={v => playVoicePreview(v as Voice)} />
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mt-5 pt-5 border-t border-[var(--line)]">
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-[var(--fg-3)]">Speed</span>
                      <Segmented size="sm" value={narratorSpeed} onChange={setNarratorSpeed}
                        options={[1, 1.5, 2].map(sp => ({ value: sp, label: `${sp}×` }))} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-[var(--fg-3)]">Captions</span>
                      <Toggle on={includeSubtitles} onChange={setIncludeSubtitles} label="Captions" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[10px] border border-dashed border-[var(--line-2)] py-8 text-center text-[12.5px] text-[var(--fg-4)]">Narration disabled</div>
              )}
            </Section>
          </EditorPage>

          <ActionBar left={
            includeNarrator && !voiceId
              ? <span>Pick a narrator voice to continue</span>
              : <><Credits n={cost} /><span className="hidden sm:inline">· deducted when you generate</span></>
          }>
            <button onClick={startGeneration} disabled={!title.trim() || (includeNarrator && !voiceId)} className="ui-btn ui-btn-primary">
              Generate{Ico.arrow}
            </button>
          </ActionBar>
        </>
      )}

      {step === 'generating' && (
        <StudioGenerationView
          title={title}
          modeLabel="Whiteboard Animation"
          aspect={aspect}
          status={genStatus}
          message={genMsg || 'Drawing your whiteboard video...'}
          error={genErr}
          scenes={scenes}
          finalVideo={finalVideo}
          step={genStep}
          totalSteps={genTotal}
          onBack={() => setStep('setup')}
          onRetry={startGeneration}
        />
      )}

      {step === 'done' && finalVideo && (
        <StudioGenerationView
          title={title}
          modeLabel="Whiteboard Animation"
          aspect={aspect}
          status={genStatus}
          message="Your whiteboard video is ready"
          scenes={scenes}
          finalVideo={finalVideo}
          step={genTotal}
          totalSteps={genTotal || 1}
          onBack={() => setStep('setup')}
          downloadHref={`/api/download?url=${encodeURIComponent(finalVideo)}&filename=${encodeURIComponent((title || 'whiteboard') + '.mp4')}`}
          onCreateAnother={() => { setStep('setup'); setFinalVideo(null); setGenStatus('idle'); setScenes([]); }}
        />
      )}
    </div>
  );
}
