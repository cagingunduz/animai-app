// Creation formats + their line icons. Used by the sidebar, Home, Create and the mobile page.

export type FormatKey = 'story' | 'cartoon' | 'animated' | 'whiteboard' | 'fruit_drama' | 'motion' | '3d_render' | 'build3d' | 'health3d' | 'explainer' | 'survival' | 'block'
  | 'scifi_toon' | 'paper_lantern' | 'teardown' | 'caption_news' | 'telestrator' | 'premium';

// Animave makes vertical reels that Claude animates frame by frame. Only these formats are on the site; the
// others (story, cartoon, animated, fruit_drama) keep their code but are hidden. Whiteboard is now the Style Studio's
// Whiteboard Explainer; it and the other Studio styles share one form (StudioStyle.tsx).
export const FORMATS: { key: FormatKey; title: string; tagline: string; desc: string; badge?: string }[] = [
  { key: 'explainer', title: 'Explainer', tagline: 'Talking-host explainer reels', desc: 'A cartoon host explains any topic in 30-60 seconds, with cards, counters and demos.', badge: 'New' },
  { key: 'build3d', title: '3D Build', tagline: 'Backyard 3D explainers', desc: 'A yard cut open like a cake: a narrator builds an everyday thing step by step, in 3D.', badge: 'New' },
  { key: 'health3d', title: '3D Health', tagline: 'Inside-the-body explainers', desc: 'An x-ray body, glowing organs and a blood vessel cut open: what your body does, step by step.', badge: 'New' },
  { key: 'block', title: 'Block Horror', tagline: 'Blocky night-town horror', desc: 'A rule the whole town obeys, a kid who breaks it and the tall thing in the dark, in a blocky game look.', badge: 'New' },
  { key: 'premium', title: 'Premium Faceless', tagline: 'Kinetic type + live UI', desc: 'Your message typed on letter by letter, a live UI diagram for every line, glossy depth and your handle at the end.', badge: 'New' },
  { key: 'caption_news', title: 'Caption News', tagline: 'Sound-off news reels', desc: 'Real footage under huge captions, rolling numbers and a source on every figure. Your clips or open archives.', badge: 'New' },
  { key: 'telestrator', title: 'Sports Telestrator', tagline: 'Match analysis on your clip', desc: 'Rewind, freeze and draw on your own match footage: rings, arrows and the space nobody covered.', badge: 'New' },
  { key: 'teardown', title: 'Exploded Teardown', tagline: 'Products taken apart in 3D', desc: 'A studio-lit product lifts apart layer by layer while the camera orbits and every part gets its label.', badge: 'New' },
  { key: 'whiteboard', title: 'Whiteboard Explainer', tagline: 'Drawn live on a whiteboard', desc: 'Markers draw your topic live in real handwriting while a narrator explains it, the camera gliding across the board.', badge: 'New' },
  { key: 'paper_lantern', title: 'Paper-cut Lightbox', tagline: 'Stories in backlit paper', desc: 'A storyteller and a shadow-box lamp: layers of cut paper, lit windows and moonlight, for tales and memories.', badge: 'New' },
  { key: 'scifi_toon', title: 'Sci-Fi Sitcom Toon', tagline: 'Portal-hopping cartoon comedy', desc: 'A deadpan genius and his nervous sidekick take your topic to absurd parallel worlds. Three voices, lip-synced.', badge: 'New' },
  { key: 'survival', title: 'Survival Story', tagline: 'Stickman thriller reels', desc: 'Imagine you… A stickman survival thriller in real 3D sets: rules on screen, a twist, and a choice for the comments.', badge: 'New' },
  { key: 'motion', title: 'Motion Graphics', tagline: 'Code-animated design', desc: 'Kinetic type, charts and diagrams, animated in code and timed to the voice.' },
  { key: '3d_render', title: '3D Render', tagline: 'Cinematic 3D shorts', desc: 'Cinematic 3D cutaways, close-ups and slow camera moves, animated to the narration.' },
];
export const isLiveFormat = (k: string): k is FormatKey => FORMATS.some(f => f.key === k);

const PATHS: Record<FormatKey, JSX.Element> = {
  story: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M3 15h18" /></>,
  cartoon: <><rect x="3" y="5" width="5" height="14" rx="1" /><rect x="10" y="5" width="4" height="14" rx="1" /><rect x="16" y="5" width="5" height="14" rx="1" /></>,
  animated: <><circle cx="12" cy="9" r="3.5" /><path d="M5.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /></>,
  whiteboard: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M7 13c2-4 4-4 5-2s3 2 5-2M12 17v3M8 21h8" /></>,
  fruit_drama: <><path d="M12 7c4 0 7 2.8 7 7s-3 7-7 7-7-2.8-7-7 3-7 7-7Z" /><path d="M12 7c0-2 1-3.5 3-4" /></>,
  motion: <><path d="M4 17c3.5 0 4.5-10 8-10s4.5 10 8 10" /><circle cx="12" cy="7" r="1.6" /><path d="M4 20h16" /></>,
  '3d_render': <><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" /></>,
  build3d: <><path d="M7 11V7.5L11 4l4 3.5V11" /><path d="M3 11h18M3 15h18M3 19h18" /><path d="M10 11v8h5v-8" /></>,
  explainer: <><rect x="3" y="4" width="12" height="9" rx="2" /><path d="M6 8h6M6 10.5h3.5" /><circle cx="18" cy="14" r="3" /><path d="M13.5 21c.6-2.4 2.4-3.6 4.5-3.6s3.9 1.2 4.5 3.6" /></>,
  health3d: <><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /><path d="M5.5 12h3l1.5-2.5 2 5 1.5-2.5h5" /></>,
  block: <><rect x="8" y="3" width="8" height="7" rx="1.5" /><path d="M10.5 6h.01M13.5 6h.01M10.5 8h3" /><rect x="7" y="10" width="10" height="7" rx="1" /><path d="M9 17v4M15 17v4" /></>,
  premium: <><rect x="4" y="9" width="16" height="11" rx="2.5" /><path d="M7 16l3-3 2 2 4-4" /><path d="M7 5h10M9 2.5h6" /></>,
  caption_news: <><rect x="3" y="4" width="18" height="11" rx="1.5" /><path d="M5 18h10M5 21h6" /><rect x="15" y="17" width="5" height="4" rx=".5" /></>,
  telestrator: <><rect x="3" y="4" width="18" height="16" rx="2" /><ellipse cx="9" cy="15" rx="3" ry="1.2" /><path d="M10 12c3-1 5-3 6-6M16 6l-2.5.2M16 6l.3 2.4" /></>,
  teardown: <><rect x="6" y="3" width="12" height="3" rx="1" /><rect x="6" y="10" width="12" height="3" rx="1" /><rect x="6" y="17" width="12" height="3" rx="1" /><path d="M12 6.5v3M12 13.5v3" /></>,
  paper_lantern: <><path d="M4 20h16V6H4z" /><path d="M4 15c3-3 5-1 8-4s5-2 8-1" /><circle cx="16" cy="9" r="1.4" /><path d="M7 20v-3h2v3" /></>,
  scifi_toon: <><ellipse cx="12" cy="12" rx="5" ry="7" /><path d="M12 7c1.6 1.5 1.6 8.5 0 10M9.5 9.5c1.5.8 3.5.8 5 0" /><path d="M4 5l2 2M20 5l-2 2" /></>,
  survival: <><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-7h6v7" /><circle cx="12" cy="9" r="1.2" /></>,
};

export function FormatIcon({ k, size = 16, className = '' }: { k: FormatKey; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[k]}
    </svg>
  );
}
