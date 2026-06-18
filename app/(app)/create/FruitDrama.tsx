'use client';

import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fruitDramaCost, fruitDramaSceneCost } from '@/lib/types';

type Step = 'setup' | 'editor';
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

function sceneLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: 'Queued',
    processing: 'Working',
    rendering_image: 'Image',
    animating: 'Animate',
    regenerating: 'Redo',
    completed: 'Done',
    failed: 'Failed',
  };
  return labels[status] || status;
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

  return (
    <div className="min-h-screen bg-black text-white">
      {step === 'setup' ? (
        <div className="flex flex-col h-screen bg-black text-white">
          <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.1)] sticky top-0 z-30 bg-black">
            <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center">
              <button onClick={onBack} className="text-[13px] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors mr-3">←</button>
              <span className="text-[15px] font-semibold tracking-[-0.3px]">Fruit Drama</span>
              <div className="flex-1 flex justify-center items-center">
                {[0, 1].map(i => (
                  <div key={i} className="flex items-center">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${i === 0 ? 'bg-white text-black' : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.35)] border border-[rgba(255,255,255,0.1)]'}`}>{i + 1}</span>
                    {i < 1 && <span className="h-[2px] w-16 mx-1 rounded-full bg-[rgba(255,255,255,0.1)]" />}
                  </div>
                ))}
              </div>
              <span className="w-6" />
            </div>
          </div>
          <SetupView
            title={title}
            setTitle={setTitle}
            mainFruit={mainFruit}
            setMainFruit={setMainFruit}
            mainGender={mainGender}
            setMainGender={setMainGender}
            secondFruit={secondFruit}
            setSecondFruit={setSecondFruit}
            secondGender={secondGender}
            setSecondGender={setSecondGender}
            sceneCount={sceneCount}
            setSceneCount={setSceneCount}
            aspect={aspect}
            setAspect={setAspect}
            resolution={resolution}
            setResolution={setResolution}
            durationSeconds={durationSeconds}
            setDurationSeconds={setDurationSeconds}
            cost={cost}
            canGenerate={!!canGenerate}
            startGeneration={startGeneration}
          />
        </div>
      ) : (
        <div className="h-screen flex flex-col overflow-hidden">
          <div className="shrink-0 border-b border-[rgba(255,255,255,0.08)] bg-[#050505]">
            <div className="px-5 py-3 flex items-center gap-3">
              <button onClick={() => setStep('setup')} className="text-[13px] text-[rgba(255,255,255,0.42)] hover:text-white">Back</button>
              <div className="h-4 w-px bg-[rgba(255,255,255,0.12)]" />
              <div>
                <div className="text-[14px] font-semibold">Fruit Drama Studio</div>
                <div className="text-[10px] text-[rgba(255,255,255,0.35)]">{resolution} / {aspect} / {durationSeconds}s source clips</div>
              </div>
              <div className="ml-auto text-[11px] text-[rgba(255,255,255,0.36)]">{genErr || genMsg || 'Ready'}</div>
            </div>
          </div>
          <>
            <div className="shrink-0 grid grid-cols-1 lg:grid-cols-[268px_minmax(480px,1fr)_268px] gap-4 p-5 pb-3 min-h-0">
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
              <AiPanel
                messages={chatMessages}
                value={chatInput}
                onChange={setChatInput}
                onSubmit={submitAiEdit}
                disabled={!jobId || genStatus === 'processing'}
              />
            </div>
            <Timeline
              scenes={scenes}
              selectedSceneIndex={selectedSceneIndex}
              clipDurations={clipDurations}
              totalDuration={totalDuration}
              onSelect={setSelectedSceneIndex}
              onResizeStart={(sceneIndex, event) => {
                event.preventDefault();
                resizeRef.current = {
                  sceneIndex,
                  startX: event.clientX,
                  startDuration: clipDurations[sceneIndex] || durationSeconds,
                };
              }}
            />
          </>
        </div>
      )}
    </div>
  );
}

