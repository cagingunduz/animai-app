export type AnimationStyle = 'western-cartoon' | 'anime' | 'pixar' | 'comic' | 'chibi' | 'retro' | 'custom';

export const STYLE_LABELS: Record<AnimationStyle, string> = {
  'western-cartoon': 'Western Cartoon', anime: 'Anime', pixar: 'Pixar',
  comic: 'Comic', chibi: 'Chibi', retro: 'Retro', custom: 'Custom',
};

export type Resolution = '480p' | '720p' | '1080p';
export const RESOLUTION_CREDITS: Record<Resolution, number> = { '480p': 50, '720p': 100, '1080p': 200 };
export const STORYBOOK_CREDITS_PER_SCENE = 50; // 500 credits = 10 scenes ≈ 2 short videos

// ─── Animated Storytelling pricing ───
// Billing basis: 1 credit ≈ $0.0032 (2,500-credit pack = $8). We charge 1.8× our cost.
// Real per-scene cost (image + prunaai/p-video + ElevenLabs + Whisper). 1080p costs 2×.
//   720p = $0.12 → 1.8× = $0.216 ≈ 68 credits | 1080p = $0.24 → 1.8× = $0.432 ≈ 135 credits
export const ANIMATED_STORY_CREDITS_PER_SCENE: Record<'720p' | '1080p', number> = { '720p': 68, '1080p': 135 };
// Mirror of the backend DURATION_SCENE_MAP (prompt_generator.py)
export const DURATION_SCENE_MAP: Record<number, number> = { 1: 10, 2: 18, 3: 26, 5: 40, 10: 80 };

export function animatedStoryCost(durationMinutes: number, resolution: string, sceneCount?: number): number {
  const scenes = sceneCount && sceneCount > 0 ? sceneCount : (DURATION_SCENE_MAP[durationMinutes] ?? 10);
  const tier: '720p' | '1080p' = resolution === '1080p' || resolution === '2k' ? '1080p' : '720p';
  return scenes * ANIMATED_STORY_CREDITS_PER_SCENE[tier];
}

// ─── Whiteboard Animation pricing ───
// No video model (just a line-art image + ffmpeg reveal + narration), so much cheaper.
// Real per-scene cost ≈ $0.065 → 1.8× = $0.117 ≈ 36 credits. Flat across resolutions.
export const WHITEBOARD_SCENE_MAP: Record<number, number> = { 1: 5, 2: 9, 3: 13, 5: 20, 10: 38 };
export const WHITEBOARD_CREDITS_PER_SCENE = 36;
export function whiteboardCost(durationMinutes: number, sceneCount?: number): number {
  const scenes = sceneCount && sceneCount > 0 ? sceneCount : (WHITEBOARD_SCENE_MAP[durationMinutes] ?? 5);
  return scenes * WHITEBOARD_CREDITS_PER_SCENE;
}

// ─── Fruit Drama pricing ───
// Veo 3.1 Lite is billed per video second; character/scene images add a small fixed cost.
export const FRUIT_DRAMA_CREDITS_PER_SCENE: Record<'720p' | '1080p', number> = { '720p': 260, '1080p': 410 };
export const FRUIT_DRAMA_SETUP_CREDITS = 100;
export function fruitDramaSceneCost(resolution: string, durationSeconds: number = 8): number {
  const tier: '720p' | '1080p' = resolution === '1080p' ? '1080p' : '720p';
  const seconds = tier === '1080p' ? 8 : Math.max(4, Math.min(8, durationSeconds || 8));
  return Math.ceil(FRUIT_DRAMA_CREDITS_PER_SCENE[tier] * (seconds / 8));
}
export function fruitDramaCost(sceneCount: number, resolution: string, durationSeconds: number = 8): number {
  const scenes = Math.max(1, Math.min(10, sceneCount || 5));
  return FRUIT_DRAMA_SETUP_CREDITS + scenes * fruitDramaSceneCost(resolution, durationSeconds);
}

// ─── Motion Graphics / 3D Render pricing ───
// Measured real cost ≈ $0.02-0.03 per output second (Claude ≈ $0.021/s + narration + render).
// Priced at ≈ $0.10/s to the customer: 31 credits/s → a 15 s video = 465 credits ≈ $1.49.
// Each job reports its real token cost (usage.cost_usd) so this can be tuned.
export const MOTION_CREDITS_PER_SECOND = 31;
export const MOTION_DURATIONS = [10, 15, 30, 60] as const;
export function motionCost(seconds: number): number {
  return Math.max(5, Math.round(seconds)) * MOTION_CREDITS_PER_SECOND;
}

