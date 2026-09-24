'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorHeader, EditorPage, Intro, Section, Label, Segmented, StyleCard, TextArea, ActionBar, Credits, AspectGlyph, Ico, Stage, StageEmpty, StudioPanel, ChatPanel, StudioTimeline, StatusDot, Spinner } from '@/components/editor/kit';
import { createClient } from '@/lib/supabase/client';
import { fruitDramaCost, fruitDramaSceneCost } from '@/lib/types';

type Step = 'setup' | 'character' | 'editor';

const STYLES = [
  { value: 'western-cartoon', label: 'Western Cartoon' },
  { value: 'anime', label: 'Anime' },
  { value: 'pixar', label: 'Pixar' },
  { value: 'comic', label: 'Comic' },
  { value: 'retro', label: 'Retro' },
  { value: 'custom', label: 'Realistic' },
];
type Aspect = '9:16' | '16:9';
type Resolution = '720p' | '1080p';
type Gender = 'girl' | 'boy';
type GenStatus = 'idle' | 'processing' | 'completed' | 'failed';

interface DialogueLine { speaker: string; line: string; }
interface ChatMessage { role: 'user' | 'assistant'; text: string; }
interface SceneStatus {
  scene_index: number;
  status: string;
  title?: string;
  emotion?: string;
  dialogue?: DialogueLine[];
  duration_seconds?: number;
  image_url: string | null;
  video_url: string | null;
  error?: string | null;
}

const FRUITS = ['peach', 'banana', 'strawberry', 'mango', 'apple', 'orange', 'pineapple', 'watermelon', 'cherry', 'grape'];
const DURATION_STEPS = [4, 6, 8] as const;
const PX_PER_SECOND = 82;