function SetupView(props: {
  title: string; setTitle: (v: string) => void;
  mainFruit: string; setMainFruit: (v: string) => void;
  mainGender: Gender; setMainGender: (v: Gender) => void;
  secondFruit: string; setSecondFruit: (v: string) => void;
  secondGender: Gender; setSecondGender: (v: Gender) => void;
  sceneCount: number; setSceneCount: (v: number) => void;
  aspect: Aspect; setAspect: (v: Aspect) => void;
  resolution: Resolution; setResolution: (v: Resolution) => void;
  durationSeconds: 4 | 6 | 8; setDurationSeconds: (v: 4 | 6 | 8) => void;
  cost: number; canGenerate: boolean; startGeneration: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-6 py-8 flex flex-col gap-7 animate-[fadeIn_0.3s_ease]">
        <div>
          <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Story idea</label>
          <textarea value={props.title} onChange={e => props.setTitle(e.target.value)} rows={3}
            placeholder="Peach girl confronts banana boss after discovering his secret…"
            className="w-full bg-[#0e0e0e] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3.5 text-[14px] outline-none resize-none focus:border-[rgba(255,255,255,0.2)] transition-colors placeholder:text-[rgba(255,255,255,0.22)] leading-relaxed" />
        </div>

        <div>
          <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Characters</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CharacterPicker title="Main character" fruit={props.mainFruit} gender={props.mainGender} onFruit={props.setMainFruit} onGender={props.setMainGender} genders={['girl', 'boy'] as const} />
            <CharacterPicker title="Second character" fruit={props.secondFruit} gender={props.secondGender} onFruit={props.setSecondFruit} onGender={props.setSecondGender} genders={['boy', 'girl'] as const} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 flex-wrap">
          <OptionGroup label="Scenes" values={[3, 5, 8, 10] as const} value={props.sceneCount} onPick={props.setSceneCount} suffix="" />
          <OptionGroup label="Format" values={['9:16', '16:9'] as const} value={props.aspect} onPick={props.setAspect} suffix="" icon={aspectIcon} />
          <OptionGroup label="Quality" values={['720p', '1080p'] as const} value={props.resolution} onPick={(r: Resolution) => { props.setResolution(r); if (r === '1080p') props.setDurationSeconds(8); }} suffix="" />
          <OptionGroup label="Clip length" values={[4, 6, 8] as const} value={props.durationSeconds} onPick={props.setDurationSeconds} suffix="s" disabledValue={props.resolution === '1080p' ? ([4, 6] as const) : []} icon={clockIcon} />
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-[rgba(255,255,255,0.06)] pt-5">
          <span className="text-[11px] text-[rgba(255,255,255,0.4)]"><span className="text-white font-medium">{props.cost.toLocaleString()}</span> credits · deducted now</span>
          <button onClick={props.startGeneration} disabled={!props.canGenerate}
            className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
            Generate Fruit Drama
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 7h12M8 2l5 5-5 5" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ScenePanel({ scene, finalSelected, totalDuration, regenCost }: { scene: SceneStatus | null; finalSelected: boolean; totalDuration: number; regenCost: number }) {
  return (
    <aside className="h-[456px] rounded-lg bg-[#080808] border border-[rgba(255,255,255,0.06)] p-5 overflow-hidden">
      <div className="text-[16px] font-semibold mb-1">{finalSelected ? 'Final Cut' : 'Scene Brief'}</div>
      <p className="text-[11px] leading-relaxed text-[rgba(255,255,255,0.44)] mb-5">
        {finalSelected ? `${formatTime(totalDuration)} total timeline` : 'Topic, emotion and dialogue for the selected scene.'}
      </p>
      {!finalSelected && scene && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-black p-3">
            <div className="text-[10px] text-[rgba(255,255,255,0.34)] mb-1">Topic</div>
            <div className="text-[13px] font-medium leading-snug">{scene.title || `Scene ${scene.scene_index}`}</div>
            {scene.emotion && <div className="text-[11px] text-[rgba(255,255,255,0.42)] mt-2">{scene.emotion}</div>}
          </div>
          <div className="space-y-3">
            {(scene.dialogue || []).slice(0, 3).map((line, i) => (
              <div key={`${line.speaker}-${i}`} className="flex gap-3 pb-3 border-b border-[rgba(255,255,255,0.06)]">
                <div className="w-10 h-10 rounded-lg bg-[#151515] border border-[rgba(255,255,255,0.14)] flex items-center justify-center text-[11px] text-white">{i + 1}</div>
                <div>
                  <div className="text-[12px] font-medium">{line.speaker}</div>
                  <div className="text-[12px] text-[rgba(255,255,255,0.54)] leading-relaxed">{line.line}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 text-[11px] text-[rgba(255,255,255,0.38)]">{regenCost.toLocaleString()} credits to regenerate selected scene</div>
        </div>
      )}
    </aside>
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
  const stageAspect = props.aspect === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[456px]';
  return (
    <main className="h-[456px] rounded-lg bg-[#080808] border border-[rgba(255,255,255,0.06)] overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 p-2 flex items-center justify-center">
        <div className={`relative w-full ${stageAspect} rounded-md overflow-hidden bg-[#111] flex items-center justify-center`}>
          {props.showFinal ? (
            <video key={props.finalVideo} src={props.finalVideo || undefined} controls className="w-full h-full object-contain bg-black" />
          ) : props.selectedScene?.video_url ? (
            <video key={props.selectedScene.video_url} src={props.selectedScene.video_url} controls className="w-full h-full object-cover bg-black" />
          ) : props.selectedScene?.image_url ? (
            <img src={props.selectedScene.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full border-2 border-[rgba(255,255,255,0.12)] border-t-white animate-spin mb-4" />
              <div className="text-[12px] text-[rgba(255,255,255,0.42)]">Preparing preview</div>
            </div>
          )}
          {props.genStatus === 'processing' && (
            <div className="absolute left-3 bottom-3 h-1.5 w-[72%] rounded-full bg-black/70 overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${props.progress || 5}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className="h-[58px] px-4 flex items-center gap-3 border-t border-[rgba(255,255,255,0.06)]">
        <button className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.08)] text-[11px]">◀</button>
        <button className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.12)] text-[11px]">▶</button>
        <button className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.08)] text-[11px]">■</button>
        <div className="ml-auto flex gap-2">
          {props.finalVideo && <button onClick={props.onFinal} className="px-3 py-2 rounded-md bg-[rgba(255,255,255,0.08)] text-[11px]">Final</button>}
          {props.selectedScene?.video_url && <button onClick={props.onRegenerate} disabled={props.genStatus === 'processing'} className="px-3 py-2 rounded-md bg-white text-black text-[11px] disabled:opacity-30">Regenerate</button>}
        </div>
      </div>
    </main>
  );
}

function AiPanel(props: {
  messages: ChatMessage[];
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <aside className="h-[456px] rounded-lg bg-[#080808] border border-[rgba(255,255,255,0.06)] p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[16px] font-semibold">AI Editor</div>
        <div className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.18)] flex items-center justify-center text-[13px]">⌕</div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {props.messages.map((message, i) => (
          <div key={i} className={`${message.role === 'user' ? 'ml-5 bg-[#1a1a1a] border-[rgba(255,255,255,0.2)]' : 'mr-5 bg-black border-[rgba(255,255,255,0.08)]'} border rounded-lg px-3 py-2`}>
            <div className="text-[10px] text-[rgba(255,255,255,0.35)] mb-1">{message.role === 'user' ? 'You' : 'Mave'}</div>
            <div className="text-[12px] leading-relaxed text-[rgba(255,255,255,0.78)]">{message.text}</div>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex gap-2">
          <input value={props.value} onChange={e => props.onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') props.onSubmit(); }}
            placeholder="Change scene 2, make it sadder..."
            className="flex-1 bg-black border border-[rgba(255,255,255,0.12)] rounded-full px-3 py-2 text-[12px] outline-none focus:border-white" />
          <button onClick={props.onSubmit} disabled={props.disabled || !props.value.trim()} className="px-4 rounded-full bg-white text-black text-[12px] font-medium disabled:opacity-25">Send</button>
        </div>
      </div>
    </aside>
  );
}

