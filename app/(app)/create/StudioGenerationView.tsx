'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Ico, Stage, StageEmpty, StudioPanel, ChatPanel, StudioTimeline, StatusDot, Spinner } from '@/components/editor/kit';

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
    { role: 'assistant', text: 'I am Mave. Tell me what you want to change in the video or a specific scene.' },
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

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: 'I understood the edit request. For this render view I will keep the timeline state visible; regeneration is available on modes that support scene edits.' },
    ]);
  };

  const displayTitle = selectedScene
    ? selectedScene.title || `Scene ${sceneNo(selectedScene, selectedIndex)}`
    : 'Final Cut';

  const clips = (scenes.length ? scenes : [{ scene_index: 1, status: status === 'failed' ? 'failed' : 'queued', image_url: null, video_url: null } as StudioScene])
    .map((scene, i) => {
      const n = sceneNo(scene, i + 1);
      return { n, duration: durations[n] || 8, status: scene.status, image: scene.image_url };
    });
  const doneCount = scenes.filter(sc => sc.status === 'completed').length;
  const headline = status === 'completed' ? 'Your video is ready' : status === 'failed' ? 'Generation failed' : 'Rendering';

  return (
    <div className="flex flex-col gap-3 min-h-[calc(100vh-60px)] lg:h-[calc(100vh-60px)] p-3 md:p-4">
      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 min-h-[58px] rounded-[16px] border border-[var(--line)] bg-[#070707]">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${status === 'completed' ? 'bg-white text-black' : status === 'failed' ? 'bg-[rgba(255,90,90,0.12)] text-[#ff8a8a]' : 'bg-white/[0.06]'}`}>
            {status === 'completed' ? Ico.check : status === 'failed' ? Ico.x : <Spinner size={14} />}
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">{headline}</div>
            <div className="text-[11.5px] text-[var(--fg-4)] truncate max-w-[440px]">{status === 'failed' ? (error || message) : message}</div>
          </div>
        </div>
        {status === 'processing' && (
          <div className="flex items-center gap-3 flex-1 min-w-[180px] max-w-[360px]">
            <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <span className="ui-mono text-[11px] text-[var(--fg-3)] tabular-nums">{progress}%</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline ui-mono text-[10.5px] text-[var(--fg-4)] mr-2">{doneCount}/{scenes.length || 0} scenes</span>
          {onCreateAnother && status === 'completed' && <button onClick={onCreateAnother} className="ui-btn ui-btn-sm ui-btn-ghost">Create another</button>}
          {status === 'failed' && onRetry && <button onClick={onRetry} className="ui-btn ui-btn-sm ui-btn-secondary">Retry</button>}
          {finalVideo && <button onClick={() => setSelectedIndex(0)} className={`ui-btn ui-btn-sm ${selectedIndex === 0 ? 'ui-btn-secondary' : 'ui-btn-ghost'}`}>Final cut</button>}
          {downloadHref && (
            <a href={downloadHref} download className="ui-btn ui-btn-sm ui-btn-primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></svg>
              Download
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[272px_minmax(0,1fr)_300px] gap-3 flex-1 min-h-[400px]">
        {/* Brief */}
        <StudioPanel title={selectedIndex === 0 ? 'Final cut' : 'Scene brief'} sub={modeLabel} bodyClass="overflow-y-auto">
          <div className="p-4 flex flex-col gap-4">
            <div className="rounded-[12px] border border-[var(--line)] bg-white/[0.02] p-3.5">
              <div className="ui-eyebrow !text-[9.5px] mb-1.5">{selectedIndex === 0 ? 'Project' : `Scene ${String(selectedIndex).padStart(2, '0')}`}</div>
              <div className="text-[13px] font-medium leading-snug line-clamp-3">{displayTitle}</div>
              {title && <div className="text-[11.5px] text-[var(--fg-4)] mt-2 line-clamp-2">{title}</div>}
            </div>
            {(selectedScene?.dialogue || []).slice(0, 3).map((line, i) => (
              <div key={`${line.speaker}-${i}`} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-white/[0.06] border border-[var(--line-2)] flex items-center justify-center ui-mono text-[10px] flex-shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium">{line.speaker}</div>
                  <div className="text-[12px] text-[var(--fg-3)] leading-relaxed">{line.line}</div>
                </div>
              </div>
            ))}
            {!selectedScene?.dialogue?.length && (
              <p className="text-[12px] text-[var(--fg-3)] leading-relaxed">
                {status === 'failed' ? error : message || 'Scenes will appear here as production starts.'}
              </p>
            )}
            <div className="mt-auto pt-2">
              <button onClick={onBack} className="ui-btn ui-btn-sm ui-btn-secondary w-full">{Ico.back}Back to setup</button>
            </div>
          </div>
        </StudioPanel>

        {/* Stage */}
        <StudioPanel title={displayTitle} sub={aspect} bodyClass="flex flex-col">
          <div className="flex-1 min-h-0 p-3 flex items-center justify-center">
            <Stage aspect={aspect} processing={status === 'processing'} progress={progress}>
              {showFinal ? (
                <video ref={videoRef} key={finalVideo} src={finalVideo || undefined} controls className="w-full h-full object-contain bg-black" />
              ) : selectedScene?.video_url ? (
                <video ref={videoRef} key={selectedScene.video_url} src={selectedScene.video_url} controls className="w-full h-full object-cover bg-black" />
              ) : selectedScene?.image_url ? (
                <img src={selectedScene.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <StageEmpty label={error || message || 'Preparing preview'} busy={status !== 'failed'} />
              )}
            </Stage>
          </div>
          <div className="h-12 px-3 flex items-center gap-1.5 border-t border-[var(--line)] flex-shrink-0">
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 2); }} aria-label="Rewind" className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--fg-3)] hover:text-white hover:bg-white/[0.06]">{Ico.rewind}</button>
            <button onClick={() => videoRef.current?.play()} aria-label="Play" className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-black">{Ico.play}</button>
            <button onClick={() => videoRef.current?.pause()} aria-label="Pause" className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--fg-3)] hover:text-white hover:bg-white/[0.06]">{Ico.pause}</button>
            {selectedScene && (
              <span className="ml-auto flex items-center gap-2 text-[11px] text-[var(--fg-4)]"><StatusDot status={selectedScene.status} />{selectedScene.status}</span>
            )}
          </div>
        </StudioPanel>

        {/* AI editor */}
        <ChatPanel messages={messages} value={chatInput} onChange={setChatInput} onSubmit={sendChat} />
      </div>

      <StudioTimeline
        clips={clips}
        selected={selectedIndex}
        onSelect={setSelectedIndex}
        onResizeStart={(n, event) => {
          event.preventDefault();
          resizeRef.current = { sceneIndex: n, startX: event.clientX, startDuration: durations[n] || 8 };
        }}
        pxPerSecond={PX_PER_SECOND}
        totalDuration={totalDuration}
        formatTime={formatTime}
      />
    </div>
  );
}
