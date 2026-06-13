'use client';

import { useMemo, useRef, useState } from 'react';

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

function sceneNo(scene: StudioScene, fallback: number): number {
  return scene.scene_index || scene.scene_number || fallback;
}

function label(status: string): string {
  const map: Record<string, string> = {
    queued: 'Queued',
    processing: 'Working',
    rendering_image: 'Generating image',
    animating: 'Generating video',
    regenerating: 'Regenerating',
    completed: 'Done',
    failed: 'Failed',
  };
  return map[status] || status || 'Queued';
}

function AppLogo() {
  return (
    <div className="h-9 w-9 rounded-[10px] bg-[#f3f0e6] text-black flex items-center justify-center font-black text-[22px] leading-none">
      /
    </div>
  );
}

function FileRow({
  name,
  meta,
  active,
  icon,
  thumbnail,
  onSelect,
}: {
  name: string;
  meta?: string;
  active?: boolean;
  icon: string;
  thumbnail?: string | null;
  onSelect?: () => void;
}) {
  const className = `w-full h-10 px-2 rounded-md flex items-center gap-2 text-left transition ${active ? 'bg-[#3a3a3a]' : onSelect ? 'hover:bg-[#303030]' : ''}`;
  const content = (
    <>
      {thumbnail ? (
        <span className="w-6 h-6 rounded-[5px] overflow-hidden bg-[#191919] border border-[#454545] shrink-0">
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        </span>
      ) : (
        <span className="w-5 text-center text-[#8d8d8d]">{icon}</span>
      )}
      <span className="min-w-0 flex-1 truncate text-[13px] text-[#c8c8c8]">{name}</span>
      {meta && <span className="text-[11px] text-[#777]">{meta}</span>}
    </>
  );

  if (!onSelect) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
    >
      {content}
    </button>
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
  const [showFiles, setShowFiles] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'I am Mave. Tell me what to change in the workspace, a scene, dialogue, style, or pacing.' },
  ]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const sceneList = scenes.length ? scenes : [{
    scene_index: 1,
    status: status === 'failed' ? 'failed' : 'queued',
    image_url: null,
    video_url: null,
    title: 'Scene 1',
  }];

  const selectedScene = useMemo(() => {
    if (selectedIndex === 0) return null;
    return sceneList.find((scene, i) => sceneNo(scene, i + 1) === selectedIndex) || sceneList[0] || null;
  }, [sceneList, selectedIndex]);

  const filteredSceneList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sceneList;
    return sceneList.filter((scene, i) => {
      const n = sceneNo(scene, i + 1);
      return `${scene.title || ''} ${scene.status || ''} scene ${n}`.toLowerCase().includes(term);
    });
  }, [sceneList, searchTerm]);

  const progress = totalSteps > 0 ? Math.min(100, Math.round((step / totalSteps) * 100)) : (status === 'completed' ? 100 : 0);
  const showFinal = selectedIndex === 0 && !!finalVideo;
  const previewVideo = showFinal ? finalVideo : selectedScene?.video_url || null;
  const previewImage = !previewVideo ? selectedScene?.image_url || null : null;
  const displayTitle = selectedScene ? selectedScene.title || `Scene ${sceneNo(selectedScene, selectedIndex)}` : 'Final Cut';

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: `I noted this for ${displayTitle}. When regeneration is connected for this mode, Mave will apply it to the selected scene.` },
    ]);
  };

  const selectPrevious = () => {
    const ids = finalVideo ? [0, ...sceneList.map((scene, i) => sceneNo(scene, i + 1))] : sceneList.map((scene, i) => sceneNo(scene, i + 1));
    const current = ids.indexOf(selectedIndex);
    setSelectedIndex(ids[Math.max(0, current - 1)] ?? ids[0] ?? 1);
  };

  const selectNext = () => {
    const ids = finalVideo ? [0, ...sceneList.map((scene, i) => sceneNo(scene, i + 1))] : sceneList.map((scene, i) => sceneNo(scene, i + 1));
    const current = ids.indexOf(selectedIndex);
    setSelectedIndex(ids[Math.min(ids.length - 1, current + 1)] ?? ids[ids.length - 1] ?? 1);
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const copyShareLink = async () => {
    const url = downloadHref || finalVideo || previewVideo || (typeof window !== 'undefined' ? window.location.href : '');
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1400);
    } catch {
      setShareCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#202020] text-[#d6d6d6] flex flex-col overflow-hidden">
      <header className="h-[64px] bg-[#202020] border-b border-[#333] flex items-center px-5 gap-5">
        <AppLogo />
        <button onClick={onBack} className="text-[#d8d8d8] hover:text-white" aria-label="Home">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>
        </button>
        <span className="text-[#858585]">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M20 4 8 16M8 8l12 12"/></svg>
        </span>

        <div className="ml-auto flex items-center gap-3">
          {downloadHref && <a href={downloadHref} download className="h-9 px-4 rounded-[10px] bg-white text-black text-[13px] font-semibold inline-flex items-center gap-2"><span>↗</span> Export</a>}
          <button onClick={copyShareLink} className="h-9 px-4 rounded-[10px] bg-white text-black text-[13px] font-semibold inline-flex items-center gap-2">
            <span>↗</span> {shareCopied ? 'Copied' : 'Share'}
          </button>
          <button onClick={() => setShowFiles(v => !v)} className={`w-9 h-9 rounded-[10px] border border-[#474747] text-[#c9c9c9] ${showFiles ? 'bg-[#303030]' : ''}`}>▮</button>
          <button onClick={() => setShowChat(v => !v)} className={`w-9 h-9 rounded-[10px] border border-[#474747] text-[#c9c9c9] ${showChat ? 'bg-[#303030]' : ''}`}>▯</button>
          <div className="h-9 px-4 rounded-full bg-[#2f2f2f] border border-[#3a3a3a] flex items-center gap-2 text-[13px]">
            <span className="text-[#d7d7d7]">{status === 'processing' ? `${progress}%` : label(status)}</span>
          </div>
          <span className="text-[#a8a8a8]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 6-3 8h18c0-2-3-1-3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
          </span>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d8bc9a] to-[#6f513d] border border-[#565656]" />
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {showFiles && <aside className="w-[348px] bg-[#252525] border-r border-[#3a3a3a] flex flex-col">
          <div className="h-[76px] px-5 flex items-center justify-between">
            <div className="text-[16px] font-semibold text-[#d7d7d7] inline-flex items-center gap-2 min-w-0">
              {title || 'Untitled'} <span className="text-[#777]">⌄</span>
            </div>
            <div className="flex items-center gap-4 text-[#8c8c8c]">
              <span>▧</span><span>▣</span><span>⇧</span>
            </div>
          </div>
          <div className="px-5 flex items-center gap-4">
            <div className="h-[54px] flex-1 rounded-[10px] border border-[#515151] bg-[#282828] flex items-center gap-3 px-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8d8d8d" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search files"
                className="w-full bg-transparent outline-none text-[18px] text-[#d7d7d7] placeholder:text-[#8e8e8e]"
              />
            </div>
            <span className="w-11 h-[44px] px-3 rounded-md bg-[#3a3a3a] text-[#d7d7d7] flex items-center justify-center">☷</span>
            <span className="w-11 h-[44px] px-3 rounded-md text-[#9a9a9a] flex items-center justify-center">▦</span>
          </div>
          <div className="flex-1 min-h-0 px-5 py-5 overflow-y-auto">
            {scenes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[16px] text-[#8a8a8a]">This project is empty</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.16em] text-[#777] mb-2">Assets</div>
                  {filteredSceneList.map((scene, i) => {
                    const n = sceneNo(scene, i + 1);
                    return (
                      <FileRow
                        key={n}
                        icon={scene.video_url ? '▣' : '□'}
                        name={scene.title || `Scene ${n}`}
                        meta={label(scene.status)}
                        active={selectedIndex === n}
                        thumbnail={scene.image_url}
                        onSelect={() => setSelectedIndex(n)}
                      />
                    );
                  })}
                </div>
                {finalVideo && <FileRow icon="▶" name="Final Cut.mp4" meta={aspect} active={selectedIndex === 0} onSelect={() => setSelectedIndex(0)} />}
              </div>
            )}
          </div>
        </aside>}

        <main className="relative flex-1 min-w-0 bg-[#202020] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(255,255,255,0.04),transparent_34%)]" />
          {previewVideo ? (
            <div className="relative w-[min(76vw,900px)] max-h-[78vh] rounded-[18px] bg-[#111] border border-[#333] shadow-[0_24px_90px_rgba(0,0,0,0.45)] overflow-hidden">
              <video ref={videoRef} src={previewVideo} controls className="w-full h-full max-h-[78vh] object-contain bg-black" />
            </div>
          ) : previewImage ? (
            <div className="relative w-[min(62vw,720px)] rounded-[18px] bg-[#111] border border-[#333] shadow-[0_24px_90px_rgba(0,0,0,0.45)] overflow-hidden">
              <img src={previewImage} alt="" className="w-full max-h-[74vh] object-contain" />
            </div>
          ) : (
            <div className="relative w-[660px] max-w-[70%] rounded-[28px] bg-[#141414] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
              <div className="rounded-[22px] border border-[#3d3d3d] bg-[#2a2a2a] overflow-hidden">
                <div className="h-10 border-b border-[#3d3d3d] flex items-center px-4 gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f36b60]" />
                  <span className="w-3 h-3 rounded-full bg-[#e5bd4a]" />
                  <span className="w-3 h-3 rounded-full bg-[#67bc5c]" />
                </div>
                <div className="grid grid-cols-[240px_1fr] h-[330px]">
                  <div className="border-r border-[#3d3d3d] p-3 text-[13px] text-[#b9b9b9] space-y-1">
                    <FileRow icon="⌄" name="Assets" />
                    <FileRow icon="⌄" name="Characters" />
                    <FileRow icon="›" name="The Dragon" />
                    <FileRow icon="⌄" name="The Old Wise Man" active />
                    <FileRow icon="›" name="Locations" />
                    <FileRow icon="⌄" name="Audio" />
                    <FileRow icon="›" name="Music" />
                    <FileRow icon="›" name="Documents" />
                    <FileRow icon="›" name="Plans" />
                  </div>
                  <div className="bg-[#d8c9a8] flex items-center justify-center">
                    <div className="w-36 h-64 rounded-t-full bg-[#e8e0cc] border border-[#bcae8f]" />
                  </div>
                </div>
              </div>
              <div className="pt-5">
                <div className="text-[22px] font-semibold text-white">Filesystem</div>
                <div className="mt-2 text-[17px] leading-relaxed text-[#8d8d8d]">
                  Keep every file, image, video, and document for your project in one organized workspace that remembers where you left off.
                </div>
              </div>
            </div>
          )}

          <div className="absolute left-[22%] top-1/2 -translate-y-1/2 rotate-[-90deg] text-[#6e6e6e] text-[13px] tracking-[0.2em]">
            {selectedIndex || 1} / {Math.max(6, sceneList.length)}
          </div>
          <div className="absolute right-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-8 text-[#777]">
            <button onClick={selectPrevious} aria-label="Previous scene">⌃</button>
            <button onClick={togglePlayback} aria-label="Play or pause preview">Ⅱ</button>
            <button onClick={selectNext} aria-label="Next scene">⌄</button>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-14 h-[66px] rounded-[16px] border border-[#494949] bg-[#303030]/90 shadow-[0_12px_40px_rgba(0,0,0,0.35)] flex items-center px-4 gap-4 text-[#cfcfcf]">
            <button onClick={copyShareLink} className="w-9 h-9 rounded-md hover:bg-[#3c3c3c]" aria-label="Share current preview">⇧</button>
            <span className="h-8 w-px bg-[#4a4a4a]" />
            <button onClick={() => setShowFiles(v => !v)} className="w-9 h-9 rounded-md hover:bg-[#3c3c3c]" aria-label="Toggle files">▦</button>
            <button onClick={() => setSelectedIndex(selectedScene ? sceneNo(selectedScene, selectedIndex) : sceneNo(sceneList[0], 1))} className="w-9 h-9 rounded-md hover:bg-[#3c3c3c]" aria-label="Show selected scene">▧</button>
            <button onClick={() => setShowChat(true)} className="w-9 h-9 rounded-md hover:bg-[#3c3c3c]" aria-label="Open Mave">♪</button>
          </div>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[13px] text-[#737373]">
            <span>⌘L files</span><span>⌘J editor</span><span>⌘F search</span><span>⌘B chat</span><span>@ mention</span>
          </div>
        </main>

        {showChat && <aside className="w-[500px] bg-[#252525] border-l border-[#3a3a3a] flex flex-col">
          <div className="h-16 px-6 flex items-center justify-between">
            <span className="px-4 py-2 rounded-[9px] bg-[#303030] text-[14px] text-[#d0d0d0]">Chat 1</span>
            <div className="flex items-center gap-5 text-[#a0a0a0] text-[22px]" aria-hidden="true"><span>＋</span><span>◷</span><span>⋮</span></div>
          </div>
          <div className="mx-4 rounded-[12px] border border-[#424242] bg-[#303030] overflow-hidden">
            <div className="h-16 px-6 border-b border-[#424242] flex items-center justify-between">
              <span className="text-[16px] font-semibold text-[#9e9e9e]">{status === 'processing' ? `${progress}% complete` : '0 credits remaining'}</span>
              <a href="/billing" className="h-9 px-4 rounded-[10px] bg-white text-black text-[15px] font-semibold inline-flex items-center">Upgrade Now</a>
            </div>
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="Type your message here..."
              className="h-[88px] w-full resize-none bg-transparent px-5 py-4 text-[16px] text-[#d7d7d7] outline-none placeholder:text-[#888]"
            />
            <div className="h-16 px-4 flex items-center gap-3">
              <span className="h-9 px-3 rounded-[8px] bg-[#3b3b3b] text-[#d0d0d0] text-[13px] flex items-center">∞ Agent⌄</span>
              <span className="h-9 px-3 text-[#a8a8a8] text-[13px] flex items-center">Mave 1.0⌄</span>
              <span className="text-[#d85ca4] text-[13px] font-semibold">MAX</span>
              <span className="ml-auto h-7 w-px bg-[#454545]" />
              <span className="text-[#aaa] text-[22px]">⌕</span>
              <button onClick={sendChat} disabled={!chatInput.trim()} className="w-9 h-9 rounded-full bg-[#3b3b3b] text-[#a7a7a7] disabled:opacity-40">↑</button>
            </div>
          </div>
          <div className="px-6 pt-5 text-[15px] text-[#777] flex items-center gap-2">
            <span>Workspace</span><span>/</span><span className="text-[#dedede]">⌂ Default</span><span>·</span><span>✂ {modeLabel}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
            {(selectedScene?.dialogue || []).slice(0, 3).map((line, i) => (
              <div key={`${line.speaker}-${i}`} className="rounded-[12px] border border-[#3f3f3f] bg-[#2b2b2b] p-3">
                <div className="text-[12px] text-[#808080]">{line.speaker}</div>
                <div className="text-[14px] leading-relaxed text-[#d0d0d0]">{line.line}</div>
              </div>
            ))}
            {messages.map((entry, i) => (
              <div key={i} className={`rounded-[14px] border border-[#3f3f3f] p-3 ${entry.role === 'user' ? 'bg-[#343434] ml-8' : 'bg-[#2b2b2b] mr-8'}`}>
                <div className="text-[12px] text-[#858585] mb-1">{entry.role === 'user' ? 'You' : 'Mave'}</div>
                <div className="text-[14px] leading-relaxed text-[#d0d0d0]">{entry.text}</div>
              </div>
            ))}
            {status === 'failed' && error && <div className="rounded-[14px] border border-red-900/60 bg-red-950/30 p-3 text-[13px] text-red-300">{error}</div>}
            {onRetry && status === 'failed' && <button onClick={onRetry} className="h-10 px-4 rounded-[10px] bg-white text-black text-[13px] font-semibold">Retry generation</button>}
            {onCreateAnother && status === 'completed' && <button onClick={onCreateAnother} className="h-10 px-4 rounded-[10px] bg-white text-black text-[13px] font-semibold">Create another</button>}
          </div>
        </aside>}
      </div>
    </div>
  );
}