function Timeline(props: {
  scenes: SceneStatus[];
  selectedSceneIndex: number;
  clipDurations: Record<number, number>;
  totalDuration: number;
  onSelect: (sceneIndex: number) => void;
  onResizeStart: (sceneIndex: number, event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  const ticks = Array.from({ length: Math.max(8, Math.ceil(props.totalDuration / 5) + 2) }, (_, i) => i * 5);
  const timelineWidth = Math.max(980, props.totalDuration * PX_PER_SECOND + 80);
  return (
    <section className="flex-1 min-h-0 mx-5 mb-5 rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <div className="h-full grid grid-cols-[108px_minmax(0,1fr)]">
        <div className="border-r border-[rgba(255,255,255,0.08)] bg-[#090909]">
          <div className="h-44 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-center gap-4 text-[rgba(255,255,255,0.55)]">
            <span className="text-[18px]">▣</span><span className="text-[18px]">⚙</span>
          </div>
          <TrackLabel label="Video" icon="▰" active />
          <TrackLabel label="Audio" icon="♪" />
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="relative h-full" style={{ width: timelineWidth }}>
            <div className="h-11 border-b border-[rgba(255,255,255,0.08)] relative">
              {ticks.map(tick => (
                <div key={tick} className="absolute top-0 h-full" style={{ left: tick * PX_PER_SECOND }}>
                  <div className="text-[10px] text-[rgba(255,255,255,0.48)] mt-2">{formatTime(tick)}</div>
                  <div className="absolute bottom-0 left-0 h-3 w-px bg-[rgba(255,255,255,0.3)]" />
                </div>
              ))}
            </div>
            <div className="h-[58px] border-b border-[rgba(255,255,255,0.08)] relative">
              <div className="absolute left-0 top-3 flex">
                {props.scenes.map(scene => {
                  const duration = props.clipDurations[scene.scene_index] || scene.duration_seconds || 8;
                  const width = duration * PX_PER_SECOND;
                  return (
                    <div key={scene.scene_index} onClick={() => props.onSelect(scene.scene_index)}
                      className={`relative h-8 rounded-md border flex items-center gap-2 px-2 mr-1 cursor-pointer ${props.selectedSceneIndex === scene.scene_index ? 'bg-white text-black border-white' : 'bg-[#252525] border-[rgba(255,255,255,0.18)] text-white'}`}
                      style={{ width }}>
                      {scene.image_url && <img src={scene.image_url} alt="" className="w-6 h-6 rounded object-cover" />}
                      <span className="text-[10px] truncate">S{scene.scene_index} · {duration}s</span>
                      <span className={`ml-auto text-[9px] ${props.selectedSceneIndex === scene.scene_index ? 'text-black/60' : 'text-white/65'}`}>{sceneLabel(scene.status)}</span>
                      <div onMouseDown={event => props.onResizeStart(scene.scene_index, event)}
                        className="absolute right-0 top-0 h-full w-3 cursor-ew-resize rounded-r-md bg-white/10 hover:bg-white/30" />
                    </div>
                  );
                })}
              </div>
              <div className="absolute left-10 top-0 bottom-0 w-px bg-white">
                <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-white" />
                <div className="absolute -bottom-1 -left-1.5 w-3 h-3 rounded-full bg-white" />
              </div>
            </div>
            <div className="h-[58px] border-b border-[rgba(255,255,255,0.08)] relative">
              <div className="absolute left-0 right-10 top-4 h-7 rounded bg-[#161616] overflow-hidden">
                <div className="h-full opacity-90" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ffffff 0 3px, #ffffff 3px 5px, #8a8a8a 5px 8px, transparent 8px 12px)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackLabel({ label, icon, active }: { label: string; icon: string; active?: boolean }) {
  return (
    <div className={`h-[58px] border-b border-[rgba(255,255,255,0.08)] flex items-center gap-3 px-7 text-[12px] ${active ? 'border-l-4 border-l-white' : ''}`}>
      <span className="text-[rgba(255,255,255,0.72)]">{icon}</span>
      <span className="text-[rgba(255,255,255,0.45)]">{label}</span>
    </div>
  );
}

function CharacterPicker({ title, fruit, gender, genders, onFruit, onGender }: {
  title: string; fruit: string; gender: Gender; genders: readonly Gender[];
  onFruit: (value: string) => void; onGender: (value: Gender) => void;
}) {
  return (
    <div className="border border-[rgba(255,255,255,0.08)] rounded-xl p-4 bg-[#0e0e0e]">
      <div className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] mb-3">{title}</div>
      <div className="relative mb-2">
        <select value={fruit} onChange={e => onFruit(e.target.value)}
          className="appearance-none w-full bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg pl-3 pr-9 py-2 text-[13px] text-white outline-none focus:border-[rgba(255,255,255,0.2)] transition-colors cursor-pointer capitalize">
          {FRUITS.map(f => <option key={f} value={f} className="bg-[#111] capitalize">{f}</option>)}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </div>
      <div className="flex gap-1.5">
        {genders.map(g => (
          <button key={g} onClick={() => onGender(g)}
            className={`flex-1 py-2 rounded-lg border text-[12px] transition-all ${gender === g ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)]'}`}>
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionGroup({ label, values, value, suffix, disabledValue = [], onPick, icon }: {
  label: string; values: readonly (string | number)[]; value: string | number; suffix: string; disabledValue?: readonly (string | number)[]; onPick: (value: any) => void; icon?: (v: string | number) => React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">{label}</label>
      <div className="flex gap-1.5">
        {values.map(item => (
          <button key={String(item)} onClick={() => onPick(item)} disabled={disabledValue.includes(item)}
            className={`px-3 py-2 rounded-lg border text-[12px] transition-all flex items-center gap-1.5 disabled:opacity-20 disabled:cursor-not-allowed ${value === item ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)]'}`}>
            {icon?.(item)}{item}{suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

const aspectIcon = (a: string | number) => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    {a === '9:16' ? <rect x="6.5" y="2.5" width="7" height="15" rx="1.5" /> : a === '16:9' ? <rect x="2.5" y="6.5" width="15" height="7" rx="1.5" /> : <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" />}
  </svg>
);
const clockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 1.8" strokeLinecap="round" /></svg>
);