// ─── 3D Build pricing (one 60-75 s vertical video) ───
// Estimated cost ≈ $0.50-0.75 per video: Claude Sonnet writes the script and the 3D scene and reviews stills;
// the narrator (Kokoro) and the CPU render run on our own servers. 500 credits ≈ $1.60.
export const BUILD3D_CREDITS = 500;

// ─── Explainer pricing (one 30-60 s reel) ───
// Estimated cost ≈ $0.05-0.15: Claude writes the script and plans the cards; the narrator (Kokoro) and the 2D render
// run on our servers. 200 credits ≈ $0.64.
export const EXPLAINER_CREDITS = 200;

// ─── Block Horror pricing (one 40-50 s Short) ───
// Estimated cost ≈ $0.30-0.60: Claude writes the script and a ~36-shot scene and reviews stills; the narrator
// (Kokoro) and the CPU render run on our servers. 400 credits ≈ $1.28.
export const BLOCK_CREDITS = 400;

// ─── Recipe pricing (one 25-45 s reel) ───
// Estimated cost ≈ $0.02-0.05: one Claude call plans the recipe; the narrator (Kokoro), the 2D render and the sound
// mixing run on our servers. 200 credits ≈ $0.64.
export const RECIPE_CREDITS = 200;

// ─── Survival Story pricing (one 60-90 s vertical video) ───
// Estimated cost ≈ $0.60-1.00 per video: Claude Sonnet writes the story and the film code and reviews 6 stills;
// the voices (Kokoro), the sound (made in code) and the CPU render (≈ 6-10 min of render-service time) run on our own
// servers. 600 credits ≈ $1.90. Each job reports its real token cost (usage.cost_usd) so this can be tuned.
export const SURVIVAL_CREDITS = 600;