function snapDuration(seconds: number): 4 | 6 | 8 {
  return DURATION_STEPS.reduce((best, current) => Math.abs(current - seconds) < Math.abs(best - seconds) ? current : best, 4);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}:00`;
}

function seedScenes(count: number, duration: number): SceneStatus[] {
  return Array.from({ length: count }, (_, i) => ({
    scene_index: i + 1,
    status: 'queued',
    title: `Scene ${i + 1}`,
    duration_seconds: duration,
    image_url: null,
    video_url: null,
  }));
}

function isBusy(status: string): boolean {
  return ['queued', 'processing', 'rendering_image', 'animating', 'regenerating'].includes(status);
}

function sceneFromText(text: string, fallback: number): number {
  const match = text.match(/(?:scene|sahne)\s*(\d+)/i) || text.match(/\b(\d+)\.?\s*(?:scene|sahne)/i);
  return match ? Math.max(1, Number(match[1])) : fallback;
}

function durationFromText(text: string): 4 | 6 | 8 | null {
  const match = text.match(/\b([468])\s*(?:s|sn|sec|second|seconds|saniye)\b/i);
  return match ? snapDuration(Number(match[1])) : null;
}

export default function FruitDrama({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('setup');
  const [style, setStyle] = useState('anime');  // Visual Style (parity with 2D setup)
  const [title, setTitle] = useState('Peach girl discovers banana boss lied to her');
  const [mainFruit, setMainFruit] = useState('peach');
  const [mainGender, setMainGender] = useState<Gender>('girl');
  const [secondFruit, setSecondFruit] = useState('banana');
  const [secondGender, setSecondGender] = useState<Gender>('boy');
  const [sceneCount, setSceneCount] = useState(5);
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [durationSeconds, setDurationSeconds] = useState<4 | 6 | 8>(8);

  const [jobId, setJobId] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<GenStatus>('idle');
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genErr, setGenErr] = useState('');
  const [scenes, setScenes] = useState<SceneStatus[]>([]);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(1);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [clipDurations, setClipDurations] = useState<Record<number, number>>({});
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'I am Mave. Tell me what to change, like make scene 2 more dramatic or shorten scene 3 to 4s.' },
  ]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resizeRef = useRef<{ sceneIndex: number; startX: number; startDuration: number } | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    const onMove = (event: globalThis.MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = event.clientX - resizeRef.current.startX;
      const next = snapDuration(resizeRef.current.startDuration + delta / PX_PER_SECOND);
      setClipDurations(prev => ({ ...prev, [resizeRef.current!.sceneIndex]: next }));
      setScenes(prev => prev.map(scene => scene.scene_index === resizeRef.current!.sceneIndex ? { ...scene, duration_seconds: next } : scene));
    };
    const onUp = () => { resizeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const selectedScene = useMemo(
    () => selectedSceneIndex === 0 ? null : (scenes.find(s => s.scene_index === selectedSceneIndex) || scenes[0] || null),
    [scenes, selectedSceneIndex],
  );
  const totalDuration = scenes.reduce((sum, scene) => sum + (clipDurations[scene.scene_index] || scene.duration_seconds || durationSeconds), 0);
  const cost = fruitDramaCost(sceneCount, resolution, durationSeconds);
  const selectedDuration = selectedScene ? (clipDurations[selectedScene.scene_index] || selectedScene.duration_seconds || durationSeconds) : durationSeconds;
  const regenCost = fruitDramaSceneCost(resolution, selectedDuration);
  const progress = genTotal ? Math.min(100, Math.round((genStep / genTotal) * 100)) : 0;
  const showFinal = selectedSceneIndex === 0 && !!finalVideo;
  const canGenerate = title.trim().length > 5 && mainFruit && secondFruit;

  const syncDurations = (incomingScenes: SceneStatus[]) => {
    setClipDurations(prev => {
      const next = { ...prev };
      incomingScenes.forEach(scene => {
        if (!next[scene.scene_index]) next[scene.scene_index] = scene.duration_seconds || durationSeconds;
      });
      return next;
    });
  };

  const pollStatus = async (jid: string) => {
    try {
      const res = await fetch(`/api/status/${jid}`);
      const data = await res.json();
      const incomingScenes: SceneStatus[] = data.scenes || [];
      setGenMsg(data.message || '');
      setGenStep(data.step || 0);
      setGenTotal(data.total_steps || 0);
      setFinalVideo(data.final_video_url || null);
      setScenes(incomingScenes);
      syncDurations(incomingScenes);
      setSelectedSceneIndex(prev => {
        if (prev === 0 && data.final_video_url) return 0;
        if (incomingScenes.some(scene => scene.scene_index === prev)) return prev;
        const active = incomingScenes.find(scene => isBusy(scene.status)) || incomingScenes.find(scene => scene.video_url) || incomingScenes[0];
        return active?.scene_index || 1;
      });

      if (data.status === 'completed') {
        setGenStatus('completed');
        setGenErr('');
        if (pollRef.current) clearInterval(pollRef.current);
        try {
          await createClient().from('animations').update({ status: 'completed', final_video_url: data.final_video_url }).eq('job_id', jid);
        } catch { /* noop */ }
      } else if (data.status === 'failed') {
        setGenStatus('failed');
        setGenErr(data.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'failed' }).eq('job_id', jid); } catch { /* noop */ }
      } else {
        setGenStatus('processing');
      }
    } catch {
      /* keep polling */
    }
  };

  const startPolling = (jid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => pollStatus(jid), 3000);
    pollStatus(jid);
  };

  const startGeneration = async () => {
    setStep('editor');
    setGenStatus('processing');
    setGenErr('');
    setGenMsg('Starting fruit drama...');
    setFinalVideo(null);
    setJobId(null);
    const seeded = seedScenes(sceneCount, durationSeconds);
    setScenes(seeded);
    setClipDurations(Object.fromEntries(seeded.map(scene => [scene.scene_index, durationSeconds])));
    setSelectedSceneIndex(1);

    try {
      const res = await fetch('/api/fruit-drama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          main_fruit: mainFruit,
          main_gender: mainGender,
          second_fruit: secondFruit,
          second_gender: secondGender,
          scene_count: sceneCount,
          aspect_ratio: aspect,
          resolution,
          duration_seconds_per_scene: durationSeconds,
        }),
      });
      const data = await res.json();
      if (!data.job_id) {
        setGenStatus('failed');
        setGenErr(data.error || 'Failed to start');
        return;
      }
      setJobId(data.job_id);
      startPolling(data.job_id);
    } catch {
      setGenStatus('failed');
      setGenErr('Failed to start generation');
    }
  };

  const regenerateScene = async (sceneIndex: number, overrideDuration?: number) => {
    if (!jobId || genStatus === 'processing') return;
    const nextDuration = snapDuration(overrideDuration || clipDurations[sceneIndex] || durationSeconds);
    setGenStatus('processing');
    setGenErr('');
    setGenMsg(`Regenerating scene ${sceneIndex}...`);
    setSelectedSceneIndex(sceneIndex);
    setClipDurations(prev => ({ ...prev, [sceneIndex]: nextDuration }));
    setScenes(prev => prev.map(scene => scene.scene_index === sceneIndex ? { ...scene, status: 'regenerating', duration_seconds: nextDuration, error: null } : scene));

    try {
      const res = await fetch('/api/fruit-drama/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, scene_index: sceneIndex, duration_seconds: nextDuration }),
      });
      const data = await res.json();
      if (!res.ok || !data.job_id) {
        setGenStatus('failed');
        setGenErr(data.error || data.detail || 'Scene regeneration failed to start');
        return;
      }
      startPolling(jobId);
    } catch {
      setGenStatus('failed');
      setGenErr('Scene regeneration failed to start');
    }
  };

  const submitAiEdit = async () => {
    const instruction = chatInput.trim();
    if (!instruction || !jobId || genStatus === 'processing') return;
    const targetScene = Math.min(scenes.length || 1, sceneFromText(instruction, selectedSceneIndex || 1));
    const requestedDuration = durationFromText(instruction) || snapDuration(clipDurations[targetScene] || durationSeconds);
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: instruction }, { role: 'assistant', text: `I will update scene ${targetScene} and regenerate it.` }]);
    setGenStatus('processing');
    setGenErr('');
    setGenMsg('AI is planning the edit...');
    setSelectedSceneIndex(targetScene);
    setClipDurations(prev => ({ ...prev, [targetScene]: requestedDuration }));
    setScenes(prev => prev.map(scene => scene.scene_index === targetScene ? { ...scene, status: 'regenerating', duration_seconds: requestedDuration } : scene));

    try {
      const res = await fetch('/api/fruit-drama/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          instruction,
          scene_index: targetScene,
          duration_seconds: requestedDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.job_id) {
        setGenStatus('failed');
        setGenErr(data.error || data.detail || 'AI edit failed to start');
        setChatMessages(prev => [...prev, { role: 'assistant', text: data.error || data.detail || 'I could not start that edit.' }]);
        return;
      }
      startPolling(jobId);
    } catch {
      setGenStatus('failed');
      setGenErr('AI edit failed to start');
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'I could not start that edit.' }]);
    }
  };

  const stepIndex = step === 'setup' ? 0 : step === 'character' ? 1 : 2;

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader
        format="Fruit Drama"
        onBack={step === 'setup' ? onBack : () => setStep(step === 'editor' ? 'character' : 'setup')}
        steps={['Setup', 'Characters', 'Studio']}
        current={stepIndex}
        onStep={step === 'editor' ? undefined : i => setStep(i === 0 ? 'setup' : 'character')}
        meta={step === 'editor' ? <span className="ui-chip ui-chip-muted">{resolution} · {aspect} · {durationSeconds}s clips</span> : undefined}
        right={step === 'editor'
          ? <span className="hidden md:flex items-center gap-2 text-[11.5px] text-[var(--fg-3)] max-w-[320px] truncate">
              {genStatus === 'processing' ? <Spinner size={12} /> : <StatusDot status={genStatus === 'failed' ? 'failed' : 'completed'} />}
              <span className="truncate">{genErr || genMsg || 'Ready'}</span>
            </span>
          : <Credits n={cost} suffix="" />}
      />

      {step === 'setup' && (
        <SetupView
          title={title} setTitle={setTitle}
          style={style} setStyle={setStyle}
          sceneCount={sceneCount} setSceneCount={setSceneCount}
          aspect={aspect} setAspect={setAspect}
          resolution={resolution} setResolution={setResolution}
          durationSeconds={durationSeconds} setDurationSeconds={setDurationSeconds}
          onNext={() => setStep('character')}
        />
      )}
      {step === 'character' && (
        <CharacterView
          mainFruit={mainFruit} setMainFruit={setMainFruit}
          mainGender={mainGender} setMainGender={setMainGender}
          secondFruit={secondFruit} setSecondFruit={setSecondFruit}
          secondGender={secondGender} setSecondGender={setSecondGender}
          cost={cost} canGenerate={!!canGenerate} startGeneration={startGeneration}
          onBack={() => setStep('setup')}
        />
      )}

      {step === 'editor' && (
        <div className="flex flex-col gap-3 p-3 md:p-4 min-h-[calc(100vh-60px)] lg:h-[calc(100vh-60px)]">
          <div className="grid grid-cols-1 lg:grid-cols-[272px_minmax(0,1fr)_300px] gap-3 flex-1 min-h-[420px]">
            <ScenePanel scene={selectedScene} finalSelected={selectedSceneIndex === 0} totalDuration={totalDuration} regenCost={regenCost} />
            <PreviewPanel
              aspect={aspect}
              finalVideo={finalVideo}
              showFinal={showFinal}
              selectedScene={selectedScene}
              genStatus={genStatus}
              progress={progress}
              onFinal={() => setSelectedSceneIndex(0)}
              onRegenerate={() => selectedScene && regenerateScene(selectedScene.scene_index)}
            />
            <ChatPanel
              messages={chatMessages}
              value={chatInput}
              onChange={setChatInput}
              onSubmit={submitAiEdit}
              disabled={!jobId || genStatus === 'processing'}
              placeholder="Change scene 2, make it sadder…"
            />
          </div>
          <StudioTimeline
            clips={scenes.map(scene => ({ n: scene.scene_index, duration: clipDurations[scene.scene_index] || scene.duration_seconds || 8, status: scene.status, image: scene.image_url }))}
            selected={selectedSceneIndex}
            onSelect={setSelectedSceneIndex}
            onResizeStart={(sceneIndex, event) => {
              event.preventDefault();
              resizeRef.current = { sceneIndex, startX: event.clientX, startDuration: clipDurations[sceneIndex] || durationSeconds };
            }}
            pxPerSecond={PX_PER_SECOND}
            totalDuration={totalDuration}
            formatTime={formatTime}
            right={finalVideo ? <button onClick={() => setSelectedSceneIndex(0)} className={`ui-btn ui-btn-sm ${selectedSceneIndex === 0 ? 'ui-btn-secondary' : 'ui-btn-ghost'}`}>Final cut</button> : undefined}
          />
        </div>
      )}
    </div>
  );
}

function SetupView(props: {
  title: string; setTitle: (v: string) => void;
  style: string; setStyle: (v: string) => void;
  sceneCount: number; setSceneCount: (v: number) => void;
  aspect: Aspect; setAspect: (v: Aspect) => void;
  resolution: Resolution; setResolution: (v: Resolution) => void;
  durationSeconds: 4 | 6 | 8; setDurationSeconds: (v: 4 | 6 | 8) => void;
  onNext: () => void;
}) {
  return (
    <>
      <EditorPage>
        <Intro eyebrow="Step 1 · Setup" title="Set up your drama" desc="A premise, a look and the shape of the cut. Characters come next." />

        <Section n={1} title="Premise">
          <TextArea big value={props.title} onChange={e => props.setTitle(e.target.value)} rows={3}
            placeholder="A detective uncovers a midnight conspiracy…" />
        </Section>

        <Section n={2} title="Visual style">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {STYLES.map((s, i) => (
              <StyleCard key={s.value} label={s.label} index={i} active={props.style === s.value} onClick={() => props.setStyle(s.value)} />
            ))}
          </div>
        </Section>

        <Section n={3} title="Output">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <Label>Format</Label>
              <Segmented full value={props.aspect} onChange={props.setAspect}
                options={(['16:9', '9:16'] as const).map(a => ({ value: a, label: a, icon: <AspectGlyph a={a} /> }))} />
            </div>
            <div>
              <Label>Quality</Label>
              <Segmented full value={props.resolution}
                onChange={(r: Resolution) => { props.setResolution(r); if (r === '1080p') props.setDurationSeconds(8); }}
                options={(['720p', '1080p'] as const).map(r => ({ value: r, label: r }))} />
            </div>
            <div>
              <Label right={props.resolution === '1080p' ? <span className="text-[11px] text-[var(--fg-4)]">1080p renders 8s clips</span> : undefined}>Scene duration</Label>
              <Segmented full value={props.durationSeconds} onChange={props.setDurationSeconds}
                options={([4, 6, 8] as const).map(d => ({ value: d, label: `${d}s`, icon: Ico.clock, disabled: props.resolution === '1080p' && d !== 8 }))} />
            </div>
            <div>
              <Label>Scene count</Label>
              <Segmented full value={props.sceneCount} onChange={props.setSceneCount}
                options={[3, 5, 8, 10].map(n => ({ value: n, label: String(n) }))} />
            </div>
          </div>
        </Section>
      </EditorPage>

      <ActionBar left={<span className="truncate"><span className="text-white font-medium">{props.sceneCount} scenes</span> · {props.durationSeconds}s · {props.aspect} · {props.resolution}</span>}>
        <button onClick={props.onNext} disabled={!props.title.trim()} className="ui-btn ui-btn-primary">Next: Characters{Ico.arrow}</button>
      </ActionBar>
    </>
  );
}

function CharacterView(props: {
  mainFruit: string; setMainFruit: (v: string) => void;
  mainGender: Gender; setMainGender: (v: Gender) => void;
  secondFruit: string; setSecondFruit: (v: string) => void;
  secondGender: Gender; setSecondGender: (v: Gender) => void;
  cost: number; canGenerate: boolean; startGeneration: () => void; onBack: () => void;
}) {
  return (
    <>
      <EditorPage>
        <Intro eyebrow="Step 2 · Characters" title="Cast your fruit" desc="Pick the two characters at the heart of the drama." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CharacterPicker n={1} title="Main character" fruit={props.mainFruit} gender={props.mainGender} onFruit={props.setMainFruit} onGender={props.setMainGender} genders={['girl', 'boy'] as const} />
          <CharacterPicker n={2} title="Second character" fruit={props.secondFruit} gender={props.secondGender} onFruit={props.setSecondFruit} onGender={props.setSecondGender} genders={['boy', 'girl'] as const} />
        </div>
      </EditorPage>
      <ActionBar left={<><Credits n={props.cost} /><span className="hidden sm:inline">· deducted when you generate</span></>}>
        <button onClick={props.onBack} className="ui-btn ui-btn-ghost">Back</button>
        <button onClick={props.startGeneration} disabled={!props.canGenerate} className="ui-btn ui-btn-primary">Generate Fruit Drama{Ico.arrow}</button>
      </ActionBar>
    </>
  );
}

function ScenePanel({ scene, finalSelected, totalDuration, regenCost }: { scene: SceneStatus | null; finalSelected: boolean; totalDuration: number; regenCost: number }) {
  return (
    <StudioPanel title={finalSelected ? 'Final cut' : 'Scene brief'} sub={finalSelected ? formatTime(totalDuration) : scene ? `S${String(scene.scene_index).padStart(2, '0')}` : undefined} bodyClass="overflow-y-auto">
      <div className="p-4 flex flex-col gap-4 h-full">
        {finalSelected ? (
          <p className="text-[12px] text-[var(--fg-3)] leading-relaxed">{formatTime(totalDuration)} total timeline. Pick a clip below to inspect or regenerate it.</p>
        ) : scene ? (
          <>
            <div className="rounded-[12px] border border-[var(--line)] bg-white/[0.02] p-3.5">
              <div className="ui-eyebrow !text-[9.5px] mb-1.5">Topic</div>
              <div className="text-[13px] font-medium leading-snug">{scene.title || `Scene ${scene.scene_index}`}</div>
              {scene.emotion && <span className="inline-flex mt-2.5 ui-chip ui-chip-muted capitalize">{scene.emotion}</span>}
            </div>
            {(scene.dialogue || []).slice(0, 3).map((line, i) => (
              <div key={`${line.speaker}-${i}`} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-white/[0.06] border border-[var(--line-2)] flex items-center justify-center ui-mono text-[10px] flex-shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium capitalize">{line.speaker}</div>
                  <div className="text-[12px] text-[var(--fg-3)] leading-relaxed">{line.line}</div>
                </div>
              </div>
            ))}
            <div className="mt-auto pt-3 border-t border-[var(--line)]"><Credits n={regenCost} suffix=" credits to regenerate" /></div>
          </>
        ) : (
          <p className="text-[12px] text-[var(--fg-4)]">Scenes appear here as production starts.</p>
        )}
      </div>
    </StudioPanel>
  );
}

function PreviewPanel(props: {
  aspect: Aspect;
  finalVideo: string | null;
  showFinal: boolean;
  selectedScene: SceneStatus | null;
  genStatus: GenStatus;
  progress: number;
  onFinal: () => void;
  onRegenerate: () => void;
}) {
  const title = props.showFinal ? 'Final cut' : props.selectedScene ? (props.selectedScene.title || `Scene ${props.selectedScene.scene_index}`) : 'Preview';
  return (
    <StudioPanel title={title} sub={props.aspect} bodyClass="flex flex-col">
      <div className="flex-1 min-h-0 p-3 flex items-center justify-center">
        <Stage aspect={props.aspect} processing={props.genStatus === 'processing'} progress={props.progress || 5}>
          {props.showFinal ? (
            <video key={props.finalVideo} src={props.finalVideo || undefined} controls className="w-full h-full object-contain bg-black" />
          ) : props.selectedScene?.video_url ? (
            <video key={props.selectedScene.video_url} src={props.selectedScene.video_url} controls className="w-full h-full object-cover bg-black" />
          ) : props.selectedScene?.image_url ? (
            <img src={props.selectedScene.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <StageEmpty label="Preparing preview" busy={props.genStatus !== 'failed'} />
          )}
        </Stage>
      </div>
      <div className="h-12 px-3 flex items-center gap-2 border-t border-[var(--line)] flex-shrink-0">
        {props.selectedScene && !props.showFinal && (
          <span className="flex items-center gap-2 text-[11px] text-[var(--fg-4)]"><StatusDot status={props.selectedScene.status} />{props.selectedScene.status}</span>
        )}
        <div className="ml-auto flex gap-2">
          {props.finalVideo && !props.showFinal && <button onClick={props.onFinal} className="ui-btn ui-btn-sm ui-btn-ghost">Final cut</button>}
          {props.selectedScene?.video_url && !props.showFinal && (
            <button onClick={props.onRegenerate} disabled={props.genStatus === 'processing'} className="ui-btn ui-btn-sm ui-btn-primary">{Ico.sparkle}Regenerate</button>
          )}
        </div>
      </div>
    </StudioPanel>
  );
}

function CharacterPicker({ n, title, fruit, gender, genders, onFruit, onGender }: {
  n: number; title: string; fruit: string; gender: Gender; genders: readonly Gender[];
  onFruit: (value: string) => void; onGender: (value: Gender) => void;
}) {
  return (
    <div className="ui-card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-medium">{title}</span>
        <span className="ui-mono text-[10.5px] text-[var(--fg-4)]">{String(n).padStart(2, '0')}</span>
      </div>
      <div className="relative mb-4">
        <div className="flex items-center justify-center h-[120px] rounded-[12px] bg-[#070707] border border-[var(--line)] overflow-hidden relative">
          <div className="absolute inset-0 ui-dots-bg opacity-40" />
          <span className="relative text-[44px] font-semibold tracking-[-0.06em] capitalize text-white/90">{fruit.slice(0, 1)}</span>
          <span className="absolute bottom-2.5 left-3 text-[11.5px] text-[var(--fg-3)] capitalize">{fruit} · {gender}</span>
        </div>
      </div>
      <Label>Fruit</Label>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FRUITS.map(f => (
          <button key={f} type="button" onClick={() => onFruit(f)}
            className={`h-7 px-2.5 rounded-full border text-[11.5px] capitalize transition-all ${fruit === f ? 'border-white bg-white text-black font-medium' : 'border-[var(--line-2)] text-[var(--fg-3)] hover:text-white hover:border-[var(--line-3)]'}`}>
            {f}
          </button>
        ))}
      </div>
      <Label>Character</Label>
      <Segmented full value={gender} onChange={onGender} options={genders.map(g => ({ value: g, label: <span className="capitalize">{g}</span> }))} />
    </div>
  );
}
