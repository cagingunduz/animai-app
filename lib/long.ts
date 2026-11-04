// Long videos (YouTube, 16:9): templates and the project shape the video server returns (long_pipeline.py).

export interface LongTemplate {
  key: string; title: string; tagline: string; desc: string; perMinute: number; minutes: number[]; defaultMinutes: number;
  voices: { id: string; label: string }[]; poster: string; ready: boolean; topicHint: string; ideas: string[]; uploads?: boolean;
}
export const LONG_TEMPLATES: LongTemplate[] = [
  {
    key: 'flat-explainer', title: 'Flat Explainer', tagline: 'Infographic-style animated explainers',
    desc: 'Full illustrated places, characters acting every line out, text typed on signs and boards, red X’s, date cards and counters. What-ifs, “why does X happen”, true stories, how things work.',
    perMinute: 250, minutes: [3, 5, 8, 10], defaultMinutes: 5, poster: '/long/flat-explainer.jpg', ready: true,
    topicHint: 'A what-if, a “why does X happen”, a true story or how something works.',
    ideas: ['What if you never slept?', 'Why do we yawn?', 'How does a nuclear submarine stay underwater for months?', 'The man who survived two atomic bombs', 'What if the Moon disappeared?'],
    voices: [{ id: 'pt_michael', label: 'Michael' }, { id: 'pt_george', label: 'George' }, { id: 'pt_charles', label: 'Charles' }, { id: 'pt_paul', label: 'Paul' }, { id: 'pt_alba', label: 'Alba' }],
  },
  {
    key: 'collage-doc-long', title: 'Collage Documentary', tagline: 'True stories from real archive photos',
    desc: 'A real person or event told in chapters over real archive photos: a slow Ken Burns push, cut-outs, documents taped on paper, the real portrait, big words and hand-drawn rings. Every photo credited.',
    perMinute: 200, minutes: [3, 5, 8, 12], defaultMinutes: 5, poster: '/long/collage-doc.jpg', ready: true,
    topicHint: 'A person, an event or a moment in history. A name gets the whole story; add an angle to go deep on one part.',
    ideas: ['The life of Nikola Tesla', 'The sinking of the Titanic', 'Marie Curie', 'The race to the Moon', 'The fall of the Berlin Wall'],
    voices: [{ id: 'pt_michael', label: 'Michael' }, { id: 'pt_george', label: 'George' }, { id: 'pt_charles', label: 'Charles' }, { id: 'pt_paul', label: 'Paul' }, { id: 'pt_alba', label: 'Alba' }],
  },
  {
    key: 'doc-analysis', title: 'Documentary Analysis', tagline: 'Real footage + AI scenes, analysed',
    desc: 'An event, a person or a system unpacked in chapters: real archive footage where it happened, AI scenes for hooks, concepts, maps and reconstructions, with title cards, lower thirds, counters, rings and timelines.',
    perMinute: 220, minutes: [5, 8, 12, 15], defaultMinutes: 8, poster: '/long/doc-analysis.jpg', ready: true, uploads: true,
    topicHint: 'An event, a decision, a company, a person or a system. A question works best (“How did one ship stop world trade?”).',
    ideas: ['How did one ship block the Suez Canal?', 'Why did Concorde stop flying?', 'How the 2008 crisis started', 'Why Chernobyl exploded', 'How Netflix beat Blockbuster'],
    voices: [{ id: 'pt_george', label: 'George' }, { id: 'pt_michael', label: 'Michael' }, { id: 'pt_charles', label: 'Charles' }, { id: 'pt_paul', label: 'Paul' }, { id: 'pt_alba', label: 'Alba' }],
  },
  {
    key: 'whiteboard-long', title: 'Whiteboard Lesson', tagline: 'A full lesson, drawn live', desc: 'The Whiteboard Explainer, as a 5-15 minute lesson.',
    perMinute: 0, minutes: [], defaultMinutes: 0, voices: [], poster: '/create/formats/whiteboard.jpg', ready: false, topicHint: '', ideas: [],
  },
];
export const longTemplate = (k: string) => LONG_TEMPLATES.find(t => t.key === k && t.ready);

export interface LongLine { text: string; say?: string; mood?: string; pause?: number }
export interface LongShot { line: number; at?: string; place: string; cast?: string[]; props?: string[]; action: string; text?: string; marks?: string; show?: string[]; words?: string; ring?: string;
  id?: string; layer?: 'A' | 'B'; prompt?: string; search?: string; overlay?: string; lower?: { title?: string; sub?: string } | null; upload?: number; upload_at?: number }
export interface LongSection { id: string; title: string; lines: LongLine[]; shots: LongShot[]; mode?: 'real' | 'mixed' | 'animation' }
export interface LongPart {
  id: string; title: string; status: 'waiting' | 'working' | 'done'; voice_url?: string; video_url?: string; duration?: number;
  lines?: { text: string; start: number; end: number }[];
}
export interface LongAsset { url: string; layer?: 'A' | 'B'; kind: 'place' | 'character' | 'prop' | 'plate' | 'cutout' | 'document' | 'portrait' | 'image' | 'video'; boards?: { x: number; y: number; w: number; h: number }[]; use?: string; shows?: string; credit?: string }
export interface LongProject {
  id: string; template: string; template_name: string; topic: string; minutes: number; voice: string;
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
