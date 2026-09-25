'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type Resolution, RESOLUTION_CREDITS, STORYBOOK_CREDITS_PER_SCENE } from '@/lib/types';
import AnimatedStorytelling from './AnimatedStorytelling';
import WhiteboardAnimation from './WhiteboardAnimation';
import FruitDrama from './FruitDrama';
import StudioGenerationView from './StudioGenerationView';
import { FORMATS, FormatIcon, type FormatKey } from '@/components/FormatArt';
import { EditorHeader, EditorPage, Intro, Section, Label, Segmented, StyleCard, ToggleRow, TextArea, VoiceGrid, ActionBar, Credits, Modal, ErrorNote, Spinner, AspectGlyph, Ico, StatusDot } from '@/components/editor/kit';

type AnimStyle = 'western-cartoon' | 'anime' | 'pixar' | 'comic' | 'retro' | 'custom';
type AspectRatio = '16:9' | '9:16' | '1:1';

interface VoiceLabels { gender?: string; accent?: string; age?: string; use_case?: string; descriptive?: string; }
interface Voice { voice_id: string; name: string; preview_url: string; labels: VoiceLabels; }
interface CharDef { id: string; name: string; prompt: string; style: AnimStyle; voiceId?: string; voiceName?: string; imageUrl?: string; characterText?: string; }
interface SceneCharRef { characterId: string; role: 'speaking' | 'silent'; dialogue: string; }

interface CharPlacement {
  slot: number; characterId: string | null;
  role: 'speaking' | 'silent'; dialogue: string;
}

interface SceneBg {
  id: string; description: string; photoUrl: string | null;
}

interface SceneDef {
  id: string; description: string; aspectRatio: AspectRatio; characters: SceneCharRef[];
  generating: boolean; approved: boolean; imageUrl: string | null; error: string | null;
  backgrounds: SceneBg[]; selectedBackgroundId: string | null; expandedBgId: string | null;
  characterPlacements: CharPlacement[];
}
type SceneRenderStatus = { scene_number: number; status: 'queued' | 'processing' | 'completed' | 'failed'; current_step?: string; video_url?: string; };

// ─── Story Mode types ───
type CreateMode = 'selecting' | 'theme_select' | 'story' | 'cartoon' | 'animated' | 'whiteboard' | 'fruit_drama';
type StoryTheme = 'true_crime' | 'history' | 'drama' | 'fairy_tale' | 'custom';
type StoryGenre = 'drama' | 'fairy-tale' | 'horror' | 'action' | 'motivation' | 'comedy' | 'mystery';
interface ScriptScene { id: string; sceneNumber: number; title: string; narratorText: string; sceneDescription: string; imageUrl: string | null; videoUrl: string | null; generating: boolean; error: string | null; approved: boolean; kenBurns: boolean; includeNarrator: boolean; includeSubtitles: boolean; }


