'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fruitDramaCost, fruitDramaSceneCost } from '@/lib/types';

type Step = 'setup' | 'studio';
type Aspect = '9:16' | '16:9';
type Resolution = '720p' | '1080p';
type Gender = 'girl' | 'boy';
type GenStatus = 'idle' | 'processing' | 'completed' | 'failed';

interface DialogueLine {
  speaker: string;
  line: string;
}

interface SceneStatus {
  scene_index: number;
  status: string;
  title?: string;
  emotion?: string;
  dialogue?: DialogueLine[];
  image_url: string | null;
  video_url: string | null;
  error?: string | null;
}

const FRUITS = ['peach', 'banana', 'strawberry', 'mango', 'apple', 'orange', 'pineapple', 'watermelon', 'cherry', 'grape'];

function seedScenes(count: number): SceneStatus[] {
  return Array.from({ length: count }, (_, i) => ({
    scene_index: i + 1,
    status: 'queued',
    title: `Scene ${i + 1}`,
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const cost = fruitDramaCost(sceneCount, resolution, durationSeconds);
  const regenCost = fruitDramaSceneCost(resolution, durationSeconds);
  const progress = genTotal ? Math.min(100, Math.round((genStep / genTotal) * 100)) : 0;
  const selectedScene = useMemo(
    () => selectedSceneIndex === 0 ? null : (scenes.find(s => s.scene_index === selectedSceneIndex) || scenes[0] || null),
    [scenes, selectedSceneIndex],
  );

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
      setSelectedSceneIndex(prev => {
        if (prev === 0 && data.final_video_url) return 0;
        if (incomingScenes.some(s => s.scene_index === prev)) return prev;
        const active = incomingScenes.find(s => isBusy(s.status)) || incomingScenes.find(s => s.video_url) || incomingScenes[0];
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
    setStep('studio');
    setGenStatus('processing');
    setGenErr('');
    setGenMsg('Starting fruit drama...');
    setGenStep(0);
    setGenTotal(0);
    setFinalVideo(null);
    setJobId(null);
    setScenes(seedScenes(sceneCount));
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

  const regenerateScene = async (sceneIndex: number) => {
    if (!jobId || genStatus === 'processing') return;
    setGenStatus('processing');
    setGenErr('');
    setGenMsg(`Regenerating scene ${sceneIndex}...`);
    setSelectedSceneIndex(sceneIndex);
    setScenes(prev => prev.map(s => s.scene_index === sceneIndex ? { ...s, status: 'regenerating', error: null } : s));

    try {
      const res = await fetch('/api/fruit-drama/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, scene_index: sceneIndex }),
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

  const canGenerate = title.trim().length > 5 && mainFruit && secondFruit;
  const stageAspect = aspect === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[620px]';
  const showFinal = selectedSceneIndex === 0 && !!finalVideo;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-black/95 backdrop-blur">
        <div className="max-w-[1180px] mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={step === 'setup' ? onBack : () => setStep('setup')} className="text-[13px] text-[rgba(255,255,255,0.38)] hover:text-white transition-colors">Back</button>
          <div className="h-4 w-px bg-[rgba(255,255,255,0.12)]" />
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.2px]">Fruit Drama Studio</div>
            <div className="text-[10px] text-[rgba(255,255,255,0.35)]">{resolution} / {aspect} / {durationSeconds}s clips</div>
          </div>
          <div className="ml-auto text-[11px] text-[rgba(255,255,255,0.38)]">Veo 3.1 Lite</div>
        </div>
      </div>

      {step === 'setup' ? (
        <div className="max-w-[1180px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="space-y-6">
            <div>
              <label className="text-[12px] font-medium text-[rgba(255,255,255,0.72)] block mb-2.5">Story idea</label>
              <textarea value={title} onChange={e => setTitle(e.target.value)} rows={4}
                placeholder="Peach girl confronts banana boss after discovering his secret..."
                className="w-full bg-[#0d0d0d] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3.5 text-[15px] outline-none resize-none focus:border-[rgba(255,255,255,0.28)] transition-colors placeholder:text-[rgba(255,255,255,0.22)] leading-relaxed" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CharacterPicker title="Main character" fruit={mainFruit} gender={mainGender} onFruit={setMainFruit} onGender={setMainGender} genders={['girl', 'boy'] as const} />
              <CharacterPicker title="Second character" fruit={secondFruit} gender={secondGender} onFruit={setSecondFruit} onGender={setSecondGender} genders={['boy', 'girl'] as const} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <OptionGroup label="Scenes" values={[3, 5, 8, 10] as const} value={sceneCount} onPick={setSceneCount} suffix="" />
              <OptionGroup label="Aspect" values={['9:16', '16:9'] as const} value={aspect} onPick={setAspect} suffix="" />
              <OptionGroup label="Quality" values={['720p', '1080p'] as const} value={resolution} onPick={(r: Resolution) => { setResolution(r); if (r === '1080p') setDurationSeconds(8); }} suffix="" />
              <OptionGroup label="Clip length" values={[4, 6, 8] as const} value={durationSeconds} onPick={setDurationSeconds} suffix="s" disabledValue={resolution === '1080p' ? ([4, 6] as const) : []} />
            </div>
          </div>

          <div className="border border-[rgba(255,255,255,0.1)] rounded-lg bg-[#0b0b0b] p-5 h-fit">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[12px] text-[rgba(255,255,255,0.42)]">Estimated cost</div>
                <div className="text-[28px] font-semibold tracking-[-0.8px]">{cost.toLocaleString()}</div>
              </div>
              <div className="text-right text-[11px] text-[rgba(255,255,255,0.38)]">
                <div>{sceneCount} scenes</div>
                <div>{regenCost.toLocaleString()} credits per redo</div>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              {seedScenes(sceneCount).map(scene => (
                <div key={scene.scene_index} className="flex items-center gap-2 text-[12px] text-[rgba(255,255,255,0.55)]">
                  <span className="w-7 h-7 rounded bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[10px]">{scene.scene_index}</span>
                  <span>Scene {scene.scene_index}</span>
                </div>
              ))}
            </div>
            <button onClick={startGeneration} disabled={!canGenerate}
              className="w-full py-3 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-[#e7e7e7] disabled:opacity-20 disabled:cursor-not-allowed transition-all">
              Generate Fruit Drama
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-[1180px] mx-auto px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5">
            <div className="min-h-[420px] border border-[rgba(255,255,255,0.1)] rounded-lg bg-[#050505] p-4 flex items-center justify-center">
              <div className={`relative w-full ${stageAspect} rounded-lg bg-[#101010] overflow-hidden border border-[rgba(255,255,255,0.08)] flex items-center justify-center`}>
                {showFinal ? (
                  <video key={finalVideo} src={finalVideo || undefined} controls className="w-full h-full object-contain bg-black" />
                ) : selectedScene?.video_url ? (
                  <video key={selectedScene.video_url} src={selectedScene.video_url} controls className="w-full h-full object-cover bg-black" />
                ) : selectedScene?.image_url ? (
                  <img src={selectedScene.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-6">
                    <div className="w-10 h-10 mx-auto rounded-full border-2 border-[rgba(255,255,255,0.12)] border-t-white animate-spin mb-4" />
                    <div className="text-[13px] text-[rgba(255,255,255,0.55)]">{genMsg || 'Preparing scenes...'}</div>
                  </div>
                )}
                {genStatus === 'processing' && (
                  <div className="absolute left-3 top-3 px-2.5 py-1 rounded-full bg-black/70 border border-[rgba(255,255,255,0.14)] text-[10px] text-white">
                    {progress || 1}% rendering
                  </div>
                )}
              </div>
            </div>

            <div className="border border-[rgba(255,255,255,0.1)] rounded-lg bg-[#0b0b0b] p-5 flex flex-col min-h-[420px]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[11px] uppercase text-[rgba(255,255,255,0.35)] tracking-[0.12em]">Selected</div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.3px] mt-1">{selectedScene?.title || 'Final cut'}</h2>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${genStatus === 'failed' ? 'border-red-400/30 text-red-200 bg-red-500/10' : 'border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.65)] bg-[rgba(255,255,255,0.04)]'}`}>
                  {genStatus === 'failed' ? 'Failed' : selectedScene ? sceneLabel(selectedScene.status) : 'Final'}
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden mb-4">
                <div className="h-full bg-white transition-all" style={{ width: `${progress || (genStatus === 'completed' ? 100 : 4)}%` }} />
              </div>

              <p className={`text-[12px] leading-relaxed mb-4 ${genStatus === 'failed' ? 'text-red-200' : 'text-[rgba(255,255,255,0.48)]'}`}>
                {genErr || genMsg || 'Ready'}
              </p>

              <div className="space-y-3 flex-1">
                {(selectedScene?.dialogue || []).slice(0, 3).map((line, i) => (
                  <div key={`${line.speaker}-${i}`} className="border-l-2 border-[rgba(255,255,255,0.16)] pl-3">
                    <div className="text-[10px] text-[rgba(255,255,255,0.35)]">{line.speaker}</div>
                    <div className="text-[13px] text-[rgba(255,255,255,0.78)] leading-relaxed">{line.line}</div>
                  </div>
                ))}
              </div>

              <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.08)] flex gap-2">
                {selectedScene?.video_url && jobId && (
                  <button onClick={() => regenerateScene(selectedScene.scene_index)} disabled={genStatus === 'processing'}
                    className="flex-1 py-2.5 bg-white text-black rounded-lg text-[12px] font-medium disabled:opacity-30 disabled:cursor-not-allowed">
                    Regenerate scene
                  </button>
                )}
                {finalVideo && (
                  <a href={finalVideo} download className="flex-1 py-2.5 border border-[rgba(255,255,255,0.14)] rounded-lg text-center text-[12px] text-[rgba(255,255,255,0.78)]">
                    Download final
                  </a>
                )}
                {finalVideo && (
                  <button onClick={() => setSelectedSceneIndex(0)} className="px-3 py-2.5 border border-[rgba(255,255,255,0.14)] rounded-lg text-[12px] text-[rgba(255,255,255,0.78)]">
                    View final
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="relative rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#060606] p-5 overflow-hidden">
            <div className="absolute left-0 right-0 top-2 h-2 opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 18px)' }} />
            <div className="absolute left-0 right-0 bottom-2 h-2 opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 18px)' }} />
            <div className="flex items-center justify-between mb-4 pt-2">
              <div className="text-[12px] font-medium text-[rgba(255,255,255,0.72)]">Scene filmstrip</div>
              <div className="text-[11px] text-[rgba(255,255,255,0.38)]">{regenCost.toLocaleString()} credits per regenerated scene</div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {scenes.map(scene => (
                <button key={scene.scene_index} onClick={() => setSelectedSceneIndex(scene.scene_index)}
                  className={`group shrink-0 w-[116px] text-left rounded-lg border p-2 transition-all ${selectedSceneIndex === scene.scene_index ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.1)] bg-black hover:border-[rgba(255,255,255,0.22)]'}`}>
                  <div className="aspect-[9/16] rounded-md bg-[#151515] overflow-hidden mb-2 flex items-center justify-center">
                    {scene.image_url ? <img src={scene.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[18px] text-[rgba(255,255,255,0.16)]">{scene.scene_index}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[rgba(255,255,255,0.45)]">Scene {scene.scene_index}</span>
                    <span className={`text-[9px] ${scene.status === 'failed' ? 'text-red-300' : scene.status === 'completed' ? 'text-emerald-300' : 'text-[rgba(255,255,255,0.45)]'}`}>{sceneLabel(scene.status)}</span>
                  </div>
                  <div className="text-[11px] text-white truncate mt-1">{scene.title || `Scene ${scene.scene_index}`}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterPicker({
  title,
  fruit,
  gender,
  genders,
  onFruit,
  onGender,
}: {
  title: string;
  fruit: string;
  gender: Gender;
  genders: readonly Gender[];
  onFruit: (value: string) => void;
  onGender: (value: Gender) => void;
}) {
  return (
    <div className="border border-[rgba(255,255,255,0.1)] rounded-lg p-4 bg-[#0b0b0b]">
      <div className="text-[12px] font-medium text-[rgba(255,255,255,0.72)] mb-3">{title}</div>
      <select value={fruit} onChange={e => onFruit(e.target.value)}
        className="w-full bg-black border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-[13px] outline-none mb-2">
        {FRUITS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <div className="flex gap-1.5">
        {genders.map(g => (
          <button key={g} onClick={() => onGender(g)}
            className={`flex-1 py-2 rounded-lg border text-[12px] ${gender === g ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)]'}`}>
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionGroup<T extends string | number>({
  label,
  values,
  value,
  suffix,
  disabledValue = [],
  onPick,
}: {
  label: string;
  values: readonly T[];
  value: T;
  suffix: string;
  disabledValue?: readonly T[];
  onPick: (value: T) => void;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-[rgba(255,255,255,0.72)] block mb-2.5">{label}</label>
      <div className="flex gap-1.5">
        {values.map(item => (
          <button key={String(item)} onClick={() => onPick(item)} disabled={disabledValue.includes(item)}
            className={`flex-1 py-2 rounded-lg border text-[12px] disabled:opacity-20 disabled:cursor-not-allowed ${value === item ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)]'}`}>
            {item}{suffix}
          </button>
        ))}
      </div>
    </div>
  );
}