// ─── Style Studio (styles from github.com/lemomo-ai/lemo-opuscar, MIT): one pipeline, one form, per-style config ───
// Claude writes the script and the animation code on the style's kit; Kokoro voices, foley made in code and the CPU
// render run on our servers. Prices follow each style's render time (three.js styles render slowest).
export type StudioFormat = 'whiteboard' | 'scifi_toon' | 'paper_lantern' | 'teardown' | 'caption_news' | 'telestrator' | 'premium' | 'collage_doc';
export interface StudioStyleConfig {
  format: StudioFormat; style: string; title: string; credits: number;
  intro: string; desc: string; topicLabel: string; topicHint: string; placeholder: string;
  ideas: string[]; seconds: number[]; defaultSeconds: number;
  uploads: 'none' | 'optional' | 'required'; uploadHint?: string; facts: [string, string][]; eta: string;
  // per-style choices sent as `options` (the backend checks them against the style)
  options?: { accent?: string[]; handle?: boolean; voices?: { id: string; label: string }[]; audience?: boolean; audienceHint?: string };
}
export const STUDIO_STYLES: Record<StudioFormat, StudioStyleConfig> = {
  collage_doc: {
    format: 'collage_doc', style: 'collage-doc', title: 'Collage Documentary', credits: 400,
    intro: 'Whose story should we tell?', desc: 'A short documentary about a real person or moment, made like a hand-made collage: archival photos, paper cut-outs with real shadows, the real portrait, big serif words on the voice and hand-drawn rings. Every line is fact-checked before it is recorded; the pictures are real archive photos, credited.',
    topicLabel: 'Person or moment', topicHint: 'A name gets their life story. Add an angle (an event, a question) to go deep on one moment.', placeholder: 'The life of Nikola Tesla',
    ideas: ['The life of Nikola Tesla', 'Marie Curie', 'How the Titanic was found', 'Ada Lovelace, the first programmer', 'The rise and fall of Napoleon'],
    seconds: [30, 40, 45, 60], defaultSeconds: 45, uploads: 'none',
    options: {
      audience: true, audienceHint: 'History lovers, students',
      voices: [{ id: 'pt_michael', label: 'Michael' }, { id: 'pt_george', label: 'George' }, { id: 'pt_charles', label: 'Charles' }, { id: 'pt_paul', label: 'Paul' }, { id: 'pt_alba', label: 'Alba' }, { id: 'am_michael', label: 'Michael (classic)' }, { id: 'af_heart', label: 'Heart (classic)' }],
    },
    facts: [['Vertical', '9:16 · 1080p'], ['Look', 'Paper collage'], ['Faces', 'Real portraits only'], ['Script', 'Fact-checked']], eta: 'About 5–8 minutes.',
  },
  premium: {
    format: 'premium', style: 'premium', title: 'Premium Faceless Reel', credits: 300,
    intro: 'What should your reel say?', desc: 'A premium faceless reel for your brand: every line types on letter by letter, with a live UI diagram that proves it, glossy cards, one accent colour, a camera that never stops, techy sound and your handle at the end.',
    topicLabel: 'Topic', topicHint: 'Your message, offer or lesson. A hook-problem-cost-reframe-proof-punch script is written from it.', placeholder: 'Why most landing pages don\u2019t convert',
    ideas: ['Why most landing pages don\u2019t convert', 'Pick a niche or stay cheap', 'Why your emails go unread', 'The one metric founders ignore', 'Stop posting every day'],
    seconds: [20, 25, 30, 40], defaultSeconds: 25, uploads: 'none',
    options: {
      accent: ['#5B21B6', '#2563EB', '#059669', '#DC2626', '#EA580C', '#DB2777', '#0F172A'],
      handle: true, audience: true,
      voices: [{ id: 'am_michael', label: 'Michael' }, { id: 'am_adam', label: 'Adam' }, { id: 'bm_george', label: 'George' }, { id: 'af_heart', label: 'Heart' }, { id: 'af_bella', label: 'Bella' }, { id: 'bf_emma', label: 'Emma' }],
    },
    facts: [['Vertical', '9:16 · 1080p'], ['Type', 'Letter by letter'], ['Visuals', 'Live UI diagrams'], ['End card', 'Your @handle']], eta: 'About 4–6 minutes.',
  },
  whiteboard: {
    format: 'whiteboard', style: 'whiteboard', title: 'Whiteboard Explainer', credits: 300,
    intro: 'What should we draw?', desc: 'A narrator explains one idea while markers draw it live on a whiteboard: real handwriting, arrows, numbers, the camera gliding across the board.',
    topicLabel: 'Topic', topicHint: 'A question works best. Leave it empty and we pick one.', placeholder: 'How does a microwave heat food?',
    ideas: ['How does a microwave heat food?', 'Why is the sky blue?', 'How do vaccines train your body?', 'How does compound interest work?', 'Why do we have leap years?'],
    seconds: [45, 60, 75, 90], defaultSeconds: 60, uploads: 'none',
    facts: [['Vertical', '9:16 · 1080p'], ['Drawing', 'Marker by marker'], ['Captions', 'Word-timed'], ['Sound', 'Marker foley + music']], eta: 'About 6–10 minutes.',
  },
  scifi_toon: {
    format: 'scifi_toon', style: 'scifi-toon', title: 'Sci-Fi Sitcom Toon', credits: 350,
    intro: 'What should Vask and Gary get into?', desc: 'An adult-swim-style sci-fi sitcom with our own cast: a deadpan genius, his nervous sidekick and a talking coffee cup, portal-hopping to worlds where your topic is taken to the extreme.',
    topicLabel: 'Topic or premise', topicHint: 'A question, a fact or a petty errand. Leave it empty and they improvise.', placeholder: 'Why is the sky blue?',
    ideas: ['Why is the sky blue?', 'Where does the Wi-Fi go at night?', 'Gary forgot to buy milk', 'What if gravity were half as strong?', 'Why do cats knock things over?'],
    seconds: [35, 45, 60, 75], defaultSeconds: 45, uploads: 'none',
    facts: [['Vertical', '9:16 · 1080p'], ['Cast', '3 voices, lip-synced'], ['Look', 'Boiling ink lines'], ['Sound', 'Cartoon foley + music']], eta: 'About 5–8 minutes.',
  },
  paper_lantern: {
    format: 'paper_lantern', style: 'paper-lantern', title: 'Paper-cut Lightbox', credits: 350,
    intro: 'What story should the lamp tell?', desc: 'A storyteller narrates while backlit sheets of cut paper glow in a shadow-box lamp: lit windows, moons, mountains, small silhouettes, slow dollies between the layers.',
    topicLabel: 'Story', topicHint: 'A tale, a memory, a legend, or your own story. Leave it empty and we write one.', placeholder: 'An old lighthouse keeper waits for her son to come home',
    ideas: ['An old lighthouse keeper waits for her son', 'The night the whole village lit its lanterns', 'A fox who collected moonlight', 'How the first bridge over the river was built', 'A letter that took forty years to arrive'],
    seconds: [45, 60, 75, 90], defaultSeconds: 60, uploads: 'none',
    facts: [['Vertical', '9:16 · 1080p'], ['Look', 'Backlit cut paper'], ['Voice', 'Warm storyteller'], ['Sound', 'Folk music + paper foley']], eta: 'About 6–10 minutes.',
  },
  teardown: {
    format: 'teardown', style: 'teardown', title: 'Exploded Teardown', credits: 500,
    intro: 'What should we take apart?', desc: 'A product lit like a studio packshot, lifted apart layer by layer while the camera orbits; every part named with a leader line, a real dimension drawn on the object.',
    topicLabel: 'Product', topicHint: 'Any physical object. Built as a model from published sizes.', placeholder: 'A wireless mouse',
    ideas: ['A wireless mouse', 'A smoke detector', 'A game controller', 'An electric toothbrush', 'A smartphone'],
    seconds: [35, 45, 60, 75], defaultSeconds: 45, uploads: 'none',
    facts: [['Vertical', '9:16 · 1080p'], ['Render', 'Real 3D, studio light'], ['Labels', 'On the parts'], ['Sound', 'Material foley + mallets']], eta: 'About 10–15 minutes (3D renders slowly).',
  },
  caption_news: {
    format: 'caption_news', style: 'caption-news', title: 'Caption News', credits: 400,
    intro: 'What is the story?', desc: 'Sound-off social news: real footage under huge captions slammed in a chunk at a time, numbers that roll, a source on every figure, one turn. Your own footage, or openly licensed archive footage found for you.',
    topicLabel: 'News topic', topicHint: 'A trend, a number, a question. Facts are kept to what is well established.', placeholder: 'Why hurricanes are getting stronger',
    ideas: ['Why hurricanes are getting stronger', 'Where honey bees went', 'The rise of electric cars in numbers', 'Why coffee prices keep climbing', 'How much plastic is in the ocean'],
    seconds: [30, 45, 60, 75], defaultSeconds: 45, uploads: 'optional',
    uploadHint: 'Optional: your own clips or photos (MP4, MOV, JPG, PNG). Without uploads we use openly licensed archive footage (Wikimedia Commons, NASA), credited on screen.',
    facts: [['Vertical', '9:16 · 1080p'], ['Footage', 'Yours or open archives'], ['Captions', 'Huge, sound-off'], ['Credits', 'On every shot']], eta: 'About 8–12 minutes.',
  },
  telestrator: {
    format: 'telestrator', style: 'telestrator', title: 'Sports Telestrator', credits: 400,
    intro: 'Which play should we break down?', desc: 'The TV analysis segment on your own match clip: play it, rewind, freeze, draw rings, arrows and the open space on the picture, slow motion, play on.',
    topicLabel: 'What to look at', topicHint: 'Optional: the move, the team you follow, the score. We find the key moment in the clip.', placeholder: 'How we created the overload on the right wing',
    ideas: ['How the goal was built', 'Why the defence opened up', 'The overload on the wing', 'Pressing after losing the ball'],
    seconds: [30, 45, 60, 75], defaultSeconds: 45, uploads: 'required',
    uploadHint: 'Your match clip (MP4 or MOV, a wide camera angle works best, 10–60 s around the play). Only use footage you have the rights to.',
    facts: [['Vertical', '9:16 · 1080p'], ['Edit', 'Play · rewind · freeze'], ['Drawing', 'Rings, arrows, space'], ['Sound', 'Studio show + foley']], eta: 'About 6–10 minutes.',
  },
};

