'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { animatedStoryCost } from '@/lib/types';
import StudioGenerationView from './StudioGenerationView';
import { EditorHeader, EditorPage, Intro, Section, Label, Segmented, StyleCard, Toggle, TextArea, VoiceGrid, ActionBar, Credits, ErrorNote, Spinner, AspectGlyph, Ico } from '@/components/editor/kit';

type Step = 'setup' | 'character' | 'generating' | 'done';
type Aspect = '16:9' | '9:16' | '1:1';

interface Voice { voice_id: string; name: string; preview_url?: string; labels?: { gender?: string; descriptive?: string; accent?: string; age?: string; use_case?: string; [k: string]: string | undefined } }
interface SceneStatus { scene_index: number; status: string; image_url: string | null; video_url: string | null; }

const STYLES = [
  { id: 'western_cartoon', label: 'Western Cartoon', grad: 'from-[#3a2a17] to-[#14100a]' },
  { id: 'anime', label: 'Anime', grad: 'from-[#2a1d33] to-[#0f0d18]' },
  { id: 'pixar', label: 'Pixar 3D', grad: 'from-[#33231d] to-[#141014]' },
  { id: 'comic', label: 'Comic', grad: 'from-[#3a1a1a] to-[#1a1206]' },
];
const ASPECTS: { id: Aspect; label: string; sub: string }[] = [
  { id: '9:16', label: '9:16', sub: 'TikTok / Reels' },
  { id: '16:9', label: '16:9', sub: 'YouTube' },
  { id: '1:1', label: '1:1', sub: 'Instagram' },
];
const DURATIONS = [1, 2, 3, 5, 10];

