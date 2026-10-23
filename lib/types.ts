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
    ['Motion Graphics / 3D', Math.floor(credits / motionCost(15)), '× 15 s'],
    ['Whiteboard', Math.floor(credits / whiteboardCost(1)), 'min'],
    ['Animated Story', Math.floor(credits / animatedStoryCost(1, '720p')), 'min'],
    ['Fruit Drama', Math.floor(credits / fruitDramaCost(5, '720p', 8)), '× 5 scenes'],
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