export type CharacterRole = 'silent' | 'speaking';
export type Framing = 'full-body' | 'half-body' | 'close-up';
export type AnimationStatus = 'completed' | 'processing' | 'failed' | 'queued';
export type SceneStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Voice { id: string; name: string; gender: 'male' | 'female'; accent: string; age: string; preview_url: string; }
export interface Character { id: string; name: string; description: string; style: AnimationStyle; photo_url?: string; }
export interface SceneCharacter { character_id: string; role: CharacterRole; dialogue?: string; voice_id?: string; voice_name?: string; framing: Framing; }
export interface Scene { id: string; number: number; description: string; characters: SceneCharacter[]; pre_dialogue_action?: string; }

export interface Animation {
  id: string; title: string; status: AnimationStatus; created_at: string;
  scenes_count: number; resolution: Resolution; job_id?: string;
}

export interface SceneRenderStatus { scene_number: number; status: SceneStatus; current_step?: string; video_url?: string; }

export interface CreditPack { credits: number; price: number; label: string; }
export const CREDIT_PACKS: CreditPack[] = [
  { credits: 2500, price: 8, label: '2,500 credits' },
  { credits: 10000, price: 28, label: '10,000 credits' },
  { credits: 30000, price: 75, label: '30,000 credits' },
];