const THEMES: { value: StoryTheme; label: string; icon: string; isCustom?: boolean }[] = [
  { value: 'true_crime', label: 'True Crime', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { value: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { value: 'drama', label: 'Drama', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { value: 'fairy_tale', label: 'Fairy Tale', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { value: 'custom', label: 'Custom', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', isCustom: true },
];

const STYLES: { value: AnimStyle; label: string }[] = [
  { value: 'western-cartoon', label: 'Western Cartoon' }, { value: 'anime', label: 'Anime' }, { value: 'pixar', label: 'Pixar' },
  { value: 'comic', label: 'Comic' }, { value: 'retro', label: 'Retro' }, { value: 'custom', label: 'Realistic' },
];

const THEME_STYLES: Record<StoryTheme, AnimStyle> = {
  true_crime: 'custom',
  history: 'retro',
  drama: 'anime',
  fairy_tale: 'pixar',
  custom: 'anime',
};

const THEME_GENRES: Record<StoryTheme, StoryGenre> = {
  true_crime: 'mystery',
  history: 'drama',
  drama: 'drama',
  fairy_tale: 'fairy-tale',
  custom: 'drama',
};

const STYLE_EXAMPLES: Record<AnimStyle, { gradient: string; desc: string }> = {
  'anime': { gradient: 'from-[#1c1c1c] to-[#0b0b0b]', desc: 'Japanese animation style with expressive characters' },
  'pixar': { gradient: 'from-[#242424] to-[#0e0e0e]', desc: '3D rendered, vibrant and family-friendly' },
  'western-cartoon': { gradient: 'from-[#2a2a2a] to-[#111]', desc: 'Bold lines, flat colors, classic cartoon feel' },
  'comic': { gradient: 'from-[#161616] to-[#262626]', desc: 'Comic book panels with halftone effects' },
  'retro': { gradient: 'from-[#1f1f1f] to-[#2c2c2c]', desc: 'Vintage look, aged textures, warm palette' },
  'custom': { gradient: 'from-[#0a0a0a] to-[#1a1a1a]', desc: 'Photo-realistic scenes, cinematic lighting and lifelike detail' },
};

const GENRE_EXAMPLES: { value: StoryGenre; label: string; icon: string; desc: string; placeholder: string; recommended?: boolean }[] = [
  { value: 'drama', label: 'Drama', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', desc: 'Emotional, character-driven stories', placeholder: 'A mother and daughter separated by war, searching for each other across borders...' },
  { value: 'mystery', label: 'Mystery', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', desc: 'Suspense, crime, detective stories', placeholder: 'A detective unravels a decades-old murder in a small coastal town...', recommended: true },
  { value: 'horror', label: 'Horror', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', desc: 'Dark, eerie and frightening narratives', placeholder: 'A family moves into an old house where the walls seem to breathe at night...' },
  { value: 'action', label: 'Action', icon: 'M13 10V3L4 14h7v7l9-11h-7z', desc: 'Fast-paced adventures and battles', placeholder: 'A former soldier must infiltrate a heavily guarded compound to save his team...' },
  { value: 'motivation', label: 'Motivation', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', desc: 'Inspiring journeys and success stories', placeholder: 'A young athlete overcomes every setback to reach the Olympic podium...' },
  { value: 'comedy', label: 'Comedy', icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', desc: 'Humor, light-hearted fun stories', placeholder: 'Three best friends accidentally swap phones and discover hilarious secrets...' },
  { value: 'fairy-tale', label: 'Fairy Tale', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', desc: 'Magical worlds, heroes and enchantment', placeholder: 'A cursed prince seeks the one person brave enough to break his spell...' },
];

const GENRE_RECOMMENDED_STYLE: Partial<Record<StoryGenre, AnimStyle>> = {
  'mystery': 'custom',
  'horror': 'custom',
  'motivation': 'custom',
  'fairy-tale': 'pixar',
};

const AVATAR_COLORS = ['#4a90d9','#e8607a','#50b87a','#c084fc','#f59e0b','#6ee7b7','#38bdf8','#fb7185','#a78bfa','#fbbf24','#ef4444','#22d3ee'];

const FILTER_OPTIONS = [
  { key: 'male', label: 'Male', match: (v: Voice) => v.labels.gender?.toLowerCase() === 'male' },
  { key: 'female', label: 'Female', match: (v: Voice) => v.labels.gender?.toLowerCase() === 'female' },
  { key: 'american', label: 'American', match: (v: Voice) => v.labels.accent?.toLowerCase().includes('american') },
  { key: 'british', label: 'British', match: (v: Voice) => v.labels.accent?.toLowerCase().includes('british') },
  { key: 'young', label: 'Young', match: (v: Voice) => v.labels.age?.toLowerCase().includes('young') },
  { key: 'narrator', label: 'Narrator', match: (v: Voice) => v.labels.use_case?.toLowerCase().includes('narrat') },
];

let _u = 0;
function uid() { return `u${++_u}-${Date.now()}`; }

function extractQuotedDialogue(text: string): string {
  const match = text.match(/["“]([^"”]{2,160})["”]/);
  return match ? match[1].trim() : '';
}

function sceneBeat(index: number, total: number): string {
  if (total <= 1) return 'complete story moment';
  if (index === 0) return 'opening hook and character setup';
  if (index === total - 1) return 'final payoff and clear ending';
  if (index === total - 2) return 'climax with the strongest action';
  return 'rising action that advances the same story';
}

function CreatePageInner() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [chars, setChars] = useState<CharDef[]>([]);
  const [scenes, setScenes] = useState<SceneDef[]>([]);
  const [res, setRes] = useState<Resolution>('720p');

  // ─── 2D Animation setup (Animated-Storytelling-style first stage) ───
  const [cartoonSetupDone, setCartoonSetupDone] = useState(false);
  const [cTitle, setCTitle] = useState('');
  const [cAspect, setCAspect] = useState<AspectRatio>('16:9');
  const [cSceneDur, setCSceneDur] = useState<4 | 6 | 8>(8);   // Veo 3.1 lite: 4/6/8s
  const [cSceneCount, setCSceneCount] = useState<3 | 5 | 8>(5);

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<AnimStyle>('anime');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selVoice, setSelVoice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [voices, setVoices] = useState<Voice[]>([]);
  const [vSearch, setVSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [genLoading, setGenLoading] = useState(false);
  const [genDone, setGenDone] = useState(false);
  const [editingChar, setEditingChar] = useState<CharDef | null>(null);
  const [pendingChar, setPendingChar] = useState<CharDef | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [videoBrief, setVideoBrief] = useState('');

  const [jobId, setJobId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [genMessage, setGenMessage] = useState('');
  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [genScenes, setGenScenes] = useState<SceneRenderStatus[]>([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [genStep, setGenStep] = useState(0);
  const [genTotalSteps, setGenTotalSteps] = useState(0);

  // ─── Mode & Story state ───
  const [mode, setMode] = useState<CreateMode>('selecting');
  const [storyTheme, setStoryTheme] = useState<StoryTheme | null>(null);
  const [storyStep, setStoryStep] = useState<1 | 2 | 3>(1);
  const [storyTitle, setStoryTitle] = useState('');

  const [storyStyle, setStoryStyle] = useState<AnimStyle>('anime');
  const [storyAspectRatio, setStoryAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [customGenre, setCustomGenre] = useState<StoryGenre>('drama');
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [storyNarratorVoiceId, setStoryNarratorVoiceId] = useState<string | null>(null);
  const [storyDuration, setStoryDuration] = useState<number>(3);
  const [storyStructure, setStoryStructure] = useState<'auto' | 'manual' | null>(null);
  const [storyGenerating, setStoryGenerating] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<ScriptScene[]>([]);
  const [storyVSearch, setStoryVSearch] = useState('');
  const [storyVFilters, setStoryVFilters] = useState<Set<string>>(new Set());
  const [blurFaces, setBlurFaces] = useState(false);
  const [globalCameraMove, setGlobalCameraMove] = useState(true);
  const [globalNarrator, setGlobalNarrator] = useState(true);
  const [globalSubtitles, setGlobalSubtitles] = useState(true);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportRes, setExportRes] = useState<Resolution>('720p');
  const [includeSubtitles, setIncludeSubtitles] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyDragI = useRef<number | null>(null);
  const storyDragO = useRef<number | null>(null);
  const storyVideoRef = useRef<HTMLVideoElement | null>(null);
  const [storyVideoPlaying, setStoryVideoPlaying] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/voices').then(r => r.json()).then(setVoices).catch(() => {});
    (async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('users').select('credits').eq('id', user.id).single();
      if (data) setUserCredits(data.credits);
    })();
  }, []);

  // ─── Load project from URL param ───
  useEffect(() => {
    const pid = searchParams.get('projectId');
    if (!pid) return;
    (async () => {
      const sb = createClient();
      const { data } = await sb.from('projects').select('*').eq('id', pid).single();
      if (!data) return;
      const s = data.state as any;
      setProjectId(pid);
      setMode('story');
      setStoryTheme(s.storyTheme ?? null);
      setStoryTitle(s.storyTitle ?? '');
      setStoryStyle(s.storyStyle ?? 'anime');
      setCustomGenre(s.customGenre ?? 'drama');
      setStoryDuration(s.storyDuration ?? 3);
      setStoryNarratorVoiceId(s.storyNarratorVoiceId ?? null);
      setBlurFaces(s.blurFaces ?? false);
      setStoryAspectRatio(s.storyAspectRatio ?? '9:16');
      setGlobalCameraMove(s.globalCameraMove ?? true);
      setGlobalNarrator(s.globalNarrator ?? true);
      setGlobalSubtitles(s.globalSubtitles ?? true);
      if (s.generatedScript?.length) {
        setGeneratedScript(s.generatedScript);
        setStoryStep(3);
      } else if (s.storyTitle) {
        setStoryStep(s.storyStep ?? 1);
      }
    })();
  }, []);

  // ─── Deep-link into a format: /create?mode=story|cartoon|animated|whiteboard|fruit_drama ───
  const modeParam = searchParams.get('mode');
  const lastModeParam = useRef<string | null>(null);
  useEffect(() => {
    if (searchParams.get('projectId')) return;
    if (modeParam) openFormat(modeParam as FormatKey);
    else if (lastModeParam.current) setMode('selecting');
    lastModeParam.current = modeParam;
  }, [modeParam]);

  // ─── Auto-save project (debounced 2s) ───
  useEffect(() => {
    if (mode !== 'story' || !storyTitle.trim()) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const state = {
        storyTheme, storyTitle, storyStyle, storyAspectRatio, customGenre, storyDuration,
        storyNarratorVoiceId, blurFaces, globalCameraMove, globalNarrator,
        globalSubtitles, generatedScript, storyStep,
      };
      const hasVideos = generatedScript.some(s => s.videoUrl);
      const thumbnailUrl = generatedScript.find(s => s.imageUrl)?.imageUrl ?? null;
      const meta = {
        user_id: user.id,
        title: storyTitle.trim() || 'Untitled',
        genre: customGenre,
        style: storyStyle,
        state,
        scenes_count: generatedScript.length,
        has_videos: hasVideos,
        thumbnail_url: thumbnailUrl,
      };
      if (projectId) {
        await sb.from('projects').update(meta).eq('id', projectId);
      } else {
        const { data } = await sb.from('projects').insert(meta).select('id').single();
        if (data) setProjectId(data.id);
      }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [mode, storyTitle, storyStyle, storyAspectRatio, customGenre, storyDuration, storyNarratorVoiceId,
      blurFaces, globalCameraMove, globalNarrator, globalSubtitles, generatedScript, storyStep]);

  useEffect(() => {
    if (storyVideoRef.current) { storyVideoRef.current.pause(); storyVideoRef.current.currentTime = 0; }
    setStoryVideoPlaying(false);
  }, [selectedSceneId]);

  // ─── Sync characterPlacements when chars changes ───
  useEffect(() => {
    if (scenes.length === 0) return;
    setScenes(prev => prev.map(sc => {
      const existingIds = sc.characterPlacements.map(p => p.characterId).filter(Boolean);
      const newChars = chars.filter(c => !existingIds.includes(c.id));
      if (newChars.length === 0) return sc;
      const startSlot = sc.characterPlacements.length;
      const newPlacements: CharPlacement[] = newChars.map((c, i) => ({
        slot: startSlot + i, characterId: c.id, role: 'silent' as const, dialogue: ''
      }));
      return { ...sc, characterPlacements: [...sc.characterPlacements, ...newPlacements] };
    }));
  }, [chars]);

  // ─── Keep an active scene selected while on the Scenes step ───
  useEffect(() => {
    if (step === 2 && scenes.length > 0 && !scenes.some(s => s.id === activeSceneId)) {
      setActiveSceneId(scenes[0].id);
    }
  }, [step, scenes, activeSceneId]);

  // ─── Keep a story scene selected while in the timeline editor ───
  useEffect(() => {
    if (storyStep === 3 && generatedScript.length > 0 && !generatedScript.some(s => s.id === selectedSceneId)) {
      setSelectedSceneId(generatedScript[0].id);
    }
  }, [storyStep, generatedScript, selectedSceneId]);

  const toggleFilter = useCallback((key: string) => {
    setActiveFilters(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }, []);

  const filteredV = useMemo(() => voices.filter(v => {
    const s = vSearch.trim().toLowerCase();
    if (s && !v.name.toLowerCase().includes(s)) return false;
    if (activeFilters.size === 0) return true;
    for (const key of activeFilters) { const opt = FILTER_OPTIONS.find(f => f.key === key); if (opt && !opt.match(v)) return false; }
    return true;
  }), [voices, vSearch, activeFilters]);

  const handlePlayVoice = useCallback((voiceId: string, previewUrl: string) => {
    if (playingId === voiceId) { audioRef.current?.pause(); setPlayingId(null); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (!previewUrl) { setPlayingId(null); return; }
    const a = new Audio(previewUrl); audioRef.current = a;
    a.onended = () => setPlayingId(null); a.onerror = () => setPlayingId(null);
    a.play().catch(() => setPlayingId(null)); setPlayingId(voiceId);
  }, [playingId]);

  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(f);
  };
  const clearPhoto = () => { setPhotoUrl(null); if (fileRef.current) fileRef.current.value = ''; };
  const resetForm = () => { setPrompt(''); setSelVoice(null); clearPhoto(); };  // keep global style across characters

  const handleGenChar = async () => {
    if (!prompt.trim()) return;
    setGenLoading(true);
    try {
      const r = await fetch('/api/generate-character', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: prompt, style, photo_url: editingChar?.imageUrl || photoUrl })
      });
      const d = await r.json();
      setPendingChar({
        id: editingChar ? editingChar.id : d.character_id || uid(),
        name: editingChar ? editingChar.name : `Character ${chars.length + 1}`,
        prompt, style,
        imageUrl: d.character_image_url || null,
        characterText: d.character_text || prompt
      });
      setGenDone(true);
    } catch {}
    setGenLoading(false);
  };

  const confirmChar = () => {
    if (pendingChar) {
      if (editingChar) {
        setChars(prev => prev.map(c => c.id === editingChar.id ? { ...pendingChar, id: editingChar.id, name: editingChar.name } : c));
      } else {
        setChars(prev => [...prev, pendingChar]);
      }
    }
    setPendingChar(null); setGenDone(false); setEditingChar(null); resetForm();
  };

  const openEditChar = (c: CharDef) => {
    setEditingChar(c);
    setPrompt(c.prompt);
    setStyle(c.style);
    setSelVoice(c.voiceId || null);
    setPendingChar(c);
    setGenDone(true);
  };

  const addScene = () => {
    const newId = uid();
    const firstBgId = uid();
    const inheritAspect: AspectRatio = scenes[scenes.length - 1]?.aspectRatio ?? cAspect;
    const slots: CharPlacement[] = chars.map((c, i) => ({
      slot: i, characterId: c.id, role: 'silent' as const, dialogue: '',
    }));
    setScenes(prev => [...prev, {
      id: newId, description: '', aspectRatio: inheritAspect,
      characters: chars.map(c => ({ characterId: c.id, role: 'silent' as const, dialogue: '' })),
      generating: false, approved: false, imageUrl: null, error: null,
      backgrounds: [{ id: firstBgId, description: '', photoUrl: null }],
      selectedBackgroundId: firstBgId,
      expandedBgId: firstBgId,
      characterPlacements: slots,
    }]);
    setActiveSceneId(newId);
  };

  const upScene = (id: string, u: Partial<SceneDef>) => setScenes(p => p.map(s => s.id === id ? { ...s, ...u } : s));
  const upSC = (sid: string, cid: string, u: Partial<SceneCharRef>) => setScenes(p => p.map(s => s.id !== sid ? s : { ...s, characters: s.characters.map(c => c.characterId === cid ? { ...c, ...u } : c) }));

  const upPlacement = (sid: string, slot: number, u: Partial<CharPlacement>) => {
    setScenes(p => p.map(s => {
      if (s.id !== sid) return s;
      const newPlacements = s.characterPlacements.map(cp => cp.slot === slot ? { ...cp, ...u } : cp);
      const newChars = s.characters.map(c => {
        const pl = newPlacements.find(p => p.characterId === c.characterId);
        if (!pl) return c;
        return { ...c, ...(u.role ? { role: u.role } : {}), ...(u.dialogue !== undefined ? { dialogue: u.dialogue } : {}) };
      });
      return { ...s, characterPlacements: newPlacements, characters: newChars };
    }));
  };

  // Add / remove a character from a scene's cast (no speaking/silent role — derived from dialogue)
  const toggleCast = (sid: string, charId: string) => {
    setScenes(p => p.map(s => {
      if (s.id !== sid) return s;
      const existing = s.characterPlacements.find(cp => cp.characterId === charId);
      if (existing) {
        return { ...s, characterPlacements: s.characterPlacements.map(cp => cp.characterId === charId ? { ...cp, characterId: null, dialogue: '', role: 'silent' as const } : cp) };
      }
      const empty = s.characterPlacements.find(cp => cp.characterId === null);
      if (empty) {
        return { ...s, characterPlacements: s.characterPlacements.map(cp => cp.slot === empty.slot ? { ...cp, characterId: charId, dialogue: '', role: 'silent' as const } : cp) };
      }
      return { ...s, characterPlacements: [...s.characterPlacements, { slot: s.characterPlacements.length, characterId: charId, role: 'silent' as const, dialogue: '' }] };
    }));
  };

  const upBg = (sid: string, bgId: string, u: Partial<SceneBg>) => {
    setScenes(p => p.map(s => s.id !== sid ? s : {
      ...s, backgrounds: s.backgrounds.map(b => b.id === bgId ? { ...b, ...u } : b),
    }));
  };

  const slotPositionLabel = (slot: number, total: number): string => {
    if (total === 1) return 'center';
    if (total === 2) return slot === 0 ? 'left' : 'right';
    if (total === 3) return slot === 0 ? 'left' : slot === 1 ? 'center' : 'right';
    const frac = slot / (total - 1);
    if (frac <= 0.25) return 'far left';
    if (frac <= 0.5) return 'left-center';
    if (frac <= 0.75) return 'right-center';
    return 'far right';
  };

  const buildSceneText = (scene: SceneDef) => {
    const selBg = scene.backgrounds.find(b => b.id === scene.selectedBackgroundId);
    const bgText = selBg?.description || '';
    const placed = scene.characterPlacements.filter(cp => cp.characterId);
    const charDescs = placed.map(cp => {
      const ch = chars.find(c => c.id === cp.characterId);
      const posLabel = slotPositionLabel(cp.slot, placed.length);
      return `${ch?.name || 'Character'} standing at ${posLabel}, ${cp.role}`;
    }).join('. ');
    return `${bgText} background. ${charDescs}.`.trim();
  };

  const generateScenePreview = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const sceneText = buildSceneText(scene);
    upScene(sceneId, { generating: true, error: null, approved: false, imageUrl: null, description: sceneText });
    try {
      const placed = scene.characterPlacements.filter(cp => cp.characterId);
      const payload = {
        scene_text: sceneText,
        aspect_ratio: scene.aspectRatio,
        characters: placed.map(cp => {
          const ch = chars.find(c => c.id === cp.characterId);
          return { id: cp.characterId, description: ch?.prompt || '', style: ch?.style || 'anime', char_url: ch?.imageUrl || null, role: cp.role, framing: 'full_body' };
        }),
      };
      const r = await fetch('/api/generate-scene-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      upScene(sceneId, { generating: false, imageUrl: d.scene_image_url || null });
    } catch {
      upScene(sceneId, { generating: false, error: 'Generation failed. Try again.' });
    }
  };

  const approveScene = (id: string) => upScene(id, { approved: true });
  const editScene = (id: string) => upScene(id, { approved: false });
  const approvedCount = scenes.filter(s => s.approved).length;

  const dragSlotI = useRef<{ sceneId: string; slot: number } | null>(null);

  const reorderPlacements = (sceneId: string, fromSlot: number, toSlot: number) => {
    if (fromSlot === toSlot) return;
    setScenes(p => p.map(s => {
      if (s.id !== sceneId) return s;
      const placements = [...s.characterPlacements];
      const fromItem = placements[fromSlot];
      const toItem = placements[toSlot];
      const newPlacements = placements.map((cp, i) => {
        if (i === fromSlot) return { ...cp, characterId: toItem.characterId, role: toItem.role, dialogue: toItem.dialogue };
        if (i === toSlot) return { ...cp, characterId: fromItem.characterId, role: fromItem.role, dialogue: fromItem.dialogue };
        return cp;
      });
      return { ...s, characterPlacements: newPlacements };
    }));
  };

  const dragI = useRef<number | null>(null);
  const dragO = useRef<number | null>(null);
  const onDragEnd = () => {
    if (dragI.current === null || dragO.current === null) return;
    const c = [...scenes]; const [rm] = c.splice(dragI.current, 1); c.splice(dragO.current, 0, rm);
    setScenes(c); dragI.current = null; dragO.current = null;
  };

  const totalCr = scenes.filter(s => s.approved).length * RESOLUTION_CREDITS[res];

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const pollStatus = async (jid: string) => {
    try {
      const r = await fetch(`/api/status/${jid}`);
      const d = await r.json();
      setGenStep(d.step || 0);
      setGenTotalSteps(d.total_steps || 0);
      setGenMessage(d.message || '');
      const progress = d.total_steps > 0 ? Math.round((d.step / d.total_steps) * 100) : 0;
      setGenProgress(progress);
      if (d.scenes) {
        setGenScenes(d.scenes.map((s: any) => ({
          scene_number: s.scene_index, status: s.status,
          video_url: s.video_url || null, current_step: d.message
        })));
      }
      if (d.status === 'completed') { clearInterval(pollRef.current!); setGenStatus('completed'); setFinalVideoUrl(d.final_video_url || null); }
      else if (d.status === 'failed') { clearInterval(pollRef.current!); setGenStatus('failed'); setGenMessage(d.error || 'Generation failed'); }
    } catch {}
  };

  const handleFinalGenerate = async (sceneOverride?: SceneDef[], autoPlan = false) => {
    setStep(4); setGenStatus('processing'); setGenProgress(0); setGenMessage('Starting generation...');
    const sceneSource = sceneOverride || scenes;
    const approvedScenes = sceneSource.filter(s => s.approved);
    setGenScenes(approvedScenes.map((_, i) => ({ scene_number: i + 1, status: 'queued' })));
    try {
      const payload = {
        characters: chars.map(c => ({
          id: c.id,
          description: c.prompt,
          character_text: c.characterText || c.prompt,
          style: c.style,
          photo_url: null,
          char_url: c.imageUrl
        })),
        scenes: approvedScenes.map(sc => ({
          scene_text: sc.description, aspect_ratio: sc.aspectRatio, scene_duration: cSceneDur,
          characters: sc.characterPlacements.filter(cp => cp.characterId).map(cp => ({
            character_id: cp.characterId, role: cp.dialogue.trim() ? 'speaking' : 'silent',
            dialogue: cp.dialogue.trim() || null,
            voice_id: null, framing: 'full_body'  // Veo 3.1 adds its own audio — no per-character voice
          }))
        })),
        auto_plan: autoPlan,
        project_prompt: cTitle.trim(),
        user_direction: videoBrief.trim(),
        scene_count: cSceneCount,
        aspect_ratio: cAspect,
        scene_duration: cSceneDur,
        style,
        resolution: res, lipsync: false
      };
      const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok || d.error || !d.job_id) {
        throw new Error(d.error || d.detail || 'Failed to start generation.');
      }
      setJobId(d.job_id);
      pollRef.current = setInterval(() => pollStatus(d.job_id), 3000);
      pollStatus(d.job_id);
    } catch (error: any) {
      setGenStatus('failed');
      setGenMessage(error?.message || 'Failed to start generation.');
    }
  };

  const handleAutoGenerate = () => {
    if (chars.length === 0) return;
    const projectPrompt = cTitle.trim();
    const direction = videoBrief.trim() || projectPrompt;
    const quotedDialogue = extractQuotedDialogue(`${projectPrompt} ${direction}`);
    const generatedScenes: SceneDef[] = Array.from({ length: cSceneCount }, (_, index) => {
      const newId = uid();
      const firstBgId = uid();
      const beat = sceneBeat(index, cSceneCount);
      const description = [
        `Project: ${projectPrompt}.`,
        `User direction: ${direction}.`,
        `Scene ${index + 1} of ${cSceneCount}: ${beat}.`,
        `Use the approved characters consistently: ${chars.map(c => `${c.name} (${c.prompt})`).join('; ')}.`,
        `Keep one continuous story, no unrelated characters, no on-screen text, no subtitles, no logos, no watermark.`,
      ].join(' ');
      const placements: CharPlacement[] = chars.map((c, i) => ({
        slot: i,
        characterId: c.id,
        role: quotedDialogue && i === 0 ? 'speaking' : 'silent',
        dialogue: quotedDialogue && i === 0 ? quotedDialogue : '',
      }));
      return {
        id: newId,
        description,
        aspectRatio: cAspect,
        characters: placements.map(cp => ({ characterId: cp.characterId || '', role: cp.role, dialogue: cp.dialogue })),
        generating: false,
        approved: true,
        imageUrl: null,
        error: null,
        backgrounds: [{ id: firstBgId, description, photoUrl: null }],
        selectedBackgroundId: firstBgId,
        expandedBgId: firstBgId,
        characterPlacements: placements,
      };
    });
    setScenes(generatedScenes);
    setActiveSceneId(generatedScenes[0]?.id || null);
    handleFinalGenerate(generatedScenes, true);
  };

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const goHome = () => {
    setMode('selecting');
    if (searchParams.get('mode')) router.replace('/create');
  };

  const openFormat = (k: FormatKey) => {
    if (k === 'story') setMode('theme_select');
    else if (k === 'cartoon') { setCartoonSetupDone(false); setMode('cartoon'); }
    else if (k === 'animated' || k === 'whiteboard' || k === 'fruit_drama') setMode(k);
  };

  const resetAll = () => {
    setStep(1); setChars([]); setScenes([]); setRes('720p');
    setCartoonSetupDone(false); setCTitle(''); setVideoBrief(''); setCAspect('16:9'); setCSceneDur(8); setCSceneCount(5);
    resetForm(); setJobId(null); setGenProgress(0); setGenStatus('idle'); setGenScenes([]); setFinalVideoUrl(null);
    setMode('selecting'); setStoryTheme(null); setStoryStep(1); setStoryTitle(''); setStoryAspectRatio('9:16'); setProjectId(null);
    setStoryStyle('anime'); setStoryNarratorVoiceId(null); setStoryDuration(3);
    setStoryStructure(null); setStoryGenerating(false); setStoryError(null); setGeneratedScript([]);
    setBlurFaces(false); setSelectedSceneId(null); setShowExport(false); setExportRes('720p');
  };

  // ─── Story Mode helpers ───
  const storySetupValid = storyTitle.trim().length > 0;
  const themeLabel = THEMES.find(t => t.value === storyTheme)?.label || '';

  const storyFilteredV = useMemo(() => voices.filter(v => {
    const s = storyVSearch.trim().toLowerCase();
    if (s && !v.name.toLowerCase().includes(s)) return false;
    if (storyVFilters.size === 0) return true;
    for (const key of storyVFilters) { const opt = FILTER_OPTIONS.find(f => f.key === key); if (opt && !opt.match(v)) return false; }
    return true;
  }), [voices, storyVSearch, storyVFilters]);

  const toggleStoryFilter = useCallback((key: string) => {
    setStoryVFilters(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }, []);

  const handleGenerateScript = async () => {
    setStoryGenerating(true); setStoryError(null);
    try {
      const r = await fetch('/api/story/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: storyTitle, genre: storyTheme === 'custom' ? customGenre : (storyTheme ? THEME_GENRES[storyTheme] : 'drama'), style: storyStyle, theme: storyTheme, duration_minutes: storyDuration, narrator_voice_id: storyNarratorVoiceId, blur_faces: blurFaces }),
      });
      if (!r.ok) throw new Error('Request failed');
      const d = await r.json();
      if (d.scenes && Array.isArray(d.scenes)) {
        const parsed: ScriptScene[] = d.scenes.map((s: any, i: number) => ({
          id: uid(), sceneNumber: i + 1,
          title: s.title || `Scene ${i + 1}`,
          narratorText: s.narrator_text || s.narratorText || '',
          sceneDescription: s.scene_description || s.sceneDescription || '',
          imageUrl: null, videoUrl: null, generating: false, error: null, approved: false, kenBurns: globalCameraMove, includeNarrator: globalNarrator, includeSubtitles: globalSubtitles,
        }));
        setGeneratedScript(parsed);
        if (parsed.length > 0) setSelectedSceneId(parsed[0].id);
        setStoryGenerating(false);
        autoGenerateScenePreviews(parsed);
        return;
      }
    } catch {
      setStoryError('Script generation failed. Please try again.');
    }
    setStoryGenerating(false);
  };

  const updateScriptScene = (id: string, u: Partial<ScriptScene>) => {
    setGeneratedScript(prev => prev.map(s => s.id === id ? { ...s, ...u } : s));
  };

  const goToTimelineFromScript = () => {
    const empty: ScriptScene = { id: uid(), sceneNumber: 1, title: 'Scene 1', narratorText: '', sceneDescription: '', imageUrl: null, videoUrl: null, generating: false, error: null, approved: false, kenBurns: globalCameraMove, includeNarrator: globalNarrator, includeSubtitles: globalSubtitles };
    setGeneratedScript([empty]); setSelectedSceneId(empty.id); setStoryStep(3);
  };

  const addStoryScene = () => {
    const n = generatedScript.length + 1;
    const ns: ScriptScene = { id: uid(), sceneNumber: n, title: `Scene ${n}`, narratorText: '', sceneDescription: '', imageUrl: null, videoUrl: null, generating: false, error: null, approved: false, kenBurns: globalCameraMove, includeNarrator: globalNarrator, includeSubtitles: globalSubtitles };
    setGeneratedScript(prev => [...prev, ns]); setSelectedSceneId(ns.id);
  };

  const onStoryDragEnd = () => {
    if (storyDragI.current === null || storyDragO.current === null || storyDragI.current === storyDragO.current) { storyDragI.current = null; storyDragO.current = null; return; }
    setGeneratedScript(prev => { const c = [...prev]; const [rm] = c.splice(storyDragI.current!, 1); c.splice(storyDragO.current!, 0, rm); return c.map((s, i) => ({ ...s, sceneNumber: i + 1 })); });
    storyDragI.current = null; storyDragO.current = null;
  };

  const callGenerateSingleScene = async (sc: ScriptScene, isRegeneration = false) => {
    const r = await fetch('/api/generate-single-scene', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene_description: sc.sceneDescription,
        narrator_text: sc.narratorText || '',
        narrator_voice_id: storyNarratorVoiceId || null,
        aspect_ratio: storyAspectRatio,
        scene_duration: 8,
        ken_burns: sc.kenBurns,
        include_narrator: sc.includeNarrator && !!storyNarratorVoiceId && !!sc.narratorText,
        include_subtitles: sc.includeSubtitles && !!storyNarratorVoiceId && !!sc.narratorText,
        is_regeneration: isRegeneration,
      })
    });
    return await r.json();
  };

  const autoGenerateScenePreviews = async (scenes: ScriptScene[]) => {
    for (const sc of scenes) {
      if (!sc.sceneDescription.trim()) continue;
      setGeneratedScript(prev => prev.map(s => s.id === sc.id ? { ...s, generating: true, error: null } : s));
      try {
        const d = await callGenerateSingleScene(sc);
        setGeneratedScript(prev => prev.map(s => s.id === sc.id ? { ...s, generating: false, imageUrl: d.image_url || null, videoUrl: d.video_url || null } : s));
      } catch {
        setGeneratedScript(prev => prev.map(s => s.id === sc.id ? { ...s, generating: false, error: 'Failed' } : s));
      }
    }
  };

  const generateStoryScenePreview = async (sceneId: string) => {
    const sc = generatedScript.find(s => s.id === sceneId);
    if (!sc) return;
    const isRegen = !!sc.videoUrl;
    setGeneratedScript(prev => prev.map(s => s.id === sceneId ? { ...s, generating: true, error: null, imageUrl: null, videoUrl: null } : s));
    try {
      const d = await callGenerateSingleScene(sc, isRegen);
      if (d.status === 402 || /credit|kredi/i.test(d.error || '')) {
        updateScriptScene(sceneId, { generating: false, error: d.error || 'Not enough credits.' });
        return;
      }
      setGeneratedScript(prev => prev.map(s => s.id === sceneId ? { ...s, generating: false, imageUrl: d.image_url || null, videoUrl: d.video_url || null } : s));
      setUserCredits(prev => prev !== null ? Math.max(0, prev - (isRegen ? 25 : 50)) : prev);
    } catch {
      setGeneratedScript(prev => prev.map(s => s.id === sceneId ? { ...s, generating: false, error: 'Failed. Try again.' } : s));
    }
  };

  const approveStoryScene = (id: string) => setGeneratedScript(prev => prev.map(s => s.id === id ? { ...s, approved: true } : s));
  const unapproveStoryScene = (id: string) => setGeneratedScript(prev => prev.map(s => s.id === id ? { ...s, approved: false } : s));
  const removeStoryScene = (id: string) => {
    const idx = generatedScript.findIndex(s => s.id === id);
    const remaining = generatedScript.filter(s => s.id !== id);
    setGeneratedScript(remaining.map((s, i) => ({ ...s, sceneNumber: i + 1 })));
    if (id === selectedSceneId) {
      const next = remaining[Math.min(idx, remaining.length - 1)];
      setSelectedSceneId(next ? next.id : null);
    }
  };

  const selectedScene = generatedScript.find(s => s.id === selectedSceneId) || null;
  const selectedSceneIdx = generatedScript.findIndex(s => s.id === selectedSceneId);
  const storyHasApproved = generatedScript.some(s => s.approved || s.imageUrl);

  const downloadVideo = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStoryExport = async () => {
    setShowExport(false);
    if (!storyNarratorVoiceId) { alert('Please select a narrator voice first.'); return; }
    const scenesToExport = generatedScript.filter(s => s.sceneDescription.trim());
    const allHaveVideos = scenesToExport.every(s => s.videoUrl);

    try {
      setJobId(null);
      setGenStatus('processing');
      setGenProgress(0);
      setGenMessage('Merging your scenes...');
      setGenScenes(scenesToExport.map((_, i) => ({ scene_number: i + 1, status: 'completed', video_url: scenesToExport[i].videoUrl || undefined })));
      setMode('cartoon');
      setStep(4);

      if (allHaveVideos) {
        // Fast path: just merge already-generated videos
        const videoUrls = scenesToExport.map(s => s.videoUrl!);
        const r = await fetch('/api/merge-storybook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_urls: videoUrls }),
        });
        const d = await r.json();
        if (d.final_video_url) {
          setGenStatus('completed');
          setFinalVideoUrl(d.final_video_url);
          setGenMessage('Done!');
          if (projectId) {
            const sb = createClient();
            await sb.from('projects').update({ final_video_url: d.final_video_url }).eq('id', projectId);
          }
        } else {
          throw new Error(d.error || 'Merge failed');
        }
      } else {
        // Slow path: regenerate all scenes via generate-storybook
        const r = await fetch('/api/generate-storybook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes: scenesToExport.map(ss => ({
              scene_number: ss.sceneNumber, title: ss.title,
              scene_description: ss.sceneDescription, narrator_text: ss.narratorText || '',
              include_subtitles: ss.includeSubtitles,
            })),
            narrator_voice_id: storyNarratorVoiceId,
            aspect_ratio: storyAspectRatio,
            scene_duration: 8,
          })
        });
        const d = await r.json();
        if (d.error) { alert(d.error); setGenStatus('idle'); setStep(3); return; }
        if (d.job_id) {
          setJobId(d.job_id);
          setGenStatus('processing'); setGenProgress(0); setGenMessage('Starting video generation...');
          setGenScenes(scenesToExport.map((_, i) => ({ scene_number: i + 1, status: 'queued' })));
          pollRef.current = setInterval(() => pollStatus(d.job_id), 3000);
          pollStatus(d.job_id);
        }
      }
    } catch (e) {
      setGenStatus('failed');
      setGenMessage('Export failed. Please try again.');
    }
  };

  const durationSceneNote = (d: number) => d === 1 ? '≈ 10 scenes' : d === 2 ? '≈ 18 scenes' : d === 3 ? '≈ 26 scenes' : d === 5 ? '≈ 40 scenes' : '≈ 60 scenes';

  const roadmap = [{ n: 1, l: 'Characters' }, { n: 4, l: 'Studio' }] as const;

  return (<>
    {/* ═══ MODE SELECTION ═══ */}
    {mode === 'selecting' && (
      <div className="px-5 md:px-8 py-6 max-w-[960px] mx-auto">
        <header className="mb-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Create</h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-0.5">Choose a format. Every format exports vertical and horizontal.</p>
        </header>
        <div className="flex flex-col rounded-[10px] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden">
          {FORMATS.map(f => (
            <button key={f.key} onClick={() => openFormat(f.key)}
              className="group flex items-center gap-4 px-4 py-3.5 text-left bg-black hover:bg-[var(--surface)] transition-colors">
              <span className="w-9 h-9 rounded-md bg-[var(--surface-3)] border border-[var(--line)] flex items-center justify-center text-[var(--fg-2)] flex-shrink-0">
                <FormatIcon k={f.key} size={17} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{f.title}</span>
                  {f.badge && <span className={`ui-chip ${f.badge === 'Popular' ? 'ui-chip-solid' : 'ui-chip-muted'}`}>{f.badge}</span>}
                </span>
                <span className="block text-[12px] text-[var(--fg-3)] truncate mt-0.5">{f.desc}</span>
              </span>
              <span className="hidden sm:block text-[12px] text-[var(--fg-4)] w-[160px] text-right">{f.tagline}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--fg-4)] group-hover:text-white transition-colors flex-shrink-0"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* ═══ ANIMATED STORYTELLING ═══ */}
    {mode === 'animated' && <AnimatedStorytelling onBack={goHome} />}

    {/* ═══ WHITEBOARD ANIMATION ═══ */}
    {mode === 'whiteboard' && <WhiteboardAnimation onBack={goHome} />}

    {/* ═══ FRUIT DRAMA ═══ */}
    {mode === 'fruit_drama' && <FruitDrama onBack={goHome} />}

    {/* ═══ THEME SELECTION ═══ */}
    {mode === 'theme_select' && (
      <div className="flex flex-col h-screen">
        <EditorHeader format="Storytelling" onBack={goHome} steps={['Tone', 'Setup', 'Structure', 'Timeline']} current={0} />
        <EditorPage width={760}>
          <Intro title="Set the tone" desc="Choose a genre and a visual style. You can fine-tune everything in the next step." />
          <Section title="Genre">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GENRE_EXAMPLES.map(g => {
                const on = customGenre === g.value;
                return (
                  <button key={g.value} onClick={() => setCustomGenre(g.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${on ? 'border-[var(--line-3)] bg-white/[0.06]' : 'border-[var(--line)] hover:border-[var(--line-2)] hover:bg-white/[0.02]'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={on ? 'text-white' : 'text-[var(--fg-3)]'}><path d={g.icon}/></svg>
                      <span className="text-[13px] font-medium">{g.label}</span>
                      {g.recommended && <span className="ml-auto text-[11px] text-[var(--fg-4)]">Top pick</span>}
                    </div>
                    <p className="text-[12px] text-[var(--fg-3)] leading-snug">{g.desc}</p>
                  </button>
                );
              })}
            </div>
          </Section>
          <Section title="Visual style">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLES.map(s => (
                <StyleCard key={s.value} label={s.label} desc={STYLE_EXAMPLES[s.value].desc} active={storyStyle === s.value}
                  onClick={() => setStoryStyle(s.value)} badge={GENRE_RECOMMENDED_STYLE[customGenre] === s.value ? 'Recommended' : undefined} />
              ))}
            </div>
          </Section>
        </EditorPage>
        <ActionBar left={<span><span className="text-[var(--fg)]">{GENRE_EXAMPLES.find(g => g.value === customGenre)?.label}</span> · {STYLES.find(x => x.value === storyStyle)?.label}</span>}>
          <button onClick={() => { setStoryTheme('custom'); setMode('story'); }} className="ui-btn ui-btn-primary">Continue</button>
        </ActionBar>
      </div>
    )}

    {/* ═══ STORY MODE ═══ */}
    {mode === 'story' && (
      <div className="flex flex-col h-screen">
        <EditorHeader
          format="Storytelling"
          onBack={() => setMode('theme_select')}
          steps={['Tone', 'Setup', 'Structure', 'Timeline']}
          current={storyStep}
          onStep={i => { if (i === 0) setMode('theme_select'); else if (i <= storyStep) setStoryStep(i as 1 | 2 | 3); }}
          meta={<>
            <span className="ui-chip ui-chip-muted">{GENRE_EXAMPLES.find(g => g.value === customGenre)?.label}</span>
            <span className="ui-chip ui-chip-muted">{STYLES.find(x => x.value === storyStyle)?.label}</span>
          </>}
          right={userCredits !== null ? <Credits n={userCredits} suffix="" /> : undefined}
        />

        {/* ── STEP 1: Setup ── */}
        {storyStep === 1 && (
          <>
            <EditorPage width={1080}>
              <Intro title="Tell the story" desc="Your topic, the frame and a narrator. Everything can be tweaked scene by scene later." />
              <div className="grid lg:grid-cols-2 gap-x-10">
                <div>
                  <Section n={1} title="Topic">
                    <TextArea big value={storyTitle} onChange={e => setStoryTitle(e.target.value)}
                      placeholder={GENRE_EXAMPLES.find(g => g.value === customGenre)?.placeholder ?? 'Describe your story topic...'} />
                  </Section>
                  <Section n={2} title="Format">
                    <Segmented full value={storyAspectRatio} onChange={setStoryAspectRatio}
                      options={[
                        { value: '9:16' as const, label: 'Vertical', icon: <AspectGlyph a="9:16" />, sub: 'TikTok / Reels' },
                        { value: '16:9' as const, label: 'Horizontal', icon: <AspectGlyph a="16:9" />, sub: 'YouTube' },
                      ]} />
                  </Section>
                  <Section n={3} title="Production">
                    <div className="rounded-lg border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden">
                      <ToggleRow icon={Ico.camera} label="Camera movement" desc="Ken Burns zoom effect" on={globalCameraMove} onChange={setGlobalCameraMove} />
                      <ToggleRow icon={Ico.mic} label="Narrator voice" desc="AI voice reads the script" on={globalNarrator} onChange={setGlobalNarrator} />
                      <ToggleRow icon={Ico.captions} label="Subtitles" desc="Word-by-word captions" on={globalSubtitles} onChange={setGlobalSubtitles} />
                      <ToggleRow icon={Ico.user} label="Blur faces" desc="Recommended for crime & mystery" on={blurFaces} onChange={setBlurFaces} />
                    </div>
                  </Section>
                </div>
                <div>
                  <Section n={4} title="Narrator voice" hint="Tap ▶ to preview">
                    <VoiceGrid voices={voices} value={storyNarratorVoiceId} onChange={setStoryNarratorVoiceId} columns={2} maxHeight={560}
                      previewing={playingId} onPreview={v => handlePlayVoice(v.voice_id, v.preview_url || '')} />
                  </Section>
                </div>
              </div>
            </EditorPage>
            <ActionBar left={storyNarratorVoiceId
              ? <span className="truncate">Narrator: <span className="text-white font-medium">{voices.find(v => v.voice_id === storyNarratorVoiceId)?.name}</span></span>
              : <span>Pick a narrator voice for the export</span>}>
              <button onClick={() => setStoryStep(2)} disabled={!storySetupValid} className="ui-btn ui-btn-primary">Continue{Ico.arrow}</button>
            </ActionBar>
          </>
        )}

        {/* ── STEP 2: Structure ── */}
        {storyStep === 2 && (
          <>
            <EditorPage width={820}>
              <Intro title="How should we build it?" desc="Let Animave write a full cinematic script, or start from a blank timeline." />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div onClick={() => setStoryStructure('auto')}
                  className={`relative p-4 rounded-[10px] border text-left cursor-pointer transition-all ${storyStructure === 'auto' ? 'border-[var(--line-3)] bg-white/[0.05]' : 'border-[var(--line)] hover:border-[var(--line-2)] bg-white/[0.015]'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`w-8 h-8 rounded-md border border-[var(--line)] bg-[var(--surface-3)] flex items-center justify-center ${storyStructure === 'auto' ? 'text-white' : 'text-[var(--fg-3)]'}`}>{Ico.sparkle}</span>
                    <span className="ui-chip ui-chip-muted">Recommended</span>
                  </div>
                  <h3 className="text-[14px] font-medium mb-1">Build it for me</h3>
                  <p className="text-[12.5px] text-[var(--fg-3)] leading-relaxed mb-6">A full script with hook, rising action, climax and resolution.</p>
                  <Label right={<span className="ui-mono text-[10.5px] text-[var(--fg-4)]">{durationSceneNote(storyDuration)}</span>}>Video length</Label>
                  <div onClick={e => e.stopPropagation()}>
                    <Segmented full size="sm" value={storyDuration} onChange={d => { setStoryStructure('auto'); setStoryDuration(d); }}
                      options={[1, 2, 3, 5, 10].map(d => ({ value: d, label: `${d}m` }))} />
                  </div>
                </div>
                <div onClick={() => setStoryStructure('manual')}
                  className={`relative p-4 rounded-[10px] border text-left cursor-pointer transition-all ${storyStructure === 'manual' ? 'border-[var(--line-3)] bg-white/[0.05]' : 'border-[var(--line)] hover:border-[var(--line-2)] bg-white/[0.015]'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`w-8 h-8 rounded-md border border-[var(--line)] bg-[var(--surface-3)] flex items-center justify-center ${storyStructure === 'manual' ? 'text-white' : 'text-[var(--fg-3)]'}`}>{Ico.plus}</span>
                  </div>
                  <h3 className="text-[14px] font-medium mb-1">I'll write my own</h3>
                  <p className="text-[12.5px] text-[var(--fg-3)] leading-relaxed">Start with a blank timeline and build scenes manually.</p>
                </div>
              </div>
            </EditorPage>
            <ActionBar left={<span>{storyStructure === 'auto' ? `${storyDuration} min · ${durationSceneNote(storyDuration)}` : storyStructure === 'manual' ? 'Blank timeline' : 'Choose an option'}</span>}>
              <button onClick={() => setStoryStep(1)} className="ui-btn ui-btn-ghost">Back</button>
              <button onClick={() => { if (storyStructure === 'auto') { setStoryStep(3); handleGenerateScript(); } else if (storyStructure === 'manual') { goToTimelineFromScript(); } }} disabled={!storyStructure}
                className="ui-btn ui-btn-primary">
                {storyStructure === 'auto' ? 'Generate script' : storyStructure === 'manual' ? 'Start building' : 'Continue'}{Ico.arrow}
              </button>
            </ActionBar>
          </>
        )}

        {/* ── STEP 3: Timeline Editor ── */}
        {storyStep === 3 && (
          <div className="flex flex-col flex-1 min-h-0">
            {storyGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <Spinner size={18} className="mb-4" />
                <h2 className="text-[15px] font-medium mb-1">Writing your script…</h2>
                <p className="text-[13px] text-[var(--fg-3)]">{durationSceneNote(storyDuration)} · hook, rising action, climax, resolution</p>
              </div>
            )}
            {storyError && !storyGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                <ErrorNote>{storyError}</ErrorNote>
                <button onClick={handleGenerateScript} className="ui-btn ui-btn-primary">Retry</button>
              </div>
            )}

            {!storyGenerating && !storyError && generatedScript.length > 0 && (<>
              {showExport && (
                <Modal onClose={() => setShowExport(false)} width={400}>
                  <div className="ui-eyebrow mb-2">Export</div>
                  <h3 className="text-[15px] font-semibold mb-4">Ready to generate video</h3>
                  <Label>Resolution</Label>
                  <Segmented full value={exportRes} onChange={setExportRes}
                    options={(['480p', '720p', '1080p'] as Resolution[]).map(r => ({ value: r, label: r, sub: `${RESOLUTION_CREDITS[r]} cr` }))} />
                  <div className="text-[12.5px] text-[var(--fg-3)] my-5 flex items-center gap-2">
                    {generatedScript.filter(s => s.sceneDescription.trim()).every(s => s.videoUrl)
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-white" /><span className="text-white">All scenes are ready — export is free</span></>
                      : <><span className="w-1.5 h-1.5 rounded-full bg-white/30" /><span>Missing scenes will be generated · {generatedScript.filter(s => s.sceneDescription.trim() && !s.videoUrl).length} left</span></>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowExport(false)} className="ui-btn ui-btn-secondary flex-1">Cancel</button>
                    <button onClick={handleStoryExport} className="ui-btn ui-btn-primary flex-1">Generate video{Ico.arrow}</button>
                  </div>
                </Modal>
              )}

              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* PREVIEW */}
                <div className="relative flex-1 flex flex-col min-w-0 p-4 md:p-6">
                  <div className="relative flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="ui-chip !h-6 !px-2.5 ui-mono">SC {String(selectedSceneIdx + 1).padStart(2, '0')}</span>
                      <span className="text-[13px] font-medium truncate max-w-[320px]">{selectedScene?.title}</span>
                    </div>
                    {selectedScene?.approved && <span className="ui-chip ui-chip-solid">{Ico.check}Approved</span>}
                  </div>
                  <div className="relative flex-1 flex items-center justify-center min-h-0">
                    <div className={`relative rounded-[10px] border border-[var(--line-2)] bg-[#0b0b0b] overflow-hidden flex items-center justify-center ${storyAspectRatio === '9:16' ? 'aspect-[9/16] h-full max-h-[62vh]' : 'aspect-video w-full max-w-[820px]'}`}>
                      {selectedScene?.videoUrl ? (
                        <video ref={storyVideoRef} src={selectedScene.videoUrl} loop playsInline
                          onPlay={() => setStoryVideoPlaying(true)} onPause={() => setStoryVideoPlaying(false)}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => { const v = storyVideoRef.current; if (!v) return; storyVideoPlaying ? v.pause() : v.play(); }} />
                      ) : selectedScene?.imageUrl ? (
                        <img src={selectedScene.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : selectedScene?.generating ? (
                        <div className="flex flex-col items-center gap-3"><Spinner size={18} /><span className="text-[12px] text-[var(--fg-3)]">Generating preview…</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 px-8 text-center text-white/20">
                          {Ico.film}
                          <span className="text-[12px] text-[var(--fg-4)]">{selectedScene?.sceneDescription.trim() ? 'Ready to generate' : 'Describe the scene to start'}</span>
                        </div>
                      )}
                      {selectedScene?.videoUrl && (
                        <button onClick={() => { const v = storyVideoRef.current; if (!v) return; storyVideoPlaying ? v.pause() : v.play(); }}
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center">
                          {storyVideoPlaying ? Ico.pause : Ico.play}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* INSPECTOR */}
                <aside className="w-[360px] flex-shrink-0 border-l border-[var(--line)] overflow-y-auto bg-[#060606] hidden md:block">
                  {selectedScene ? (
                    <div className="p-5 flex flex-col gap-5">
                      <div>
                        <div className="ui-eyebrow mb-2">Scene {selectedSceneIdx + 1} of {generatedScript.length}</div>
                        <input value={selectedScene.title} onChange={e => updateScriptScene(selectedScene.id, { title: e.target.value })}
                          className="w-full bg-transparent text-[14px] font-medium text-white outline-none border-b border-transparent focus:border-[var(--line-2)] pb-1 transition-colors" />
                      </div>
                      <div>
                        <Label>Narration</Label>
                        <TextArea value={selectedScene.narratorText} onChange={e => updateScriptScene(selectedScene.id, { narratorText: e.target.value })} className="min-h-[96px]" />
                      </div>
                      <div>
                        <Label>Scene description</Label>
                        <TextArea value={selectedScene.sceneDescription} onChange={e => updateScriptScene(selectedScene.id, { sceneDescription: e.target.value })} className="min-h-[84px] !text-[12.5px] !text-[var(--fg-2)]" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          ['kenBurns', 'Camera', Ico.camera],
                          ['includeNarrator', 'Narrator', Ico.mic],
                          ['includeSubtitles', 'Subtitles', Ico.captions],
                        ] as const).map(([key, label, icon]) => (
                          <button key={key} onClick={() => updateScriptScene(selectedScene.id, { [key]: !selectedScene[key] } as Partial<ScriptScene>)}
                            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[12px] transition-colors ${selectedScene[key] ? 'border-[var(--line-3)] bg-white/[0.08] text-white' : 'border-[var(--line)] text-[var(--fg-3)] hover:text-white'}`}>
                            {icon}{label}
                          </button>
                        ))}
                      </div>

                      <div className="rounded-[10px] border border-[var(--line)] p-3.5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-[12px] text-[var(--fg-2)]">
                            <StatusDot status={selectedScene.approved ? 'completed' : selectedScene.generating ? 'processing' : selectedScene.error ? 'failed' : 'queued'} />
                            {selectedScene.approved ? 'Approved' : selectedScene.generating ? 'Generating' : selectedScene.error ? 'Failed' : selectedScene.imageUrl ? 'Ready for review' : 'Not generated'}
                          </span>
                          {selectedScene.approved && <button onClick={() => unapproveStoryScene(selectedScene.id)} className="text-[11.5px] text-[var(--fg-3)] hover:text-white">Edit</button>}
                        </div>
                        {selectedScene.error && <ErrorNote>{selectedScene.error}</ErrorNote>}
                        {!selectedScene.generating && (
                          <div className="flex gap-2">
                            {selectedScene.imageUrl ? (
                              <>
                                <button onClick={() => generateStoryScenePreview(selectedScene.id)} className="ui-btn ui-btn-sm ui-btn-secondary flex-1">Regenerate</button>
                                {!selectedScene.approved && <button onClick={() => approveStoryScene(selectedScene.id)} className="ui-btn ui-btn-sm ui-btn-primary flex-1">{Ico.check}Approve</button>}
                              </>
                            ) : (
                              <button onClick={() => generateStoryScenePreview(selectedScene.id)} disabled={!selectedScene.sceneDescription.trim()} className="ui-btn ui-btn-sm ui-btn-primary flex-1">
                                {Ico.sparkle}{selectedScene.error ? 'Retry' : 'Generate preview'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (<div className="h-full flex items-center justify-center"><p className="text-[13px] text-[var(--fg-4)]">Select a scene</p></div>)}
                </aside>
              </div>

              {/* FILM STRIP */}
              <div className="flex-shrink-0 border-t border-[var(--line)] bg-[#050505] px-4 md:px-6 py-3 flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1.5">
                  {generatedScript.map((ss, idx) => {
                    const isActive = ss.id === selectedSceneId;
                    return (
                      <div key={ss.id} className="relative group flex-shrink-0"
                        draggable onDragStart={() => { storyDragI.current = idx; }} onDragEnter={() => { storyDragO.current = idx; }} onDragEnd={onStoryDragEnd} onDragOver={e => e.preventDefault()}>
                        <button onClick={() => setSelectedSceneId(ss.id)}
                          className={`relative block ${storyAspectRatio === '9:16' ? 'w-[52px]' : 'w-[112px]'} rounded-[10px] border overflow-hidden transition-all ${isActive ? 'border-white' : 'border-[var(--line-2)] hover:border-[var(--line-3)] opacity-80 hover:opacity-100'} ${ss.generating ? 'animate-pulse' : ''}`}>
                          <div className={`${storyAspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'} bg-[#111] flex items-center justify-center`}>
                            {ss.videoUrl ? <video src={ss.videoUrl} muted loop autoPlay playsInline className="w-full h-full object-cover" /> : ss.imageUrl ? <img src={ss.imageUrl} alt="" className="w-full h-full object-cover" /> : null}
                          </div>
                          <span className="absolute top-1 left-1 ui-mono text-[9px] text-white bg-black/70 px-1 rounded">{String(idx + 1).padStart(2, '0')}</span>
                          {ss.approved && <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#ededed] text-black flex items-center justify-center">{Ico.check}</span>}
                        </button>
                        {generatedScript.length > 1 && (
                          <button onClick={() => removeStoryScene(ss.id)} aria-label="Remove scene"
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black border border-[var(--line-3)] items-center justify-center text-[var(--fg-2)] hover:text-white hidden group-hover:flex">{Ico.x}</button>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={addStoryScene} aria-label="Add scene"
                    className={`${storyAspectRatio === '9:16' ? 'w-[52px] aspect-[9/16]' : 'w-[112px] aspect-video'} flex-shrink-0 rounded-[10px] border border-dashed border-[var(--line-2)] flex flex-col items-center justify-center gap-1 text-[var(--fg-4)] hover:text-white hover:border-[var(--line-3)] transition-all`}>
                    {Ico.plus}
                    {storyAspectRatio !== '9:16' && <span className="text-[10px]">Add scene</span>}
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="ui-mono text-[11px] text-[var(--fg-3)] hidden sm:inline">{generatedScript.filter(s => s.approved).length}/{generatedScript.length} approved</span>
                  <button onClick={() => setShowExport(true)} disabled={!storyHasApproved} className="ui-btn ui-btn-primary">Export{Ico.arrow}</button>
                </div>
              </div>
            </>)}
          </div>
        )}
      </div>
    )}

    {/* ═══ 2D ANIMATION — SETUP ═══ */}
    {mode === 'cartoon' && !cartoonSetupDone && (
      <div className="flex flex-col h-screen">
        <EditorHeader format="2D Animation" onBack={goHome} steps={['Setup', 'Characters', 'Studio']} current={0} />
        <EditorPage>
          <Intro title="Set up your episode" desc="A premise, a look and the shape of the cut. You'll build the cast next." />

          <Section n={1} title="Premise">
            <TextArea big value={cTitle} onChange={e => setCTitle(e.target.value)} rows={3}
              placeholder="A detective uncovers a midnight conspiracy…" />
          </Section>

          <Section n={2} title="Visual style">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {STYLES.map((s, i) => (
                <StyleCard key={s.value} label={s.label} index={i} active={style === s.value} onClick={() => setStyle(s.value)} />
              ))}
            </div>
          </Section>

          <Section n={3} title="Output">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label>Format</Label>
                <Segmented full value={cAspect} onChange={setCAspect}
                  options={(['16:9', '9:16', '1:1'] as AspectRatio[]).map(a => ({ value: a, label: a, icon: <AspectGlyph a={a} /> }))} />
              </div>
              <div>
                <Label>Quality</Label>
                <Segmented full value={res} onChange={setRes}
                  options={(['480p', '720p'] as Resolution[]).map(r => ({ value: r, label: r }))} />
              </div>
              <div>
                <Label>Scene duration</Label>
                <Segmented full value={cSceneDur} onChange={setCSceneDur}
                  options={([4, 6, 8] as const).map(d => ({ value: d, label: `${d}s`, icon: Ico.clock }))} />
              </div>
              <div>
                <Label>Scene count</Label>
                <Segmented full value={cSceneCount} onChange={setCSceneCount}
                  options={([3, 5, 8] as const).map(n => ({ value: n, label: String(n) }))} />
              </div>
            </div>
          </Section>
        </EditorPage>
        <ActionBar left={<span className="truncate"><span className="text-white font-medium">{cSceneCount} scenes</span> · {cSceneDur}s · {cAspect} · {res}</span>}>
          <button onClick={() => setCartoonSetupDone(true)} disabled={!cTitle.trim()} className="ui-btn ui-btn-primary">Next: Characters{Ico.arrow}</button>
        </ActionBar>
      </div>
    )}

    {/* ═══ 2D ANIMATION FLOW ═══ */}
    {mode === 'cartoon' && cartoonSetupDone && (
    <div className="flex flex-col h-screen">
      <EditorHeader
        format="2D Animation"
        onBack={() => { if (step === 4) setStep(1); else setCartoonSetupDone(false); }}
        steps={['Setup', 'Characters', 'Studio']}
        current={step === 4 ? 2 : 1}
        onStep={i => { if (i === 0) setCartoonSetupDone(false); else if (i === 1) setStep(1); }}
        meta={<span className="ui-chip ui-chip-muted">{cSceneCount} scenes · {cSceneDur}s · {cAspect}</span>}
      />

      <div className="flex-1 overflow-y-auto flex flex-col">

        {/* STEP 1 */}
        {step === 1 && (
          <>
            {(genLoading || genDone) && (
              <Modal width={400}>
                {genLoading ? (
                  <div className="flex flex-col items-center py-10">
                    <Spinner size={18} className="mb-5" />
                    <p className="text-[14px] font-medium">Designing your character…</p>
                    <p className="text-[12px] text-[var(--fg-4)] mt-1">{STYLES.find(x => x.value === style)?.label} style</p>
                  </div>
                ) : (
                  <div>
                    <div className="ui-eyebrow mb-2">{editingChar ? editingChar.name : `Character ${chars.length + 1}`}</div>
                    <h3 className="text-[15px] font-semibold mb-3">Use this character?</h3>
                    <div className="relative aspect-[3/4] bg-[#0a0a0a] rounded-[10px] border border-[var(--line)] overflow-hidden mb-5">
                      {pendingChar?.imageUrl ? (
                        <img src={pendingChar.imageUrl} alt="Generated character" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/15">{Ico.user}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        if (!editingChar && pendingChar) setEditingChar(pendingChar);
                        setGenDone(false);
                        setPendingChar(null);
                      }} className="ui-btn ui-btn-secondary flex-1">Edit prompt</button>
                      <button onClick={confirmChar} className="ui-btn ui-btn-primary flex-1">{Ico.check}Use character</button>
                    </div>
                  </div>
                )}
              </Modal>
            )}

            <EditorPage width={1080}>
              <Intro title="Build your cast" desc="Describe each character once — they stay consistent in every scene. Add as many as the story needs." />
              <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
                <div>
                  <Section n={1} title={editingChar ? `Edit ${editingChar.name}` : `Character ${chars.length + 1}`}>
                    <TextArea big value={prompt} onChange={e => setPrompt(e.target.value)} className="min-h-[170px]"
                      placeholder="A confident 60-year-old male politician in a navy suit. Strong voice, authoritative presence..." />
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                    <div className="mt-3">
                      {photoUrl ? (
                        <div className="relative h-28 rounded-[10px] border border-[var(--line)] overflow-hidden">
                          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                          <span className="absolute bottom-2 left-2 ui-chip">Likeness reference</span>
                          <button onClick={clearPhoto} aria-label="Remove photo" className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white/80 hover:text-white">{Ico.x}</button>
                        </div>
                      ) : (
                        <button onClick={() => fileRef.current?.click()}
                          className="w-full h-[72px] rounded-[10px] border border-dashed border-[var(--line-2)] flex items-center justify-center gap-3 text-[var(--fg-4)] hover:text-white hover:border-[var(--line-3)] transition-colors">
                          {Ico.image}
                          <span className="text-[12.5px]">Upload a photo for likeness</span>
                          <span className="ui-chip ui-chip-muted">Optional</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <button onClick={handleGenChar} disabled={!prompt.trim() || genLoading} className={`ui-btn ${chars.length ? 'ui-btn-secondary' : 'ui-btn-primary'}`}>
                        {Ico.sparkle}{editingChar ? 'Regenerate character' : 'Generate character'}
                      </button>
                      <span className="text-[12px] text-[var(--fg-4)]">{STYLES.find(x => x.value === style)?.label} style</span>
                    </div>
                  </Section>

                  {chars.length > 0 && (
                    <Section n={2} title="Direction" hint="Optional">
                      <TextArea value={videoBrief} onChange={e => setVideoBrief(e.target.value)} className="min-h-[96px]"
                        placeholder="Tell Mave the exact action, mood, camera move, or dialogue. Put exact spoken lines in quotes." />
                    </Section>
                  )}
                </div>

                {/* Cast */}
                <div className="ui-card p-4 lg:sticky lg:top-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-medium">Cast</span>
                    <span className="ui-mono text-[10.5px] text-[var(--fg-4)]">{chars.length} {chars.length === 1 ? 'character' : 'characters'}</span>
                  </div>
                  {chars.length === 0 ? (
                    <div className="rounded-[12px] border border-dashed border-[var(--line-2)] py-10 flex flex-col items-center gap-2 text-white/20">
                      {Ico.user}
                      <span className="text-[12px] text-[var(--fg-4)]">Generated characters appear here</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {chars.map(c => (
                        <div key={c.id} className="relative group">
                          <button onClick={() => openEditChar(c)} className={`w-full rounded-[12px] border overflow-hidden text-left transition-all ${editingChar?.id === c.id ? 'border-white' : 'border-[var(--line)] hover:border-[var(--line-3)]'}`}>
                            <div className="aspect-[3/4] bg-[#111] flex items-center justify-center overflow-hidden text-white/15">
                              {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" /> : Ico.user}
                            </div>
                            <div className="px-2 py-1.5 text-[10.5px] text-[var(--fg-2)] truncate">{c.name}</div>
                          </button>
                          <button onClick={() => setChars(prev => prev.filter(x => x.id !== c.id))} aria-label={`Remove ${c.name}`}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 border border-[var(--line-2)] items-center justify-center text-white/70 hover:text-white hidden group-hover:flex">{Ico.x}</button>
                        </div>
                      ))}
                      <button onClick={() => { setEditingChar(null); resetForm(); }} aria-label="New character"
                        className="aspect-[3/4] rounded-[12px] border border-dashed border-[var(--line-2)] flex items-center justify-center text-[var(--fg-4)] hover:text-white hover:border-[var(--line-3)] transition-colors">
                        {Ico.plus}
                      </button>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-[var(--line)]">
                    <div className="ui-eyebrow !text-[9.5px] mb-1.5">Production</div>
                    <div className="text-[12.5px]">{cSceneCount} scenes · {cSceneDur}s · {cAspect} · {res}</div>
                    <div className="text-[11.5px] text-[var(--fg-4)] truncate mt-0.5">{cTitle}</div>
                  </div>
                </div>
              </div>
            </EditorPage>

            <ActionBar left={chars.length ? <span><span className="text-white font-medium">{chars.length}</span> in cast · ready to animate</span> : <span>Generate at least one character</span>}>
              {chars.length > 0 && (
                <button onClick={handleAutoGenerate} className="ui-btn ui-btn-primary">Generate animation{Ico.arrow}</button>
              )}
            </ActionBar>
          </>
        )}

        {/* Legacy manual scene builder is disabled for the cleaned 2D flow. */}
        {false && step === 2 && (() => {
          const sc = scenes.find(s => s.id === activeSceneId) ?? scenes[0];
          if (!sc) {
            return (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <p className="text-[13px] text-[rgba(255,255,255,0.4)]">No scenes yet.</p>
                <button onClick={addScene} className="px-4 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-all">+ Create your first scene</button>
              </div>
            );
          }
          const idx = scenes.findIndex(s => s.id === sc.id);
          const bg = sc.backgrounds[0];
          const placed = sc.characterPlacements.filter(cp => cp.characterId);
          const canGenerate = !!bg?.description?.trim() && placed.length > 0;
          const aspectBox = sc.aspectRatio === '9:16'
            ? 'aspect-[9/16] h-full max-h-[58vh]'
            : sc.aspectRatio === '1:1'
            ? 'aspect-square max-h-[58vh]'
            : 'aspect-video w-full max-w-[760px]';

          return (
            <div className="flex-1 flex flex-col min-h-0">

              {/* ── MAIN: preview (left) + inspector (right) ── */}
              <div className="flex-1 flex min-h-0 overflow-hidden">

                {/* PREVIEW */}
                <div className="flex-1 flex flex-col min-w-0 p-5 md:p-7">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-medium text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.05)] px-2.5 py-1 rounded-md uppercase tracking-wider">Scene {idx + 1}</span>
                      {sc.approved && (
                        <span className="flex items-center gap-1 text-[11px] text-[rgba(74,222,128,0.8)] font-medium">
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,8 6.5,11.5 13,5"/></svg>
                          Approved
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {(['16:9', '9:16', '1:1'] as AspectRatio[]).map(r => (
                        <button key={r} onClick={() => upScene(sc.id, { aspectRatio: r })} disabled={sc.approved}
                          className={`px-2.5 py-1 text-[10px] rounded-md border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${sc.aspectRatio === r ? 'border-white bg-[rgba(255,255,255,0.06)] text-white' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.6)]'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <div className={`relative rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0d0d0d] overflow-hidden flex items-center justify-center ${aspectBox}`}>
                      {sc.generating ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-white animate-spin" />
                          <span className="text-[12px] text-[rgba(255,255,255,0.4)]">Generating preview…</span>
                        </div>
                      ) : sc.imageUrl ? (
                        <img src={sc.imageUrl || undefined} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2.5 px-8 text-center">
                          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2"/><polygon points="9,7 16,10.5 9,14" fill="rgba(255,255,255,0.08)" stroke="none"/></svg>
                          <span className="text-[12px] text-[rgba(255,255,255,0.28)]">{canGenerate ? 'Ready to generate' : 'Add a background and cast to start'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 mt-4 flex-shrink-0 min-h-[40px]">
                    {sc.error && !sc.generating && <span className="text-[12px] text-[rgba(248,113,113,0.7)] mr-1">{sc.error}</span>}
                    {sc.generating ? null : sc.approved ? (
                      <button onClick={() => editScene(sc.id)} className="px-4 py-2 border border-[rgba(255,255,255,0.12)] rounded-lg text-[12px] text-[rgba(255,255,255,0.6)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">Edit scene</button>
                    ) : sc.imageUrl ? (
                      <>
                        <button onClick={() => generateScenePreview(sc.id)} className="px-4 py-2 border border-[rgba(255,255,255,0.1)] rounded-lg text-[12px] text-[rgba(255,255,255,0.55)] hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-all">Regenerate</button>
                        <button onClick={() => approveScene(sc.id)} className="px-5 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-all">Approve ✓</button>
                      </>
                    ) : (
                      <button onClick={() => generateScenePreview(sc.id)} disabled={!canGenerate} className="px-5 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">Generate Preview</button>
                    )}
                  </div>
                </div>

                {/* INSPECTOR */}
                <div className="w-[340px] flex-shrink-0 border-l border-[rgba(255,255,255,0.08)] flex flex-col min-h-0 overflow-y-auto bg-[#080808]">
                  <div className="p-5 flex flex-col gap-6">

                    {/* BACKGROUND */}
                    <div>
                      <h3 className="text-[11px] font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[1.5px] mb-2.5">Background</h3>
                      <textarea value={bg?.description ?? ''} onChange={e => bg && upBg(sc.id, bg.id, { description: e.target.value })} disabled={sc.approved}
                        className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-[13px] text-white placeholder:text-[rgba(255,255,255,0.2)] outline-none resize-none h-24 focus:border-[rgba(255,255,255,0.15)] transition-colors disabled:opacity-50 leading-relaxed"
                        placeholder="A sunny park with tall trees and a wooden bench…" />
                      {bg?.photoUrl ? (
                        <div className="relative border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden h-20 mt-2">
                          <img src={bg.photoUrl || undefined} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => upBg(sc.id, bg.id, { photoUrl: null })} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-white text-[10px]">×</button>
                        </div>
                      ) : !sc.approved && (
                        <label className="w-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.1)] rounded-lg py-2.5 flex items-center justify-center gap-2 hover:border-[rgba(255,255,255,0.18)] transition-colors cursor-pointer mt-2">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                          <span className="text-[10px] text-[rgba(255,255,255,0.3)]">Reference photo (optional)</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && bg) upBg(sc.id, bg.id, { photoUrl: URL.createObjectURL(f) }); }} />
                        </label>
                      )}
                    </div>

                    {/* CAST */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-[11px] font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[1.5px]">Cast</h3>
                        <span className="text-[10px] text-[rgba(255,255,255,0.25)]">{placed.length} in scene</span>
                      </div>

                      {chars.length === 0 ? (
                        <p className="text-[12px] text-[rgba(255,255,255,0.3)]">No characters yet — go back to add some.</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {chars.map(c => {
                              const inScene = placed.some(p => p.characterId === c.id);
                              return (
                                <button key={c.id} onClick={() => !sc.approved && toggleCast(sc.id, c.id)} disabled={sc.approved}
                                  className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${inScene ? 'border-white bg-[rgba(255,255,255,0.06)] text-white' : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.4)] hover:border-[rgba(255,255,255,0.2)]'}`}>
                                  <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[#161616] flex-shrink-0">
                                    {c.imageUrl ? <img src={c.imageUrl} alt="" className="w-full h-full object-cover object-top" /> : <span className="text-[8px]">{c.name.charAt(0)}</span>}
                                  </span>
                                  {c.name}
                                  {inScene && <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,8 6.5,11.5 13,5"/></svg>}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex flex-col gap-2">
                            {placed.map((cp, pi) => {
                              const ch = chars.find(c => c.id === cp.characterId);
                              if (!ch) return null;
                              const posLabel = slotPositionLabel(pi, placed.length);
                              return (
                                <div key={cp.slot}
                                  draggable={!sc.approved}
                                  onDragStart={() => { dragSlotI.current = { sceneId: sc.id, slot: cp.slot }; }}
                                  onDragEnter={() => { if (dragSlotI.current?.sceneId === sc.id && dragSlotI.current.slot !== cp.slot) { reorderPlacements(sc.id, dragSlotI.current.slot, cp.slot); dragSlotI.current = { sceneId: sc.id, slot: cp.slot }; } }}
                                  onDragEnd={() => { dragSlotI.current = null; }}
                                  onDragOver={e => e.preventDefault()}
                                  className="border border-[rgba(255,255,255,0.06)] rounded-lg p-2.5 bg-[rgba(255,255,255,0.01)]">
                                  <div className="flex items-center gap-2">
                                    {!sc.approved && <svg width="10" height="14" viewBox="0 0 10 16" fill="rgba(255,255,255,0.18)" className="flex-shrink-0 cursor-grab active:cursor-grabbing"><circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/><circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/></svg>}
                                    <div className="w-6 h-6 rounded-md bg-[#151515] border border-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                      {ch.imageUrl ? <img src={ch.imageUrl} alt="" className="w-full h-full object-cover object-top" /> : <span className="text-[9px] text-[rgba(255,255,255,0.4)]">{ch.name.charAt(0)}</span>}
                                    </div>
                                    <span className="text-[12px] font-medium flex-1 min-w-0 truncate">{ch.name}</span>
                                    <span className="text-[9px] text-[rgba(255,255,255,0.25)] capitalize flex-shrink-0">{posLabel}</span>
                                    {!sc.approved && <button onClick={() => toggleCast(sc.id, ch.id)} className="text-[11px] text-[rgba(255,255,255,0.25)] hover:text-[rgba(248,113,113,0.7)] transition-colors flex-shrink-0">✕</button>}
                                  </div>
                                  <textarea value={cp.dialogue} disabled={sc.approved}
                                    onChange={e => upPlacement(sc.id, cp.slot, { dialogue: e.target.value, role: e.target.value.trim() ? 'speaking' : 'silent' })}
                                    className="w-full mt-2 bg-[#131313] border border-[rgba(255,255,255,0.06)] rounded-lg p-2.5 text-[11px] outline-none resize-none h-12 placeholder:text-[rgba(255,255,255,0.18)] focus:border-[rgba(255,255,255,0.12)] transition-colors disabled:opacity-50"
                                    placeholder={`${ch.name}'s line — leave empty for silent`} />
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── FILM STRIP ── */}
              <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] px-5 md:px-7 py-3.5 flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2.5 overflow-x-auto pb-1">
                  {scenes.map((s, i) => {
                    const isActive = s.id === sc.id;
                    return (
                      <div key={s.id} className="relative group flex-shrink-0">
                        <button onClick={() => setActiveSceneId(s.id)}
                          className={`relative w-[116px] rounded-lg border overflow-hidden transition-all ${isActive ? 'border-white' : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.25)]'}`}>
                          <div className="aspect-video bg-[#131313] flex items-center justify-center">
                            {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-full h-full object-cover" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>}
                          </div>
                          <span className="absolute top-1 left-1 text-[9px] font-medium text-white bg-black/60 px-1.5 py-0.5 rounded">{i + 1}</span>
                          {s.approved && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[rgba(74,222,128,0.85)] flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="black" strokeWidth="3"><polyline points="3,8 6.5,11.5 13,5"/></svg></span>}
                        </button>
                        {scenes.length > 1 && (
                          <button onClick={() => setScenes(p => p.filter(x => x.id !== s.id))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black border border-[rgba(255,255,255,0.15)] items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.35)] text-[10px] hidden group-hover:flex">×</button>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={addScene} className="w-[116px] flex-shrink-0 aspect-video rounded-lg border border-dashed border-[rgba(255,255,255,0.12)] flex flex-col items-center justify-center gap-1 hover:border-[rgba(255,255,255,0.25)] transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
                    <span className="text-[9px] text-[rgba(255,255,255,0.3)]">Add Scene</span>
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] text-[rgba(255,255,255,0.35)]">{approvedCount}/{scenes.length} approved</span>
                  <button onClick={() => setStep(3)} disabled={approvedCount === 0} className="px-5 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">Next: Review →</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Legacy review step is disabled for the cleaned 2D flow. */}
        {false && step === 3 && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[820px] mx-auto px-5 md:px-7 py-7">
              <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.55)] uppercase tracking-[1.5px] mb-5">Review your scenes</h2>
              <div className="flex flex-col gap-2.5 mb-8">
                {scenes.filter(s => s.approved).map((sc, idx) => (
                  <div key={sc.id} draggable onDragStart={() => { dragI.current = idx; }} onDragEnter={() => { dragO.current = idx; }} onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}
                    className="border border-[rgba(255,255,255,0.08)] rounded-xl p-4 bg-[#0f0f0f] flex items-center gap-4 cursor-grab active:cursor-grabbing hover:border-[rgba(255,255,255,0.13)] transition-all group">
                    <div className="w-20 h-[45px] rounded-md bg-[#131313] border border-[rgba(255,255,255,0.06)] flex-shrink-0 overflow-hidden">
                      {sc.imageUrl ? <img src={sc.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2"/></svg></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded">Scene {idx + 1}</span>
                        <span className="text-[10px] text-[rgba(255,255,255,0.2)]">{sc.aspectRatio}</span>
                      </div>
                      <p className="text-[12px] text-[rgba(255,255,255,0.55)] truncate">{sc.description}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.1)" className="flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>
                  </div>
                ))}
              </div>
              <div className="border border-[rgba(255,255,255,0.08)] rounded-xl p-5 bg-[#0f0f0f] mb-6">
                <h3 className="text-[11px] font-medium text-[rgba(255,255,255,0.45)] uppercase tracking-[1.5px] mb-4">Settings</h3>
                <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                  <div>
                    <div className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-2">Resolution</div>
                    <div className="flex border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden">
                      {(['480p', '720p', '1080p'] as Resolution[]).map(r => (
                        <button key={r} onClick={() => setRes(r)} className={`px-3.5 py-2 text-[11px] transition-all ${res === r ? 'bg-[rgba(255,255,255,0.08)] text-white' : 'text-[rgba(255,255,255,0.3)]'}`}>
                          <div>{r}</div><div className="text-[9px] text-[rgba(255,255,255,0.2)] mt-0.5">{RESOLUTION_CREDITS[r]} cr/scene</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:ml-auto">
                    <div className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-2">Estimated Total</div>
                    <div className="text-[24px] font-semibold tracking-[-1px]">{totalCr} <span className="text-[12px] font-normal text-[rgba(255,255,255,0.3)]">credits</span></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => handleFinalGenerate()} className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Generate Animation →</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <StudioGenerationView
            title={scenes.find(s => s.approved)?.description || '2D Animation'}
            modeLabel="2D Animation"
            aspect={(scenes.find(s => s.approved)?.aspectRatio || '16:9') as AspectRatio}
            status={genStatus}
            message={genMessage}
            error={genMessage}
            scenes={genScenes.map((s, i) => ({
              scene_number: s.scene_number,
              status: s.status,
              video_url: s.video_url || null,
              title: scenes.filter(scene => scene.approved)[i]?.description || `Scene ${s.scene_number}`,
            }))}
            finalVideo={finalVideoUrl}
            step={genStep}
            totalSteps={genTotalSteps}
            onBack={() => setStep(1)}
            onRetry={handleFinalGenerate}
            onCreateAnother={resetAll}
            downloadHref={finalVideoUrl || undefined}
          />
        )}

        {false && step === 4 && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[860px] mx-auto px-5 md:px-7 py-7">
              <div className="flex items-center gap-3.5 mb-7">
                {genStatus === 'completed' ? <div className="w-10 h-10 rounded-full bg-[rgba(74,222,128,0.08)] flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.7)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div>
                  : genStatus === 'failed' ? <div className="w-10 h-10 rounded-full bg-[rgba(248,113,113,0.08)] flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.7)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
                  : <div className="w-10 h-10 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-white animate-spin" />}
                <div>
                  <h1 className="text-[18px] font-semibold tracking-[-0.4px]">{genStatus === 'completed' ? 'Animation Complete' : genStatus === 'failed' ? 'Generation Failed' : 'Generating...'}</h1>
                  <p className="text-[13px] text-[rgba(255,255,255,0.4)] mt-0.5">{genMessage}</p>
                </div>
              </div>

              {genStatus === 'processing' && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[rgba(255,255,255,0.3)]">Step {genStep} of {genTotalSteps}</span>
                    <span className="text-[11px] text-[rgba(255,255,255,0.5)] tabular-nums">{genProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${genProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                {genScenes.map((s) => (
                  <div key={s.scene_number} className="border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden bg-[#0f0f0f]">
                    <div className="aspect-video bg-[#0e0e0e] flex items-center justify-center relative overflow-hidden">
                      {s.status === 'completed' && s.video_url ? <video src={s.video_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                        : s.status === 'processing' ? <div className="flex flex-col items-center gap-2"><div className="w-7 h-7 rounded-full border-2 border-[rgba(255,255,255,0.06)] border-t-[rgba(255,255,255,0.4)] animate-spin" /><span className="text-[11px] text-[rgba(255,255,255,0.3)]">Rendering...</span></div>
                        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                    </div>
                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 rounded">Scene {s.scene_number}</span>
                        <span className={`text-[10px] capitalize ${s.status === 'completed' ? 'text-[rgba(74,222,128,0.6)]' : s.status === 'processing' ? 'text-[rgba(250,204,21,0.6)]' : 'text-[rgba(255,255,255,0.2)]'}`}>{s.status}</span>
                      </div>
                      {s.status === 'completed' && s.video_url && <button onClick={() => downloadVideo(s.video_url!, `scene-${s.scene_number}.mp4`)} className="text-[11px] text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">Download</button>}
                    </div>
                  </div>
                ))}
              </div>

              {genStatus === 'completed' && finalVideoUrl && (
                <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden bg-[#0f0f0f] mb-6">
                  <video src={finalVideoUrl || undefined} controls autoPlay muted loop playsInline className="w-full aspect-video bg-[#0e0e0e]" />
                  <div className="p-4 flex items-center justify-between">
                    <div><h3 className="text-[15px] font-medium">Final Video Ready</h3><p className="text-[12px] text-[rgba(255,255,255,0.35)] mt-0.5">{genScenes.length} scene{genScenes.length > 1 ? 's' : ''} · {res}</p></div>
                    <button onClick={() => downloadVideo(finalVideoUrl!, 'animave-story.mp4')} className="px-4 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-colors">
                      Download MP4
                    </button>
                  </div>
                </div>
              )}

              {genStatus === 'completed' && <div className="flex justify-center"><button onClick={resetAll} className="px-5 py-2.5 border border-[rgba(255,255,255,0.1)] text-[13px] text-[rgba(255,255,255,0.55)] rounded-lg hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">Create Another</button></div>}
              {genStatus === 'failed' && <div className="flex justify-center gap-3"><button onClick={() => { setStep(3); setGenStatus('idle'); }} className="px-5 py-2.5 border border-[rgba(255,255,255,0.1)] text-[13px] text-[rgba(255,255,255,0.55)] rounded-lg hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">← Back to Review</button><button onClick={() => handleFinalGenerate()} className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Retry</button></div>}
            </div>
          </div>
        )}
      </div>

    </div>
    )}
  </>);
}

export default function CreatePage() { return <Suspense><CreatePageInner /></Suspense>; }
