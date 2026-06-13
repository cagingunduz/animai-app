'use client';

import { type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';

type StudioStatus = 'idle' | 'processing' | 'completed' | 'failed';
type StudioAspect = '16:9' | '9:16' | '1:1';

interface StudioScene {
  scene_index?: number;
  scene_number?: number;
  status: string;
  image_url?: string | null;
  video_url?: string | null;
  title?: string;
  narrator_text?: string;
  dialogue?: { speaker: string; line: string }[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const PX_PER_SECOND = 74;
const DURATIONS = [4, 6, 8] as const;

function sceneNo(scene: StudioScene, fallback: number): number {
  return scene.scene_index || scene.scene_number || fallback;
}

function snapDuration(value: number): 4 | 6 | 8 {
  return DURATIONS.reduce((best, current) => Math.abs(current - value) < Math.abs(best - value) ? current : best, 4);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `00:${mins}:${secs}`;
}

function label(status: string): string {
  const map: Record<string, string> = {
    queued: 'Queued',
    processing: 'Working',
    rendering_image: 'Image',
    animating: 'Animate',
    regenerating: 'Redo',
    completed: 'Done',
    failed: 'Failed',
  };
  return map[status] || status || 'Queued';
}

function statusTone(status: string): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (status === 'failed') return 'bg-red-50 text-red-700 ring-red-100';
  if (['processing', 'rendering_image', 'animating', 'regenerating'].includes(status)) return 'bg-pink-50 text-pink-700 ring-pink-100';
  return 'bg-zinc-100 text-zinc-500 ring-zinc-200';
}

function TrackLabel({ label, icon, active }: { label: string; icon: string; active?: boolean }) {
  return (
    <div className={`h-[58px] border-b border-zinc-200 flex items-center gap-3 px-5 text-[12px] ${active ? 'border-l-4 border-l-[#ff2f7d] bg-white' : 'bg-[#fafafa]'}`}>
      <span className="w-6 h-6 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">{icon}</span>
      <span className="font-medium text-zinc-600">{label}</span>
    </div>
  );
}

export default function StudioGenerationView({
  title,
  modeLabel,
  aspect,
  status,
  message,
  error,
  scenes,
  finalVideo,
  step,
  totalSteps,
  onBack,
  onRetry,
  onCreateAnother,
  downloadHref,
}: {
  title: string;
  modeLabel: string;
  aspect: StudioAspect;
  status: StudioStatus;
  message: string;
  error?: string;
  scenes: StudioScene[];
  finalVideo: string | null;
  step: number;
  totalSteps: number;
  onBack: () => void;
  onRetry?: () => void;
  onCreateAnother?: () => void;
  downloadHref?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [durations, setDurations] = useState<Record<number, number>>({});
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'I am Mave. Tell me what to change in the video, a specific scene, dialogue, pacing, or style.' },
  ]);
  const resizeRef = useRef<{ sceneIndex: number; startX: number; startDuration: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setDurations(prev => {
      const next = { ...prev };
      scenes.forEach((scene, i) => {
        const n = sceneNo(scene, i + 1);
        if (!next[n]) next[n] = 8;
      });
      return next;
    });
  }, [scenes]);

  useEffect(() => {
    const onMove = (event: globalThis.MouseEvent) => {
      if (!resizeRef.current) return;
      const next = snapDuration(resizeRef.current.startDuration + (event.clientX - resizeRef.current.startX) / PX_PER_SECOND);
      setDurations(prev => ({ ...prev, [resizeRef.current!.sceneIndex]: next }));
    };
    const onUp = () => { resizeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const selectedScene = useMemo(() => {
    if (selectedIndex === 0) return null;
    return scenes.find((scene, i) => sceneNo(scene, i + 1) === selectedIndex) || scenes[0] || null;
  }, [scenes, selectedIndex]);

  const progress = totalSteps > 0 ? Math.min(100, Math.round((step / totalSteps) * 100)) : (status === 'completed' ? 100 : 6);
  const totalDuration = Math.max(8, scenes.reduce((sum, scene, i) => sum + (durations[sceneNo(scene, i + 1)] || 8), 0));
  const showFinal = selectedIndex === 0 && !!finalVideo;
  const stageAspect = aspect === '9:16' ? 'aspect-[9/16] max-h-[470px]' : aspect === '1:1' ? 'aspect-square max-h-[470px]' : 'aspect-video';
  const displayTitle = selectedScene ? selectedScene.title || `Scene ${sceneNo(selectedScene, selectedIndex)}` : 'Final Cut';
  const sceneList = scenes.length ? scenes : [{ scene_index: 1, status: status === 'failed' ? 'failed' : 'queued', image_url: null, video_url: null, title: 'Scene 1' }];

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: 'I understood. I will apply this as an edit instruction when scene regeneration is available for this project.' },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f3f4f1] text-[#151515] flex flex-col">
      <header className="h-[56px] bg-white border-b border-zinc-200 flex items-center px-5 gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-[18px] leading-none">‹</button>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold truncate">{title || modeLabel || 'Untitled video'}</div>
          <div className="text-[11px] text-zinc-500">{modeLabel} workspace</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full ring-1 text-[11px] font-medium ${statusTone(status)}`}>{status === 'processing' ? `${progress}%` : label(status)}</span>
          {finalVideo && <button onClick={() => setSelectedIndex(0)} className="h-9 px-3 rounded-full border border-zinc-200 bg-white text-[12px] font-medium hover:bg-zinc-50">Final</button>}
          {status === 'failed' && onRetry && <button onClick={onRetry} className="h-9 px-4 rounded-full bg-[#ff2f7d] text-white text-[12px] font-semibold shadow-sm hover:bg-[#ec226f]">Retry</button>}
          {downloadHref && <a href={downloadHref} download className="h-9 px-4 rounded-full bg-[#ff2f7d] text-white text-[12px] font-semibold shadow-sm hover:bg-[#ec226f] inline-flex items-center">Download</a>}
        </div>
      </header>

      <div className="flex-1 min-h-0 p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-[282px_minmax(480px,1fr)_292px] gap-4 min-h-[420px] flex-1">
          <aside className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-100">
              <div className="text-[16px] font-semibold">Scenes</div>
              <div className="text-[11px] text-zinc-500 mt-1">{sceneList.length} clips in this project</div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sceneList.map((scene, i) => {
                const n = sceneNo(scene, i + 1);
                const active = selectedIndex === n;
                return (
                  <button key={n} onClick={() => setSelectedIndex(n)} className={`w-full text-left rounded-xl border p-3 transition ${active ? 'border-[#ff2f7d] bg-pink-50/70' : 'border-zinc-200 bg-white hover:bg-zinc-50'}`}>
                    <div className="flex gap-3">
                      <div className="w-14 h-10 rounded-lg bg-zinc-100 overflow-hidden border border-zinc-200 flex items-center justify-center">
                        {scene.image_url ? <img src={scene.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[11px] text-zinc-400">S{n}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold truncate">{scene.title || `Scene ${n}`}</div>
                        <div className="text-[11px] text-zinc-500 mt-1 truncate">{scene.narrator_text || message || 'Preparing scene'}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full ring-1 text-[10px] font-medium ${statusTone(scene.status)}`}>{label(scene.status)}</span>
                      <span className="text-[10px] text-zinc-400">{durations[n] || 8}s</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-zinc-100">
              <button onClick={onBack} className="w-full h-10 rounded-full border border-zinc-300 text-[12px] font-semibold hover:bg-zinc-50">Back</button>
            </div>
          </aside>

          <main className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="h-12 border-b border-zinc-100 px-4 flex items-center">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate">{displayTitle}</div>
                <div className="text-[11px] text-zinc-500 truncate">{status === 'failed' ? error : message || 'Preview updates as scenes render'}</div>
              </div>
              <div className="ml-auto flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="px-2 py-1 rounded-md bg-zinc-100">{aspect}</span>
                <span className="px-2 py-1 rounded-md bg-zinc-100">{formatTime(totalDuration)}</span>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-[#f7f7f4] p-5 flex items-center justify-center">
              <div className={`relative w-full ${stageAspect} rounded-xl overflow-hidden bg-[#0d0d0d] shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex items-center justify-center`}>
                {showFinal ? (
                  <video ref={videoRef} key={finalVideo} src={finalVideo || undefined} controls className="w-full h-full object-contain bg-black" />
                ) : selectedScene?.video_url ? (
                  <video ref={videoRef} key={selectedScene.video_url} src={selectedScene.video_url} controls className="w-full h-full object-cover bg-black" />
                ) : selectedScene?.image_url ? (
                  <img src={selectedScene.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-8">
                    <div className="w-11 h-11 mx-auto rounded-full border-2 border-white/20 border-t-white animate-spin mb-4" />
                    <div className="text-[13px] text-white/74">{error || message || 'Preparing preview'}</div>
                  </div>
                )}
                {status === 'processing' && (
                  <div className="absolute left-4 right-4 bottom-4 h-2 rounded-full bg-black/45 overflow-hidden">
                    <div className="h-full bg-[#ff2f7d]" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            </div>
            <div className="h-[58px] px-4 flex items-center gap-2 border-t border-zinc-100">
              <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 2); }} className="w-8 h-8 rounded-full border border-zinc-200 bg-white text-[13px] hover:bg-zinc-50">‹</button>
              <button onClick={() => videoRef.current?.play()} className="w-9 h-9 rounded-full bg-[#151515] text-white text-[12px]">Play</button>
              <button onClick={() => videoRef.current?.pause()} className="w-8 h-8 rounded-full border border-zinc-200 bg-white text-[12px] hover:bg-zinc-50">Stop</button>
              <div className="ml-auto text-[11px] text-zinc-500">{status === 'processing' ? `${step}/${totalSteps || 1} steps` : label(status)}</div>
            </div>
          </main>

          <aside className="bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <div className="text-[16px] font-semibold">Mave</div>
                <div className="text-[11px] text-zinc-500">AI edit assistant</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#fff0f6] text-[#ff2f7d] flex items-center justify-center font-semibold">M</div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {(selectedScene?.dialogue || []).slice(0, 2).map((line, i) => (
                <div key={`${line.speaker}-${i}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">{line.speaker}</div>
                  <div className="text-[12px] leading-relaxed mt-1">{line.line}</div>
                </div>
              ))}
              {messages.map((entry, i) => (
                <div key={i} className={`rounded-2xl px-3 py-2.5 border ${entry.role === 'user' ? 'ml-5 bg-[#151515] text-white border-[#151515]' : 'mr-5 bg-[#fff8fb] border-pink-100'}`}>
                  <div className={`text-[10px] mb-1 ${entry.role === 'user' ? 'text-white/50' : 'text-pink-500'}`}>{entry.role === 'user' ? 'You' : 'Mave'}</div>
                  <div className="text-[12px] leading-relaxed">{entry.text}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-zinc-100">
              <div className="flex gap-2 rounded-full border border-zinc-200 bg-zinc-50 p-1">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                  placeholder="Ask Mave to change anything..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[12px] outline-none placeholder:text-zinc-400" />
                <button onClick={sendChat} disabled={!chatInput.trim()} className="h-9 px-4 rounded-full bg-[#ff2f7d] text-white text-[12px] font-semibold disabled:opacity-30">Send</button>
              </div>
            </div>
          </aside>
        </div>

        <section className="h-[214px] bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="h-full grid grid-cols-[112px_minmax(0,1fr)]">
            <div className="border-r border-zinc-200 bg-[#fafafa]">
              <div className="h-11 border-b border-zinc-200 flex items-center justify-center gap-3 text-zinc-500">
                <span className="w-7 h-7 rounded-md border border-zinc-200 bg-white flex items-center justify-center">□</span>
                <span className="w-7 h-7 rounded-md border border-zinc-200 bg-white flex items-center justify-center">⚙</span>
              </div>
              <TrackLabel label="Video" icon="▰" active />
              <TrackLabel label="Audio" icon="♪" />
            </div>
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="relative h-full" style={{ width: Math.max(980, totalDuration * PX_PER_SECOND + 120) }}>
                <div className="h-11 border-b border-zinc-200 relative bg-[#fbfbfa]">
                  {Array.from({ length: Math.max(8, Math.ceil(totalDuration / 5) + 2) }, (_, i) => i * 5).map(tick => (
                    <div key={tick} className="absolute top-0 h-full" style={{ left: tick * PX_PER_SECOND }}>
                      <div className="text-[10px] text-zinc-500 mt-2">{formatTime(tick)}</div>
                      <div className="absolute bottom-0 left-0 h-3 w-px bg-zinc-300" />
                    </div>
                  ))}
                </div>
                <div className="h-[58px] border-b border-zinc-200 relative">
                  <div className="absolute left-0 top-3 flex">
                    {sceneList.map((scene, i) => {
                      const n = sceneNo(scene, i + 1);
                      const duration = durations[n] || 8;
                      return (
                        <div key={n} onClick={() => setSelectedIndex(n)}
                          className={`relative h-9 rounded-md border flex items-center gap-2 px-2 mr-1 cursor-pointer shadow-sm ${selectedIndex === n ? 'bg-[#ff2f7d] text-white border-[#ff2f7d]' : 'bg-[#2f8b57] border-[#28764a] text-white'}`}
                          style={{ width: duration * PX_PER_SECOND }}>
                          {scene.image_url && <img src={scene.image_url} alt="" className="w-6 h-6 rounded object-cover" />}
                          <span className="text-[10px] font-semibold truncate">Scene {n}</span>
                          <span className="ml-auto text-[9px] opacity-75">{duration}s</span>
                          <div onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
                            event.preventDefault();
                            resizeRef.current = { sceneIndex: n, startX: event.clientX, startDuration: duration };
                          }} className="absolute right-0 top-0 h-full w-3 cursor-ew-resize rounded-r-md bg-white/15 hover:bg-white/35" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute left-10 top-0 bottom-0 w-px bg-[#151515]">
                    <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-[#151515]" />
                    <div className="absolute -bottom-1 -left-1.5 w-3 h-3 rounded-full bg-[#151515]" />
                  </div>
                </div>
                <div className="h-[58px] border-b border-zinc-200 relative">
                  <div className="absolute left-0 right-10 top-4 h-7 rounded bg-zinc-100 overflow-hidden">
                    <div className="h-full opacity-90" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #2f8b57 0 3px, #2f8b57 3px 5px, #b8b8b8 5px 8px, transparent 8px 12px)' }} />
                  </div>
                </div>
                {onCreateAnother && status === 'completed' && (
                  <button onClick={onCreateAnother} className="absolute right-4 bottom-4 px-3 py-2 rounded-full border border-zinc-300 bg-white text-[11px] font-semibold hover:bg-zinc-50">
                    Create another
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