// Every plan unlocks every format, 1080p and all voices; plans differ only in credits.
export interface Plan { name: string; price: number; period: string; description: string; credits: number; features: string[]; highlighted?: boolean; cta: string; }
export const PLANS: Plan[] = [
  { name: 'Free', price: 0, period: '', description: 'Try every format with no commitment.', credits: 500, features: ['500 credits on signup', 'Every format', 'Up to 1080p', 'All voices'], cta: 'Downgrade' },
  { name: 'Starter', price: 15, period: '/ month', description: 'For creators just getting started.', credits: 5000, features: ['5,000 credits every month', 'Every format', 'Up to 1080p', 'All voices', 'Credits never expire'], highlighted: true, cta: 'Upgrade' },
  { name: 'Pro', price: 49, period: '/ month', description: 'For regular creators and small studios.', credits: 20000, features: ['20,000 credits every month', 'Every format', 'Up to 1080p', 'All voices', 'Credits never expire'], cta: 'Upgrade' },
  { name: 'Studio', price: 149, period: '/ month', description: 'For studios and power users.', credits: 60000, features: ['60,000 credits every month', 'Every format', 'Up to 1080p', 'All voices', 'Credits never expire'], cta: 'Contact Sales' },
];

// What a number of credits makes at today's prices (shown on the plan cards).
export function creditExamples(credits: number): { label: string; amount: string }[] {
  const rows: [string, number, string][] = [
    ['Explainer', Math.floor(credits / EXPLAINER_CREDITS), 'reels'],
    ['3D Build / 3D Health', Math.floor(credits / BUILD3D_CREDITS), 'reels'],
    ['Block Horror', Math.floor(credits / BLOCK_CREDITS), 'reels'],
    ['Recipe', Math.floor(credits / RECIPE_CREDITS), 'reels'],
    ['Motion Graphics / 3D', Math.floor(credits / motionCost(15)), '× 15 s'],
    ['Survival Story', Math.floor(credits / SURVIVAL_CREDITS), 'reels'],
    ['Style Studio', Math.floor(credits / 350), 'reels'],
  ];
  return rows.filter(([, n]) => n > 0).map(([label, n, unit]) => ({ label, amount: `${n.toLocaleString()} ${unit}` }));
}

export const MOCK_VOICES: Voice[] = [
  { id: 'v1', name: 'Alex', gender: 'male', accent: 'American', age: 'Young Adult', preview_url: '' },
  { id: 'v2', name: 'Sofia', gender: 'female', accent: 'British', age: 'Adult', preview_url: '' },
  { id: 'v3', name: 'Marcus', gender: 'male', accent: 'British', age: 'Adult', preview_url: '' },
  { id: 'v4', name: 'Yuki', gender: 'female', accent: 'Other', age: 'Young Adult', preview_url: '' },
  { id: 'v5', name: 'James', gender: 'male', accent: 'American', age: 'Senior', preview_url: '' },
  { id: 'v6', name: 'Priya', gender: 'female', accent: 'Other', age: 'Young Adult', preview_url: '' },
  { id: 'v7', name: 'Noah', gender: 'male', accent: 'American', age: 'Young Adult', preview_url: '' },
  { id: 'v8', name: 'Elena', gender: 'female', accent: 'Other', age: 'Adult', preview_url: '' },
  { id: 'v9', name: 'Oliver', gender: 'male', accent: 'British', age: 'Young Adult', preview_url: '' },
  { id: 'v10', name: 'Mia', gender: 'female', accent: 'American', age: 'Adult', preview_url: '' },
];
