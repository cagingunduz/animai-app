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

export interface Plan { name: string; price: number; period: string; description: string; credits: string; features: string[]; highlighted?: boolean; cta: string; }
export const PLANS: Plan[] = [
  { name: 'Free', price: 0, period: '', description: 'Try AnimAI with no commitment.', credits: '500 credits included', features: ['500 free credits on signup', '480p resolution', 'Watermark on exports', 'Community voices'], cta: 'Current Plan' },
  { name: 'Starter', price: 15, period: '/ month', description: 'For creators just getting started.', credits: '5,000 credits / month', features: ['5,000 credits per month', 'Up to 720p resolution', 'No watermark', 'All voices', 'Credits never expire'], highlighted: true, cta: 'Upgrade' },
  { name: 'Pro', price: 49, period: '/ month', description: 'For serious creators and small studios.', credits: '20,000 credits / month', features: ['20,000 credits per month', 'Up to 1080p resolution', 'No watermark', 'Lip sync (premium)', 'Priority rendering', 'All voices'], cta: 'Upgrade' },
  { name: 'Studio', price: 149, period: '/ month', description: 'For studios and power users.', credits: '40,000 credits / month', features: ['40,000 credits per month', '1080p resolution', 'No watermark', 'Lip sync included', 'Priority rendering', 'Dedicated support'], cta: 'Contact Sales' },
];

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

export const MOCK_USAGE = [
  { date: '2026-03-12', description: 'Fox in Snowy Forest — 3 scenes, 720p', credits: 300 },
  { date: '2026-03-11', description: 'City Chase Scene — 5 scenes, 1080p + lip sync', credits: 1250 },
  { date: '2026-03-10', description: 'Space Station Dialog — 4 scenes, 480p', credits: 200 },
  { date: '2026-03-08', description: 'Credit top-up: 10,000 credits', credits: -10000 },
];
