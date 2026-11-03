'use client';

import { FormatIcon, type FormatKey } from '@/components/FormatArt';

// The Create home: a shelf of vertical reels, one per format, each playing what that format actually makes.
// Cards keep 9:16 with a padding box (not aspect-ratio), so they lay out the same in every browser.

type Media = { kind: 'video'; src: string; poster: string } | { kind: 'art' };

const CARDS: { key: FormatKey; title: string; desc: string; meta: string; tag?: string; media: Media }[] = [
  { key: 'explainer', title: 'Explainer', tag: 'New', desc: 'A cartoon host explains any topic with cards, counters and little demos.', meta: '30–60 s', media: { kind: 'video', src: '/create/formats/explainer.mp4', poster: '/create/formats/explainer.jpg' } },
  { key: 'build3d', title: '3D Build', tag: 'New', desc: 'A yard cut open like a cake: everyday things built step by step.', meta: '60–75 s', media: { kind: 'video', src: '/create/formats/build3d.mp4', poster: '/create/formats/build3d.jpg' } },
  { key: 'health3d', title: '3D Health', tag: 'New', desc: 'Glowing organs and a vessel cut open: what your body does, step by step.', meta: '60–75 s', media: { kind: 'video', src: '/create/formats/health3d.mp4', poster: '/create/formats/health3d.jpg' } },
  { key: 'block', title: 'Block Horror', tag: 'New', desc: 'A rule the whole town obeys, a kid who breaks it and the tall thing in the dark.', meta: '40–50 s', media: { kind: 'video', src: '/create/formats/block.mp4', poster: '/create/formats/block.jpg' } },
  { key: 'collage_doc', title: 'Collage Documentary', tag: 'New', desc: 'True stories as a hand-made collage: archival photos, cut-outs and the real portrait.', meta: '30–60 s', media: { kind: 'video', src: '/create/formats/collage_doc.mp4', poster: '/create/formats/collage_doc.jpg' } },
  { key: 'premium', title: 'Premium Faceless', tag: 'New', desc: 'Your message typed on, letter by letter, with a live UI diagram for every line.', meta: '20–40 s', media: { kind: 'video', src: '/create/formats/premium.mp4', poster: '/create/formats/premium.jpg' } },
  { key: 'caption_news', title: 'Caption News', tag: 'New', desc: 'Real footage under huge captions, rolling numbers and a source on every figure.', meta: '30–75 s', media: { kind: 'video', src: '/create/formats/caption_news.mp4', poster: '/create/formats/caption_news.jpg' } },
  { key: 'telestrator', title: 'Sports Telestrator', tag: 'New', desc: 'Your match clip, rewound and frozen, with rings, arrows and the open space drawn on.', meta: '30–75 s', media: { kind: 'video', src: '/create/formats/telestrator.mp4', poster: '/create/formats/telestrator.jpg' } },
  { key: 'teardown', title: 'Exploded Teardown', tag: 'New', desc: 'A studio-lit product lifts apart in 3D, every part labelled on the object.', meta: '35–75 s', media: { kind: 'video', src: '/create/formats/teardown.mp4', poster: '/create/formats/teardown.jpg' } },
  { key: 'whiteboard', title: 'Whiteboard Explainer', tag: 'New', desc: 'Markers draw your topic live in real handwriting while a narrator explains it.', meta: '45–90 s', media: { kind: 'video', src: '/create/formats/whiteboard.mp4', poster: '/create/formats/whiteboard.jpg' } },
  { key: 'paper_lantern', title: 'Paper-cut Lightbox', tag: 'New', desc: 'A storyteller and a shadow-box lamp: backlit cut paper, lit windows, moonlight.', meta: '45–90 s', media: { kind: 'video', src: '/create/formats/paper_lantern.mp4', poster: '/create/formats/paper_lantern.jpg' } },
  { key: 'scifi_toon', title: 'Sci-Fi Sitcom Toon', tag: 'New', desc: 'A deadpan genius and his nervous sidekick portal-hop through your topic.', meta: '35–75 s', media: { kind: 'video', src: '/create/formats/scifi_toon.mp4', poster: '/create/formats/scifi_toon.jpg' } },
  { key: 'survival', title: 'Survival Story', tag: 'New', desc: 'Imagine you… stickmen in real 3D sets, rules on screen, a twist and a choice.', meta: '60–90 s', media: { kind: 'video', src: '/create/formats/survival.mp4', poster: '/create/formats/survival.jpg' } },
  { key: 'motion', title: 'Motion Graphics', desc: 'Kinetic type, charts and diagrams, timed to the voice.', meta: '10–60 s', media: { kind: 'video', src: '/create/formats/motion.mp4', poster: '/create/formats/motion.jpg' } },
  { key: '3d_render', title: '3D Render', desc: 'Cinematic 3D cutaways and slow camera moves, animated to the narration.', meta: '10–60 s', media: { kind: 'art' } },
];

const FACTS = ['Vertical 9:16, 1080p', 'Voiced, with word-by-word captions', 'Animated frame by frame by Claude'];

function Art({ k }: { k: FormatKey }) {
  return (
    <div className="absolute inset-0 bg-[#0c0c0c]">
      <div className="absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="absolute inset-0 flex items-center justify-center text-white/[0.16] group-hover:text-white/25 transition-colors duration-500">
        <FormatIcon k={k} size={72} />
      </div>
    </div>
  );
}

export function FormatGallery({ onOpen }: { onOpen: (k: FormatKey) => void }) {
  return (
    <div className="px-5 md:px-10 pt-10 pb-16 max-w-[1240px] mx-auto">
      <header className="flex items-end justify-between gap-6 mb-8">
        <div>
          <div className="text-[12px] text-[var(--fg-4)] mb-2">Reels studio</div>
          <h1 className="text-[30px] md:text-[38px] font-semibold tracking-[-0.035em] leading-[1.05]">What reel are we making?</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-3 max-w-[560px] leading-relaxed">
            Pick a format. Claude writes it, animates it frame by frame and hands you a finished vertical video for TikTok, Reels and Shorts.
          </p>
        </div>
        <span className="hidden md:block text-[12px] text-[var(--fg-4)] tabular-nums pb-1">{CARDS.length} formats · 9:16</span>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {CARDS.map(c => (
          <button key={c.key} type="button" onClick={() => onOpen(c.key)}
            className="group relative block w-full text-left rounded-[16px] border border-[var(--line)] bg-[var(--surface)] overflow-hidden transition-colors hover:border-[var(--line-3)] focus-visible:outline-none focus-visible:border-white">
            <div className="relative w-full" style={{ paddingTop: '177.78%' }}>
              {c.media.kind === 'video' ? (
                <video src={c.media.src} poster={c.media.poster} muted loop autoPlay playsInline preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]" />
              ) : <Art k={c.key} />}
              <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
              {c.tag && (
                <span className="absolute top-2.5 left-2.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/15">{c.tag}</span>
              )}
              <span className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/45 border border-white/15 flex items-center justify-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em] leading-tight">{c.title}</h3>
                  <span className="text-[11px] text-white/55 tabular-nums whitespace-nowrap">{c.meta}</span>
                </div>
                <p className="text-[12px] text-white/65 leading-snug mt-1 line-clamp-3">{c.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[var(--fg-4)]">
        {FACTS.map(f => (
          <span key={f} className="inline-flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[var(--fg-4)]" />{f}</span>
        ))}
      </div>
    </div>
  );
}