export default function AnimatedStorytelling({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('setup');

  // setup
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('western_cartoon');
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [durationMinutes, setDurationMinutes] = useState(1);
  const [includeNarrator, setIncludeNarrator] = useState(true);
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [narratorSpeed, setNarratorSpeed] = useState(1);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [previewVoice, setPreviewVoice] = useState<string | null>(null); // voice_id currently loading/playing
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reqRef = useRef<string | null>(null); // latest requested voice (guards async races)

  // character
  const [charDesc, setCharDesc] = useState('');
  const [charUrl, setCharUrl] = useState<string | null>(null);
  const [charGen, setCharGen] = useState(false);
  const [charErr, setCharErr] = useState('');

  // generation
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
    // Second click on the playing voice → stop it.
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
        // preview_url is broken for this voice → fall back to live TTS once.
        if (url === v.preview_url) fallbackTTS();
        else stopPreview();
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Once upon a time, an unforgettable adventure was about to begin.', voice_id: v.voice_id }),
        });
        const data = await res.json();
        if (reqRef.current !== v.voice_id) return;
        startUrl(data?.audio_url || '');
      } catch {
        if (reqRef.current === v.voice_id) stopPreview();
      }
    };

    if (v.preview_url) startUrl(v.preview_url);
    else fallbackTTS();
  };

  const generateCharacter = async () => {
    if (!charDesc.trim()) return;
    setCharGen(true); setCharErr(''); setCharUrl(null);
    try {
      const r = await fetch('/api/generate-character', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: charDesc, style }),
      });
      const d = await r.json();
      if (d.character_image_url) setCharUrl(d.character_image_url);
      else setCharErr(d.error || 'Failed to generate character');
    } catch { setCharErr('Failed to generate character'); }
    setCharGen(false);
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
        // Mark the dashboard record completed so it shows in "Last 24 Hours"
        try {
          await createClient().from('animations')
            .update({ status: 'completed', final_video_url: d.final_video_url })
            .eq('job_id', jid);
        } catch { /* non-fatal */ }
      } else if (d.status === 'failed') {
        setGenStatus('failed'); setGenErr(d.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
        try {
          await createClient().from('animations').update({ status: 'failed' }).eq('job_id', jid);
        } catch { /* non-fatal */ }
      } else setGenStatus('processing');
    } catch { /* keep polling */ }
  };

  const startGeneration = async () => {
    setStep('generating'); setGenStatus('processing'); setGenErr(''); setFinalVideo(null); setScenes([]);
    try {
      const r = await fetch('/api/animated-story', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, theme: '', style, aspect_ratio: aspect, resolution, duration_minutes: durationMinutes,
          include_narrator: includeNarrator && !!voiceId,
          narrator_voice_id: voiceId,
          narrator_speed: narratorSpeed,
          include_subtitles: includeSubtitles && includeNarrator && !!voiceId,
          characters: [{ id: 'char-1', description: charDesc, char_url: charUrl, style }],
        }),
      });
      const d = await r.json();
      console.log('[animated-story] start response:', d);
      if (r.status === 402) {
        setGenStatus('failed');
        setGenErr(d.error || 'Not enough credits.');
        return;
      }
      if (d.job_id) {
        pollRef.current = setInterval(() => pollStatus(d.job_id), 3000);
        pollStatus(d.job_id);
      } else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  const stepIndex = step === 'setup' ? 0 : step === 'character' ? 1 : 2;
  const cost = animatedStoryCost(durationMinutes, resolution);
  const inStudio = step === 'generating' || step === 'done';

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader
        format="Animated Story"
        onBack={onBack}
        steps={['Setup', 'Character', 'Render']}
        current={stepIndex}
        onStep={inStudio ? undefined : i => setStep(i === 0 ? 'setup' : 'character')}
        right={<Credits n={cost} suffix="credits est." />}
      />

      {/* ── SETUP ── */}
      {step === 'setup' && (
        <>
          <EditorPage>
            <Intro title="Shape your story" desc="Give it a premise, pick a look and a narrator. We'll handle the script, scenes and edit." />

            <Section n={1} title="Premise">
              <TextArea big value={title} onChange={e => setTitle(e.target.value)} rows={3}
                placeholder="A detective uncovers a midnight conspiracy…" />
            </Section>

            <Section n={2} title="Visual style">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {STYLES.map((s, i) => (
                  <StyleCard key={s.id} label={s.label} index={i} active={style === s.id} onClick={() => setStyle(s.id)} />
                ))}
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
                    options={(['720p', '1080p'] as const).map(r => ({ value: r, label: r, sub: `${animatedStoryCost(durationMinutes, r).toLocaleString()} cr` }))} />
                </div>
              </div>
              <Label>Length</Label>
              <Segmented full value={durationMinutes} onChange={setDurationMinutes}
                options={DURATIONS.map(d => ({ value: d, label: `${d} min`, sub: `${animatedStoryCost(d, resolution).toLocaleString()} cr` }))} />
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
              : <span className="truncate"><span className="text-white font-medium">{STYLES.find(s => s.id === style)?.label}</span> · {aspect} · {durationMinutes} min</span>
          }>
            <button onClick={() => setStep('character')} disabled={!title.trim() || (includeNarrator && !voiceId)} className="ui-btn ui-btn-primary">
              Continue{Ico.arrow}
            </button>
          </ActionBar>
        </>
      )}

      {/* ── CHARACTER ── */}
      {step === 'character' && (
        <>
          <EditorPage width={980}>
            <Intro title="Design your lead" desc="Describe the main character — they'll stay consistent across every scene." />
            <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
              <div className="flex flex-col gap-4">
                <TextArea big value={charDesc} onChange={e => setCharDesc(e.target.value)} rows={6}
                  placeholder="A detective with slicked-back dark hair, full beard, tan trench coat, red tie..." />
                <div className="flex items-center gap-3">
                  <button onClick={generateCharacter} disabled={!charDesc.trim() || charGen} className="ui-btn ui-btn-secondary">
                    {charGen ? <><Spinner size={13} />Designing…</> : <>{Ico.sparkle}{charUrl ? 'Regenerate' : 'Generate character'}</>}
                  </button>
                  <span className="text-[12px] text-[var(--fg-4)]">Style: {STYLES.find(s => s.id === style)?.label}</span>
                </div>
                {charErr && <ErrorNote>{charErr}</ErrorNote>}
              </div>
              <div className="relative aspect-[3/4] rounded-[10px] border border-[var(--line)] bg-[#080808] overflow-hidden flex items-center justify-center">
                {charGen ? (
                  <div className="relative flex flex-col items-center gap-3"><Spinner size={18} /><span className="text-[12px] text-[var(--fg-3)]">Designing character…</span></div>
                ) : charUrl ? (
                  <img src={charUrl} alt="character" className="relative w-full h-full object-contain" />
                ) : (
                  <div className="relative flex flex-col items-center gap-3 text-white/20">
                    <span className="">{Ico.user}</span>
                    <span className="text-[12px] text-[var(--fg-4)] mt-3">Your character appears here</span>
                  </div>
                )}
                {charUrl && !charGen && <span className="absolute top-3 left-3 ui-chip ui-chip-solid">{Ico.check}Ready</span>}
              </div>
            </div>
          </EditorPage>

          <ActionBar left={<><Credits n={cost} /><span className="hidden sm:inline">· deducted when you generate</span></>}>
            <button onClick={() => setStep('setup')} className="ui-btn ui-btn-ghost">Back</button>
            <button onClick={startGeneration} disabled={!charUrl} className="ui-btn ui-btn-primary">Generate story{Ico.arrow}</button>
          </ActionBar>
        </>
      )}

      {/* ── GENERATING ── */}
      {step === 'generating' && (
        <StudioGenerationView
          title={title}
          modeLabel="Animated Storytelling"
          aspect={aspect}
          status={genStatus}
          message={genMsg || 'Creating your animated story...'}
          error={genErr}
          scenes={scenes}
          finalVideo={finalVideo}
          step={genStep}
          totalSteps={genTotal}
          onBack={() => setStep('character')}
          onRetry={startGeneration}
        />
      )}

      {/* ── DONE ── */}
      {step === 'done' && finalVideo && (
        <StudioGenerationView
          title={title}
          modeLabel="Animated Storytelling"
          aspect={aspect}
          status={genStatus}
          message="Your animated story is ready"
          scenes={scenes}
          finalVideo={finalVideo}
          step={genTotal}
          totalSteps={genTotal || 1}
          onBack={() => setStep('character')}
          downloadHref={finalVideo}
          onCreateAnother={() => { setStep('setup'); setCharUrl(null); setCharDesc(''); setFinalVideo(null); setGenStatus('idle'); setScenes([]); }}
        />
      )}
    </div>
  );
}
