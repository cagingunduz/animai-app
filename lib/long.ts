// Long videos (YouTube, 16:9): templates and the project shape the video server returns (long_pipeline.py).

export interface LongTemplate {
  key: string; title: string; tagline: string; desc: string; perMinute: number; minutes: number[]; defaultMinutes: number;
  voices: { id: string; label: string }[]; poster: string; ready: boolean; topicHint: string; ideas: string[]; uploads?: boolean;
  listed?: boolean;   // false: off the gallery and closed to new projects; projects already started keep working
  looks?: { id: string; label: string; desc: string; group?: string }[];
}
export const LONG_TEMPLATES: LongTemplate[] = [
  {
    key: 'flat-explainer', listed: false, title: 'Flat Explainer', tagline: 'Infographic-style animated explainers',
    desc: 'Full illustrated places, characters acting every line out, text typed on signs and boards, red X’s, date cards and counters. What-ifs, “why does X happen”, true stories, how things work.',
    perMinute: 250, minutes: [3, 5, 8, 10], defaultMinutes: 5, poster: '/long/flat-explainer.jpg', ready: true,
    topicHint: 'A what-if, a “why does X happen”, a true story or how something works.',
    ideas: ['What if you never slept?', 'Why do we yawn?', 'How does a nuclear submarine stay underwater for months?', 'The man who survived two atomic bombs', 'What if the Moon disappeared?'],
    voices: [{ id: 'pt_michael', label: 'Michael' }, { id: 'pt_george', label: 'George' }, { id: 'pt_charles', label: 'Charles' }, { id: 'pt_paul', label: 'Paul' }, { id: 'pt_alba', label: 'Alba' }],
  },
  {
    key: 'collage-doc-long', listed: false, title: 'Collage Documentary', tagline: 'True stories from real archive photos',
    desc: 'A real person or event told in chapters over real archive photos: a slow Ken Burns push, cut-outs, documents taped on paper, the real portrait, big words and hand-drawn rings. Every photo credited.',
    perMinute: 200, minutes: [3, 5, 8, 12], defaultMinutes: 5, poster: '/long/collage-doc.jpg', ready: true,
    topicHint: 'A person, an event or a moment in history. A name gets the whole story; add an angle to go deep on one part.',
    ideas: ['The life of Nikola Tesla', 'The sinking of the Titanic', 'Marie Curie', 'The race to the Moon', 'The fall of the Berlin Wall'],
    voices: [{ id: 'pt_michael', label: 'Michael' }, { id: 'pt_george', label: 'George' }, { id: 'pt_charles', label: 'Charles' }, { id: 'pt_paul', label: 'Paul' }, { id: 'pt_alba', label: 'Alba' }],
  },
  {
    key: 'doc-analysis', listed: false, title: 'Documentary Analysis', tagline: 'Real footage + AI scenes, analysed',
    desc: 'An event, a person or a system unpacked in chapters: real archive footage where it happened, AI scenes for hooks, concepts, maps and reconstructions, with title cards, lower thirds, counters, rings and timelines.',
    perMinute: 220, minutes: [5, 8, 12, 15], defaultMinutes: 8, poster: '/long/doc-analysis.jpg', ready: true, uploads: true,
    topicHint: 'An event, a decision, a company, a person or a system. A question works best (“How did one ship stop world trade?”).',
    ideas: ['How did one ship block the Suez Canal?', 'Why did Concorde stop flying?', 'How the 2008 crisis started', 'Why Chernobyl exploded', 'How Netflix beat Blockbuster'],
    voices: [{ id: 'pt_george', label: 'George' }, { id: 'pt_michael', label: 'Michael' }, { id: 'pt_charles', label: 'Charles' }, { id: 'pt_paul', label: 'Paul' }, { id: 'pt_alba', label: 'Alba' }],
  },
  {
    key: 'cinecode-film', title: 'Cinecode Film', tagline: 'Explainers drawn entirely in code',
    desc: 'No AI images and no stock: every shot is built in code in one of twenty film looks (explainers, 3D worlds, evidence films, print). Looks and craft rules from the open-source cinecode kit.',
    perMinute: 180, minutes: [3, 5, 8, 12], defaultMinutes: 5, poster: '/long/cinecode-film.jpg', ready: true,
    topicHint: 'How something works, why something happens, a number that tells a story, or a system explained.',
    ideas: ['How does a city get its water?', 'Why is everything so expensive?', 'How a jet engine works', 'How GPS knows where you are', 'Why bridges fall down'],
    voices: [{ id: 'pt_michael', label: 'Michael' }, { id: 'pt_george', label: 'George' }, { id: 'pt_charles', label: 'Charles' }, { id: 'pt_paul', label: 'Paul' }, { id: 'pt_alba', label: 'Alba' }],
    looks: [
      { group: 'Explainers', id: 'vox-explainer', label: 'Vox Explainer', desc: 'Paper cards, marker circles, condensed statements: a “why” answered on a desk.' },
      { group: 'Explainers', id: 'sticker-explainer', label: 'Sticker Explainer', desc: 'Flat icons and charts as stickers on one calm canvas, the camera gliding between facts.' },
      { group: 'Explainers', id: 'whiteboard', label: 'Whiteboard', desc: 'A lesson written and drawn live in marker on a glossy board.' },
      { group: 'Explainers', id: 'dataviz', label: 'Data Story', desc: 'Real data drawn mark by mark on cream paper, with handwritten notes.' },
      { group: 'Explainers', id: 'dark-keynote', label: 'Dark Keynote', desc: 'Near-black stage, UI panels, one accent and one giant number.' },
      { group: 'Explainers', id: 'swiss-motion', label: 'Swiss Motion', desc: 'A strict grid, one typeface, one signal colour.' },
      { group: '3D worlds', id: 'iso-infographic', label: 'Isometric Infographic', desc: 'A 3D isometric diorama of flat blocks with labels and real numbers.' },
      { group: '3D worlds', id: 'lowpoly-island', label: 'Low-poly World', desc: 'A tiny faceted 3D world where everything arrives with a bounce.' },
      { group: '3D worlds', id: 'tilt-shift', label: 'Tilt-shift Miniature', desc: 'A real-looking place shrunk to a sunny model, sharp in one band, time sped up.' },
      { group: '3D worlds', id: 'white-model', label: 'White City Model', desc: 'A white architectural model in a dark room, data projected onto it layer by layer.' },
      { group: '3D worlds', id: 'data-physical', label: 'Physical Data', desc: 'Numbers built as objects in metal, glass and wood on a studio sweep.' },
      { group: '3D worlds', id: 'teardown', label: 'Exploded Teardown', desc: 'A machine taken apart in the air, every part named and measured.' },
      { group: '3D worlds', id: 'hologram-hud', label: 'Hologram HUD', desc: 'Objects scanned into glowing wireframes, target boxes and rolling numbers.' },
      { group: 'Evidence films', id: 'archive-lighttable', label: 'Archive Light Table', desc: 'Negatives, prints and records on a backlit table, read through a loupe.' },
      { group: 'Evidence films', id: 'briefing-board', label: 'Briefing Board', desc: 'An investigation on a whiteboard wall: marker in three colours, tags and stamps.' },
      { group: 'Evidence films', id: 'satellite-briefing', label: 'Satellite Briefing', desc: 'Ground seen from orbit, a claim tested against one measured reading.' },
      { group: 'Evidence films', id: 'lidar-survey', label: 'Lidar Survey', desc: 'A landscape swept into a point cloud until what it hides is traced and measured.' },
      { group: 'Evidence films', id: 'blueprint', label: 'Blueprint', desc: 'White line drawings on cyanotype blue, drawn in drafting order.' },
      { group: 'Print', id: 'halftone-dossier', label: 'Halftone Dossier', desc: 'A case file in comic print: halftone dots, fat headlines, stamps.' },
      { group: 'Print', id: 'risograph', label: 'Risograph', desc: 'Two or three spot inks overprinting on warm paper, slightly off register.' },
    ],
  },
];
export const longTemplate = (k: string) => LONG_TEMPLATES.find(t => t.key === k && t.ready);
export const LISTED_TEMPLATES = LONG_TEMPLATES.filter(t => t.ready && t.listed !== false);   // only Cinecode Film for now
export const newProjectTemplate = (k: string) => LISTED_TEMPLATES.find(t => t.key === k);
// Remakes of an analysed video, by what the reference is made of (measured shot by shot): generated pictures + Claude's
// code graphics (the Documentary Analysis engine, off the gallery but kept for this), or animation built entirely in code
// (Cinecode Film). A short reel can stay short.
export const REMAKE_ENGINES = {
  images: { template: 'doc-analysis', label: 'Pictures + graphics', desc: 'New pictures in its style (Nano Banana); Claude builds the graphics and text' },
  animation: { template: 'cinecode-film', label: 'Animation only', desc: 'Every shot built and animated in code by Claude; no pictures' },
} as const;
export type RemakeEngine = keyof typeof REMAKE_ENGINES;
export const REMAKE_TEMPLATES: string[] = Object.values(REMAKE_ENGINES).map(e => e.template);
export const REMAKE_MINUTES = [1, 2, 3, 5, 8, 12, 15];

