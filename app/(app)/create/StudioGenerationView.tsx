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
    { role: 'assistant', text: 'Describe what you want to change. This editor keeps the production timeline visible while clips render.' },
  ]);
  const resizeRef = useRef<{ sceneIndex: number; startX: number; startDuration: number } | null>(null);

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
  const stageAspect = aspect === '9:16' ? 'aspect-[9/16] max-h-[456px]' : aspect === '1:1' ? 'aspect-square max-h-[456px]' : 'aspect-video';

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: 'Noted. Scene-level AI edits for this mode will use this editor surface; current render output stays unchanged.' },
    ]);
  };

  const displayTitle = selectedScene
    ? selectedScene.title || `Scene ${sceneNo(selectedScene, selectedIndex)}`
    : 'Final Cut';

  return (
    <div className="w-[calc(100vw-40px)] max-w-[1180px] relative left-1/2 -translate-x-1/2 h-[calc(100vh-110px)] min-h-[620px] flex flex-col gap-3">
      <div className="grid grid-cols-1 lg:grid-cols-[268px_minmax(480px,1fr)_268px] gap-4 min-h-[404px]">
        <aside className="rounded-lg bg-[#080808] border border-[rgba(255,255,255,0.06)] p-5 overflow-hidden">
          <div className="text-[16px] font-semibold mb-1">{selectedIndex === 0 ? 'Final Cut' : 'Scene Brief'}</div>
          <p className="text-[11px] leading-relaxed text-[rgba(255,255,255,0.44)] mb-5">
            {modeLabel} production workspace.
          </p>
          <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-black p-3 mb-4">
            <div className="text-[10px] text-[rgba(255,255,255,0.34)] mb-1">Topic</div>
            <div className="text-[13px] font-medium leading-snug">{displayTitle}</div>
            <div className="text-[11px] text-[rgba(255,255,255,0.42)] mt-2">{title || modeLabel}</div>
          </div>

          <div className="space-y-3">
            {(selectedScene?.dialogue || []).slice(0, 3).map((line, i) => (
              <div key={`${line.speaker}-${i}`} className="flex gap-3 pb-3 border-b border-[rgba(255,255,255,0.06)]">
                <div className="w-10 h-10 rounded-lg bg-[#10291d] border border-[rgba(40,199,111,0.22)] flex items-center justify-center text-[11px] text-[#28c76f]">{i + 1}</div>
                <div>
                  <div className="text-[12px] font-medium">{line.speaker}</div>
                  <div className="text-[12px] text-[rgba(255,255,255,0.54)] leading-relaxed">{line.line}</div>
                </div>
              </div>
            ))}
            {!selectedScene?.dialogue?.length && (
              <div className="text-[12px] text-[rgba(255,255,255,0.48)] leading-relaxed">
                {status === 'failed' ? error : message || 'Scenes will appear here as production starts.'}
              </div>
            )}
          </div>
          <button onClick={onBack} className="mt-5 w-full py-2.5 rounded-full border border-[rgba(255,255,255,0.16)] text-[12px] text-[rgba(255,255,255,0.7)] hover:text-white">Back</button>
        </aside>

        <main className="rounded-lg bg-[#080808] border border-[rgba(255,255,255,0.06)] overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 p-2 flex items-center justify-center">
            <div className={`relative w-full ${stageAspect} rounded-md overflow-hidden bg-[#111] flex items-center justify-center`}>
              {showFinal ? (
                <video key={finalVideo} src={finalVideo || undefined} controls className="w-full h-full object-contain bg-black" />
              ) : selectedScene?.video_url ? (
                <video key={selectedScene.video_url} src={selectedScene.video_url} controls className="w-full h-full object-cover bg-black" />
              ) : selectedScene?.image_url ? (
                <img src={selectedScene.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center px-6">
                  <div className="w-10 h-10 mx-auto rounded-full border-2 border-[rgba(255,255,255,0.12)] border-t-[#28c76f] animate-spin mb-4" />
                  <div className="text-[12px] text-[rgba(255,255,255,0.42)]">{error || message || 'Preparing preview'}</div>
                </div>
              )}
              {status === 'processing' && (
                <div className="absolute left-3 bottom-3 h-1.5 w-[72%] rounded-full bg-black/70 overflow-hidden">
                  <div className="h-full bg-[#28c76f]" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </div>
          <div className="h-[58px] px-4 flex items-center gap-3 border-t border-[rgba(255,255,255,0.06)]">
            <button className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.08)] text-[11px]">◀</button>
            <button className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.12)] text-[11px]">▶</button>
            <button className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.08)] text-[11px]">■</button>
            <div className="ml-auto flex gap-2">
              {finalVideo && <button onClick={() => setSelectedIndex(0)} className="px-3 py-2 rounded-md bg-[rgba(255,255,255,0.08)] text-[11px]">Final</button>}
              {status === 'failed' && onRetry && <button onClick={onRetry} className="px-3 py-2 rounded-md bg-white text-black text-[11px]">Retry</button>}
              {downloadHref && <a href={downloadHref} download className="px-3 py-2 rounded-md bg-white text-black text-[11px]">Download</a>}
            </div>
          </div>
        </main>

        <aside className="rounded-lg bg-[#080808] border border-[rgba(255,255,255,0.06)] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[16px] font-semibold">AI Editor</div>
            <div className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.18)] flex items-center justify-center text-[13px]">⌕</div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.map((entry, i) => (
              <div key={i} className={`${entry.role === 'user' ? 'ml-5 bg-[#173b2b] border-[#28c76f]' : 'mr-5 bg-black border-[rgba(255,255,255,0.08)]'} border rounded-lg px-3 py-2`}>
                <div className="text-[10px] text-[rgba(255,255,255,0.35)] mb-1">{entry.role === 'user' ? 'You' : 'Animave AI'}</div>
                <div className="text-[12px] leading-relaxed text-[rgba(255,255,255,0.78)]">{entry.text}</div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                placeholder="Describe an edit..."
                className="flex-1 bg-black border border-[rgba(255,255,255,0.12)] rounded-full px-3 py-2 text-[12px] outline-none focus:border-[#28c76f]" />
              <button onClick={sendChat} disabled={!chatInput.trim()} className="px-4 rounded-full bg-white text-black text-[12px] font-medium disabled:opacity-25">Send</button>
            </div>
          </div>
        </aside>
      </div>

      <section className="flex-1 min-h-[190px] rounded-lg bg-[#070707] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="h-full grid grid-cols-[108px_minmax(0,1fr)]">
          <div className="border-r border-[rgba(255,255,255,0.08)] bg-[#090909]">
            <div className="h-44 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-center gap-4 text-[rgba(255,255,255,0.55)]">
              <span className="text-[18px]">▣</span><span className="text-[18px]">⚙</span>
            </div>
            <TrackLabel label="Video" icon="▰" active />
            <TrackLabel label="Audio" icon="♪" />
          </div>
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="relative h-full" style={{ width: Math.max(980, totalDuration * PX_PER_SECOND + 100) }}>
              <div className="h-11 border-b border-[rgba(255,255,255,0.08)] relative">
                {Array.from({ length: Math.max(8, Math.ceil(totalDuration / 5) + 2) }, (_, i) => i * 5).map(tick => (
                  <div key={tick} className="absolute top-0 h-full" style={{ left: tick * PX_PER_SECOND }}>
                    <div className="text-[10px] text-[rgba(255,255,255,0.48)] mt-2">{formatTime(tick)}</div>
                    <div className="absolute bottom-0 left-0 h-3 w-px bg-[rgba(255,255,255,0.3)]" />
                  </div>
                ))}
              </div>
              <div className="h-[58px] border-b border-[rgba(255,255,255,0.08)] relative">
                <div className="absolute left-0 top-3 flex">
                  {(scenes.length ? scenes : [{ scene_index: 1, status: status === 'failed' ? 'failed' : 'queued', image_url: null, video_url: null }]).map((scene, i) => {
                    const n = sceneNo(scene, i + 1);
                    const duration = durations[n] || 8;
                    return (
                      <div key={n} onClick={() => setSelectedIndex(n)}
                        className={`relative h-8 rounded-md border flex items-center gap-2 px-2 mr-1 cursor-pointer ${selectedIndex === n ? 'bg-[#2f9f67] border-[#6ee7a0]' : 'bg-[#206b47] border-[#31865a]'}`}
                        style={{ width: duration * PX_PER_SECOND }}>
                        {scene.image_url && <img src={scene.image_url} alt="" className="w-6 h-6 rounded object-cover" />}
                        <span className="text-[10px] truncate">S{n} · {duration}s</span>
                        <span className="ml-auto text-[9px] text-white/65">{label(scene.status)}</span>
                        <div onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
                          event.preventDefault();
                          resizeRef.current = { sceneIndex: n, startX: event.clientX, startDuration: duration };
                        }} className="absolute right-0 top-0 h-full w-3 cursor-ew-resize rounded-r-md bg-white/10 hover:bg-white/30" />
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
                  <div className="h-full opacity-90" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #28c76f 0 3px, #28c76f 3px 5px, #7f8b86 5px 8px, transparent 8px 12px)' }} />
                </div>
              </div>
              {finalVideo && (
                <button onClick={() => setSelectedIndex(0)} className="absolute right-4 top-12 px-3 py-1.5 rounded-md bg-[rgba(255,255,255,0.08)] text-[11px] text-white">
                  View final
                </button>
              )}
              {onCreateAnother && status === 'completed' && (
                <button onClick={onCreateAnother} className="absolute right-4 bottom-4 px-3 py-2 rounded-md border border-[rgba(255,255,255,0.14)] text-[11px] text-[rgba(255,255,255,0.72)]">
                  Create another
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TrackLabel({ label, icon, active }: { label: string; icon: string; active?: boolean }) {
  return (
    <div className={`h-[58px] border-b border-[rgba(255,255,255,0.08)] flex items-center gap-3 px-7 text-[12px] ${active ? 'border-l-4 border-l-[#28c76f]' : ''}`}>
      <span className="text-[rgba(255,255,255,0.72)]">{icon}</span>
      <span className="text-[rgba(255,255,255,0.45)]">{label}</span>
    </div>
  );
}
