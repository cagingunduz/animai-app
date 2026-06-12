'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fruitDramaCost } from '@/lib/types';

type Step = 'setup' | 'generating' | 'done';
type Aspect = '9:16' | '16:9';
type Resolution = '720p' | '1080p';
type Gender = 'girl' | 'boy';

interface SceneStatus {
  scene_index: number;
  status: string;
  image_url: string | null;
  video_url: string | null;
}

const FRUITS = ['peach', 'banana', 'strawberry', 'mango', 'apple', 'orange', 'pineapple', 'watermelon', 'cherry', 'grape'];

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

  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genErr, setGenErr] = useState('');
  const [scenes, setScenes] = useState<SceneStatus[]>([]);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const cost = fruitDramaCost(sceneCount, resolution, durationSeconds);

  const pollStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/status/${jobId}`);
      const data = await res.json();
      setGenMsg(data.message || '');
      setGenStep(data.step || 0);
      setGenTotal(data.total_steps || 0);
      setScenes(data.scenes || []);
      if (data.status === 'completed') {
        setGenStatus('completed');
        setFinalVideo(data.final_video_url);
        setStep('done');
        if (pollRef.current) clearInterval(pollRef.current);
        try {
          await createClient().from('animations').update({ status: 'completed', final_video_url: data.final_video_url }).eq('job_id', jobId);
        } catch { /* noop */ }
      } else if (data.status === 'failed') {
        setGenStatus('failed');
        setGenErr(data.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'failed' }).eq('job_id', jobId); } catch { /* noop */ }
      } else {
        setGenStatus('processing');
      }
    } catch {
      /* keep polling */
    }
  };

  const startGeneration = async () => {
    setStep('generating');
    setGenStatus('processing');
    setGenErr('');
    setFinalVideo(null);
    setScenes([]);
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
      if (res.status === 402) {
        setGenStatus('failed');
        setGenErr(data.error || 'Yetersiz kredi.');
        return;
      }
      if (!data.job_id) {
        setGenStatus('failed');
        setGenErr(data.error || 'Failed to start');
        return;
      }
      pollRef.current = setInterval(() => pollStatus(data.job_id), 3000);
      pollStatus(data.job_id);
    } catch {
      setGenStatus('failed');
      setGenErr('Failed to start generation');
    }
  };

  const canGenerate = title.trim().length > 5 && mainFruit && secondFruit;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.08)] sticky top-0 z-30 bg-black">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center">
          <button onClick={onBack} className="text-[13px] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors mr-3">Back</button>
          <span className="text-[15px] font-semibold tracking-[-0.3px]">Fruit Drama</span>
          <span className="ml-auto text-[11px] text-[rgba(255,255,255,0.35)]">Veo 3.1 Lite</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-6 py-8">
          {step === 'setup' && (
            <div className="flex flex-col gap-7">
              <div>
                <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Story idea</label>
                <textarea value={title} onChange={e => setTitle(e.target.value)} rows={3}
                  placeholder="Peach girl confronts banana boss after discovering his secret..."
                  className="w-full bg-[#0e0e0e] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3.5 text-[14px] outline-none resize-none focus:border-[rgba(255,255,255,0.2)] transition-colors placeholder:text-[rgba(255,255,255,0.22)] leading-relaxed" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-[rgba(255,255,255,0.08)] rounded-xl p-4 bg-[#0d0d0d]">
                  <div className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] mb-3">Main character</div>
                  <select value={mainFruit} onChange={e => setMainFruit(e.target.value)}
                    className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-[13px] outline-none mb-2">
                    {FRUITS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <div className="flex gap-1.5">
                    {(['girl', 'boy'] as const).map(g => (
                      <button key={g} onClick={() => setMainGender(g)}
                        className={`flex-1 py-2 rounded-lg border text-[12px] ${mainGender === g ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)]'}`}>{g}</button>
                    ))}
                  </div>
                </div>

                <div className="border border-[rgba(255,255,255,0.08)] rounded-xl p-4 bg-[#0d0d0d]">
                  <div className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] mb-3">Second character</div>
                  <select value={secondFruit} onChange={e => setSecondFruit(e.target.value)}
                    className="w-full bg-black border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-[13px] outline-none mb-2">
                    {FRUITS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <div className="flex gap-1.5">
                    {(['boy', 'girl'] as const).map(g => (
                      <button key={g} onClick={() => setSecondGender(g)}
                        className={`flex-1 py-2 rounded-lg border text-[12px] ${secondGender === g ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)]'}`}>{g}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Scenes</label>
                  <div className="flex gap-1.5">
                    {[3, 5, 8, 10].map(n => (
                      <button key={n} onClick={() => setSceneCount(n)}
                        className={`flex-1 py-2 rounded-lg border text-[12px] ${sceneCount === n ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)]'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Aspect</label>
                  <div className="flex gap-1.5">
                    {(['9:16', '16:9'] as const).map(a => (
                      <button key={a} onClick={() => setAspect(a)}
                        className={`flex-1 py-2 rounded-lg border text-[12px] ${aspect === a ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)]'}`}>{a}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Quality</label>
                  <div className="flex gap-1.5">
                    {(['720p', '1080p'] as const).map(r => (
                      <button key={r} onClick={() => { setResolution(r); if (r === '1080p') setDurationSeconds(8); }}
                        className={`flex-1 py-2 rounded-lg border text-[12px] ${resolution === r ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)]'}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Clip length</label>
                  <div className="flex gap-1.5">
                    {([4, 6, 8] as const).map(d => (
                      <button key={d} onClick={() => setDurationSeconds(d)} disabled={resolution === '1080p' && d !== 8}
                        className={`flex-1 py-2 rounded-lg border text-[12px] disabled:opacity-20 ${durationSeconds === d ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)]'}`}>{d}s</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] pt-5">
                <div className="text-[12px] text-[rgba(255,255,255,0.45)]">
                  Estimated cost: <span className="text-white font-medium">{cost.toLocaleString()}</span> credits
                </div>
                <button onClick={startGeneration} disabled={!canGenerate}
                  className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                  Generate Fruit Drama
                </button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="max-w-[680px] mx-auto py-16 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full border-2 border-[rgba(255,255,255,0.12)] border-t-white animate-spin mb-5" />
              <h1 className="text-[18px] font-semibold mb-2">{genStatus === 'failed' ? 'Generation Failed' : 'Generating Fruit Drama'}</h1>
              <p className="text-[13px] text-[rgba(255,255,255,0.45)] mb-5">{genErr || genMsg || 'Starting...'}</p>
              <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden mb-5">
                <div className="h-full bg-white transition-all" style={{ width: `${genTotal ? Math.min(100, (genStep / genTotal) * 100) : 8}%` }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                {scenes.map(s => (
                  <div key={s.scene_index} className="aspect-[9/16] rounded-lg bg-[#111] border border-[rgba(255,255,255,0.08)] overflow-hidden flex items-center justify-center">
                    {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] text-[rgba(255,255,255,0.3)]">Scene {s.scene_index}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="max-w-[520px] mx-auto py-10">
              <h1 className="text-[18px] font-semibold mb-4">Fruit Drama Complete</h1>
              {finalVideo && <video src={finalVideo} controls className="w-full rounded-xl bg-black border border-[rgba(255,255,255,0.08)]" />}
              <div className="flex gap-2 mt-4">
                {finalVideo && <a href={finalVideo} download className="flex-1 py-2.5 bg-white text-black rounded-lg text-center text-[13px] font-medium">Download</a>}
                <button onClick={() => setStep('setup')} className="px-4 py-2.5 border border-[rgba(255,255,255,0.12)] rounded-lg text-[13px] text-[rgba(255,255,255,0.7)]">Create another</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
