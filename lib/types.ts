export type AnimationStyle = 'western-cartoon' | 'anime' | 'pixar' | 'comic' | 'chibi' | 'retro' | 'custom';

export const STYLE_LABELS: Record<AnimationStyle, string> = {
  'western-cartoon': 'Western Cartoon', anime: 'Anime', pixar: 'Pixar',
  comic: 'Comic', chibi: 'Chibi', retro: 'Retro', custom: 'Custom',
};

export type Resolution = '480p' | '720p' | '1080p';
export const RESOLUTION_CREDITS: Record<Resolution, number> = { '480p': 50, '720p': 100, '1080p': 200 };
export const STORYBOOK_CREDITS_PER_SCENE = 50; // 500 credits = 10 scenes ≈ 2 short videos

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