export interface LongLine { text: string; say?: string; mood?: string; pause?: number }
export interface LongShot { line: number; at?: string; place: string; cast?: string[]; props?: string[]; action: string; text?: string; marks?: string; show?: string[]; words?: string; ring?: string;
  build?: string; device?: string; camera?: string; data?: string;
  id?: string; layer?: 'A' | 'B' | 'G'; prompt?: string; search?: string; overlay?: string; lower?: { title?: string; sub?: string } | null; upload?: number; upload_at?: number }
export interface LongSection { id: string; title: string; lines: LongLine[]; shots: LongShot[]; mode?: 'real' | 'mixed' | 'animation' }
export interface LongPart {
  id: string; title: string; status: 'waiting' | 'working' | 'done'; voice_url?: string; video_url?: string; duration?: number;
  lines?: { text: string; start: number; end: number }[];
}
export interface LongAsset { url: string; layer?: 'A' | 'B'; kind: 'place' | 'character' | 'prop' | 'plate' | 'cutout' | 'document' | 'portrait' | 'image' | 'video'; boards?: { x: number; y: number; w: number; h: number }[]; use?: string; shows?: string; credit?: string }
export interface LongProject {
  id: string; template: string; template_name: string; topic: string; minutes: number; voice: string; look?: string; look_name?: string;
  reference?: { source: string; same_topic: boolean; look_name?: string; sheet?: string; duration?: number };
  status: 'planning' | 'awaiting_approval' | 'producing' | 'completed' | 'failed'; stage: string; message: string; progress: number;
  title: string | null; error: string | null; running: boolean; status_note?: string;
  plan: null | { title: string; description: string; places: { id: string; desc: string }[]; cast: { id: string; desc: string; poses: string[] }[]; props: { id: string; desc: string }[]; sections: LongSection[];
    pictures?: { id: string; kind: string; search: string; use?: string }[] };
  art_missing?: string[];
  assets: Record<string, LongAsset>; art_errors?: Record<string, string>; style_master?: string;
  parts: LongPart[]; final_video_url?: string; thumbnail_url?: string; duration?: number; created: number; updated: number;
}
export const WPS = 3.1;   // narration words per second (the plan is sized with it)
export const sectionSeconds = (s: LongSection, part?: LongPart) =>
  part?.duration || Math.max(8, s.lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0) / WPS);
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
