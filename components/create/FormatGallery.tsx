'use client';

import { FormatIcon, type FormatKey } from '@/components/FormatArt';

// The Create home: one card per format, each showing what that format actually makes.
// Media heights are fixed (not aspect-ratio) so the cards lay out the same in every browser.

type Media = { kind: 'image'; src: string; fit?: 'cover' | 'contain'; bg?: string } | { kind: 'video'; src: string; poster: string } | { kind: 'art' };

const CARDS: { key: FormatKey; title: string; desc: string; meta: string; tag?: string; media: Media }[] = [
  { key: 'story', title: 'Storytelling', tag: 'Most used', desc: 'Narrated stories for YouTube, with cinematic scenes, camera moves and sound design.', meta: '1–10 min · narrated · 16:9 or 9:16', media: { kind: 'video', src: '/create/formats/story.mp4', poster: '/create/formats/story.jpg' } },
  { key: 'motion', title: 'Motion Graphics', desc: 'Kinetic type, charts and diagrams, animated in code and timed to the voice.', meta: '10–60 s · code-animated', media: { kind: 'video', src: '/create/formats/motion.mp4', poster: '/create/formats/motion.jpg' } },
  { key: 'animated', title: 'Animated Story', desc: 'Design one lead character and get a narrated, captioned short.', meta: '1–10 min · captions', media: { kind: 'video', src: '/create/formats/animated.mp4', poster: '/create/formats/animated.jpg' } },
  { key: 'whiteboard', title: 'Whiteboard', desc: 'Any topic, drawn line by line while a narrator explains it.', meta: '1–10 min · narrated', media: { kind: 'video', src: '/create/formats/whiteboard.mp4', poster: '/create/formats/whiteboard.jpg' } },
  { key: 'cartoon', title: '2D Animation', desc: 'Your own characters, scenes and dialogue, built shot by shot.', meta: 'Scene by scene · dialogue', media: { kind: 'video', src: '/create/formats/cartoon.mp4', poster: '/create/formats/cartoon.jpg' } },
  { key: 'fruit_drama', title: 'Fruit Drama', desc: 'Fruit-character dramas with dialogue, made for Shorts and Reels.', meta: '3–10 scenes · Veo 3.1', media: { kind: 'art' } },
  { key: '3d_render', title: '3D Render', desc: 'Cinematic 3D explainers: x-ray cutaways, close-ups and slow camera moves.', meta: '10–60 s · narrated', media: { kind: 'art' } },
];

// Bento on a 6-column grid: two showcase cards, three formats, then two.
const SPAN: Record<FormatKey, string> = {
  story: 'md:col-span-3', motion: 'md:col-span-3',
  animated: 'md:col-span-2', whiteboard: 'md:col-span-2', cartoon: 'md:col-span-2',
  fruit_drama: 'md:col-span-3', '3d_render': 'md:col-span-3',
};
const TALL: FormatKey[] = ['story', 'motion'];

function Art({ k }: { k: FormatKey }) {
  return (
    <div className="absolute inset-0 bg-[#0c0c0c]">
      <div className="absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="absolute inset-0 flex items-center justify-center text-white/[0.14] group-hover:text-white/25 transition-colors duration-500">
        <FormatIcon k={k} size={96} />
      </div>
    </div>
  );
}

function MediaBox({ m, k }: { m: Media; k: FormatKey }) {
  if (m.kind === 'art') return <Art k={k} />;
  const zoom = 'transition-transform duration-[900ms] ease-out group-hover:scale-[1.035]';
  if (m.kind === 'video') {
    return <video src={m.src} poster={m.poster} muted loop autoPlay playsInline preload="metadata"
      className={`absolute inset-0 w-full h-full object-cover ${zoom}`} />;
  }
  return (
    <div className="absolute inset-0" style={m.bg ? { background: m.bg } : undefined}>
      <img src={m.src} alt="" draggable={false}
        className={`absolute inset-0 w-full h-full ${m.fit === 'contain' ? 'object-contain p-3' : 'object-cover'} ${zoom}`} />
    </div>
  );
}

export function FormatGallery({ onOpen }: { onOpen: (k: FormatKey) => void }) {
  return (
    <div className="px-5 md:px-10 pt-10 pb-16 max-w-[1180px] mx-auto">
      <header className="flex items-end justify-between gap-6 mb-9">
        <div>
          <h1 className="text-[30px] md:text-[38px] font-semibold tracking-[-0.035em] leading-[1.05]">What are we making?</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-3 max-w-[520px] leading-relaxed">
            Pick a format. Each one is its own studio: scripted, voiced and rendered for vertical and horizontal.
          </p>
        </div>
        <span className="hidden md:block text-[12px] text-[var(--fg-4)] tabular-nums pb-1">{CARDS.length} formats</span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {CARDS.map(c => (
          <button key={c.key} type="button" onClick={() => onOpen(c.key)}
            className={`group relative flex flex-col text-left rounded-[14px] border border-[var(--line)] bg-[var(--surface)] overflow-hidden transition-colors hover:border-[var(--line-3)] focus-visible:outline-none focus-visible:border-white ${SPAN[c.key]}`}>
            <div className={`relative w-full overflow-hidden border-b border-[var(--line)] ${TALL.includes(c.key) ? 'h-[220px] md:h-[290px]' : 'h-[190px] md:h-[200px]'}`}>
              <MediaBox m={c.media} k={c.key} />
            </div>
            <div className="flex items-start gap-4 px-5 pt-4 pb-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{c.title}</h3>
                  {c.tag && <span className="text-[11.5px] text-[var(--fg-4)]">{c.tag}</span>}
                </div>
                <p className="text-[13px] text-[var(--fg-3)] leading-snug mt-1.5 max-w-[460px]">{c.desc}</p>
                <p className="text-[11.5px] text-[var(--fg-4)] mt-3 tabular-nums">{c.meta}</p>
              </div>
              <span className="mt-0.5 w-8 h-8 rounded-full border border-[var(--line-2)] flex items-center justify-center text-[var(--fg-3)] flex-shrink-0 transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:border-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
