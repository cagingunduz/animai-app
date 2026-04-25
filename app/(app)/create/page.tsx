'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type Resolution, RESOLUTION_CREDITS, STORYBOOK_CREDITS_PER_SCENE } from '@/lib/types';

type AnimStyle = 'western-cartoon' | 'anime' | 'pixar' | 'comic' | 'retro' | 'custom';
type AspectRatio = '16:9' | '9:16' | '1:1';

interface VoiceLabels { gender?: string; accent?: string; age?: string; use_case?: string; descriptive?: string; }
interface Voice { voice_id: string; name: string; preview_url: string; labels: VoiceLabels; }
interface CharDef { id: string; name: string; prompt: string; style: AnimStyle; voiceId?: string; voiceName?: string; imageUrl?: string; }
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
type CreateMode = 'selecting' | 'theme_select' | 'story' | 'cartoon';
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
  'anime': { gradient: 'from-[#1a1a2e] to-[#16213e]', desc: 'Japanese animation style with expressive characters' },
  'pixar': { gradient: 'from-[#0d1b2a] to-[#1b4332]', desc: '3D rendered, vibrant and family-friendly' },
  'western-cartoon': { gradient: 'from-[#2d1b00] to-[#4a2c00]', desc: 'Bold lines, flat colors, classic cartoon feel' },
  'comic': { gradient: 'from-[#1a0a2e] to-[#2d1b4e]', desc: 'Comic book panels with halftone effects' },
  'retro': { gradient: 'from-[#1a1200] to-[#2e2000]', desc: 'Vintage look, aged textures, warm palette' },
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

function CreatePageInner() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [chars, setChars] = useState<CharDef[]>([]);
  const [scenes, setScenes] = useState<SceneDef[]>([]);
  const [res, setRes] = useState<Resolution>('720p');

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
        slot: startSlot + i, characterId: c.id, role: 'speaking' as const, dialogue: ''
      }));
      return { ...sc, characterPlacements: [...sc.characterPlacements, ...newPlacements] };
    }));
  }, [chars]);

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

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setPhotoUrl(URL.createObjectURL(f)); };
  const clearPhoto = () => { setPhotoUrl(null); if (fileRef.current) fileRef.current.value = ''; };
  const resetForm = () => { setPrompt(''); setStyle('anime'); setSelVoice(null); clearPhoto(); };

  const handleGenChar = async () => {
    if (!prompt.trim()) return;
    setGenLoading(true);
    try {
      const r = await fetch('/api/generate-character', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: prompt, style, photo_url: editingChar?.imageUrl || photoUrl })
      });
      const d = await r.json();
      const voice = voices.find(v => v.voice_id === selVoice);
      setPendingChar({
        id: editingChar ? editingChar.id : d.character_id || uid(),
        name: editingChar ? editingChar.name : `Character ${chars.length + 1}`,
        prompt, style,
        voiceId: selVoice || undefined,
        voiceName: voice?.name,
        imageUrl: d.character_image_url || null
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
    const firstBgId = uid();
    const slots: CharPlacement[] = chars.map((c, i) => ({
      slot: i, characterId: c.id, role: 'speaking' as const, dialogue: '',
    }));
    setScenes(prev => [...prev, {
      id: uid(), description: '', aspectRatio: '16:9',
      characters: chars.map(c => ({ characterId: c.id, role: 'speaking' as const, dialogue: '' })),
      generating: false, approved: false, imageUrl: null, error: null,
      backgrounds: [{ id: firstBgId, description: '', photoUrl: null }],
      selectedBackgroundId: firstBgId,
      expandedBgId: firstBgId,
      characterPlacements: slots,
    }]);
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

  const addBg = (sid: string) => {
    const newId = uid();
    setScenes(p => p.map(s => s.id !== sid ? s : {
      ...s,
      backgrounds: [...s.backgrounds, { id: newId, description: '', photoUrl: null }],
      expandedBgId: newId,
    }));
  };

  const upBg = (sid: string, bgId: string, u: Partial<SceneBg>) => {
    setScenes(p => p.map(s => s.id !== sid ? s : {
      ...s, backgrounds: s.backgrounds.map(b => b.id === bgId ? { ...b, ...u } : b),
    }));
  };

  const removeBg = (sid: string, bgId: string) => {
    setScenes(p => p.map(s => {
      if (s.id !== sid) return s;
      const filtered = s.backgrounds.filter(b => b.id !== bgId);
      return { ...s, backgrounds: filtered, selectedBackgroundId: s.selectedBackgroundId === bgId ? (filtered[0]?.id || null) : s.selectedBackgroundId, expandedBgId: s.expandedBgId === bgId ? null : s.expandedBgId };
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

  const handleFinalGenerate = async () => {
    setStep(4); setGenStatus('processing'); setGenProgress(0); setGenMessage('Starting generation...');
    const approvedScenes = scenes.filter(s => s.approved);
    setGenScenes(approvedScenes.map((_, i) => ({ scene_number: i + 1, status: 'queued' })));
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('animations').insert({
      user_id: user.id, title: approvedScenes[0]?.description?.slice(0, 50) || 'Untitled',
      status: 'processing', scenes_count: approvedScenes.length, resolution: res, lipsync: false,
    });
    try {
      const payload = {
        characters: chars.map(c => ({ id: c.id, description: c.prompt, style: c.style, photo_url: null })),
        scenes: approvedScenes.map(sc => ({
          scene_text: sc.description, aspect_ratio: sc.aspectRatio,
          characters: sc.characters.map(scr => ({
            character_id: scr.characterId, role: scr.role, dialogue: scr.dialogue || null,
            voice_id: chars.find(c => c.id === scr.characterId)?.voiceId || null, framing: 'full_body'
          }))
        })),
        resolution: res, lipsync: false
      };
      const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      setJobId(d.job_id);
      pollRef.current = setInterval(() => pollStatus(d.job_id), 3000);
      pollStatus(d.job_id);
    } catch { setGenStatus('failed'); setGenMessage('Failed to start generation.'); }
  };

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const resetAll = () => {
    setStep(1); setChars([]); setScenes([]); setRes('720p');
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
      if (d.status === 402 || d.error?.includes('kredi')) {
        updateScriptScene(sceneId, { generating: false, error: d.error || 'Yetersiz kredi' });
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

  const selectedScene = generatedScript.find(s => s.id === selectedSceneId) || null;
  const selectedSceneIdx = generatedScript.findIndex(s => s.id === selectedSceneId);
  const storyHasApproved = generatedScript.some(s => s.approved || s.imageUrl);
  const navigateScene = (d: number) => { const ni = selectedSceneIdx + d; if (ni >= 0 && ni < generatedScript.length) setSelectedSceneId(generatedScript[ni].id); };

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
      setGenMessage('Videolar birleştiriliyor...');
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
          setGenMessage('Tamamlandı!');
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

  const roadmap = [{ n: 1, l: 'Characters' }, { n: 2, l: 'Scenes' }, { n: 3, l: 'Review' }, { n: 4, l: 'Generate' }] as const;

  return (<>
    {/* ═══ MODE SELECTION ═══ */}
    {mode === 'selecting' && (
      <div className="flex flex-col h-screen bg-black items-center justify-center px-6 animate-[fadeIn_0.3s_ease]">
        <h1 className="text-[18px] font-medium text-white mb-8">What do you want to create?</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[680px] w-full">
          <button onClick={() => setMode('theme_select')}
            className="bg-[#0f0f0f] border-[1.5px] border-[rgba(255,255,255,0.12)] rounded-xl p-7 text-left hover:border-[rgba(255,255,255,0.3)] transition-all group">
            <div className="flex items-start justify-between mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" className="group-hover:stroke-white transition-colors"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 16h20M7 4v16M17 4v16"/></svg>
              <span className="text-[9px] font-medium bg-white text-black px-2 py-0.5 rounded-full">Most Popular</span>
            </div>
            <h3 className="text-[15px] font-medium text-white mb-0.5">Storytelling</h3>
            <p className="text-[11px] text-[rgba(255,255,255,0.3)] mb-2">YouTube Story Videos</p>
            <p className="text-[12px] text-[rgba(255,255,255,0.4)] leading-relaxed">AI-generated cinematic scenes with camera movement, narrator voice and sound effects</p>
          </button>
          <button onClick={() => setMode('cartoon')}
            className="bg-[#0f0f0f] border border-[rgba(255,255,255,0.08)] rounded-xl p-7 text-left hover:border-[rgba(255,255,255,0.18)] transition-all group">
            <div className="mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" className="group-hover:stroke-white transition-colors"><rect x="2" y="4" width="6" height="16" rx="1"/><rect x="9" y="4" width="6" height="16" rx="1"/><rect x="16" y="4" width="6" height="16" rx="1"/><circle cx="5" cy="10" r="1" fill="rgba(255,255,255,0.2)" stroke="none"/><circle cx="12" cy="10" r="1" fill="rgba(255,255,255,0.2)" stroke="none"/><circle cx="19" cy="10" r="1" fill="rgba(255,255,255,0.2)" stroke="none"/></svg>
            </div>
            <h3 className="text-[15px] font-medium text-white mb-0.5">2D Animation</h3>
            <p className="text-[11px] text-[rgba(255,255,255,0.3)] mb-2">Cartoon Series & Films</p>
            <p className="text-[12px] text-[rgba(255,255,255,0.4)] leading-relaxed">Build animated series with your own characters, scenes and dialogue</p>
          </button>
        </div>
        <p className="text-[11px] text-[rgba(255,255,255,0.2)] mt-6">Both modes support vertical and horizontal export</p>
        <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    )}

    {/* ═══ THEME SELECTION ═══ */}
    {mode === 'theme_select' && (
      <div className="flex flex-col min-h-screen bg-black px-6 py-8 animate-[fadeIn_0.3s_ease] overflow-y-auto">
        <button onClick={() => setMode('selecting')} className="text-[11px] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors mb-8 self-start">← Back</button>
        <div className="max-w-[680px] mx-auto w-full flex flex-col gap-10">
          <div>
            <h1 className="text-[18px] font-medium text-white mb-1">Create a story</h1>
            <p className="text-[12px] text-[rgba(255,255,255,0.35)]">Choose your genre and animation style</p>
          </div>

          {/* Genre */}
          <div>
            <h2 className="text-[11px] font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-[1.5px] mb-3">Genre</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GENRE_EXAMPLES.map(g => {
                const isSelected = customGenre === g.value;
                return (
                  <button key={g.value} onClick={() => setCustomGenre(g.value)}
                    className={`relative p-4 rounded-xl border text-left transition-all ${isSelected ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] hover:border-[rgba(255,255,255,0.16)]'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSelected ? 'white' : 'rgba(255,255,255,0.4)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={g.icon}/></svg>
                      <span className={`text-[13px] font-medium ${isSelected ? 'text-white' : 'text-[rgba(255,255,255,0.6)]'}`}>{g.label}</span>
                    </div>
                    <p className="text-[11px] text-[rgba(255,255,255,0.3)] leading-relaxed">{g.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animation Style */}
          <div>
            <h2 className="text-[11px] font-medium text-[rgba(255,255,255,0.4)] uppercase tracking-[1.5px] mb-3">Animation Style</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLES.map(s => {
                const ex = STYLE_EXAMPLES[s.value];
                const isSelected = storyStyle === s.value;
                const isRecommended = GENRE_RECOMMENDED_STYLE[customGenre] === s.value;
                return (
                  <button key={s.value} onClick={() => setStoryStyle(s.value)}
                    className={`relative rounded-xl border overflow-hidden text-left transition-all ${isSelected ? (isRecommended ? 'border-red-500' : 'border-white') : isRecommended ? 'border-red-500/40 hover:border-red-500' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'}`}>
                    {isRecommended && (
                      <span className="absolute top-2 right-2 z-10 text-[9px] font-medium bg-red-500 text-white px-1.5 py-0.5 rounded-full">Recommended</span>
                    )}
                    <div className={`h-16 bg-gradient-to-br ${ex.gradient} flex items-center justify-center`}>
                      <span className="text-[22px] font-black text-white opacity-20 select-none">{s.label[0]}</span>
                    </div>
                    <div className="p-3 bg-[#0f0f0f]">
                      <p className={`text-[13px] font-medium mb-0.5 ${isSelected ? (isRecommended ? 'text-red-400' : 'text-white') : 'text-[rgba(255,255,255,0.6)]'}`}>{s.label}</p>
                      <p className="text-[10px] text-[rgba(255,255,255,0.3)] leading-relaxed">{ex.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => { setStoryTheme('custom'); setMode('story'); }}
            className="w-full py-3 rounded-xl bg-white text-black text-[14px] font-medium hover:bg-[rgba(255,255,255,0.9)] transition-colors">
            Continue
          </button>
        </div>
        <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    )}

    {/* ═══ STORY MODE ═══ */}
    {mode === 'story' && (
      <div className="flex flex-col h-screen bg-black">
        {/* Roadmap */}
        <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.1)] sticky top-0 z-30 bg-black">
          <div className="max-w-[560px] mx-auto px-6 py-4 flex items-center">
            <button onClick={() => setMode('theme_select')} className="text-[11px] text-[rgba(255,255,255,0.25)] hover:text-white mr-3 flex-shrink-0 transition-colors">←</button>
            <span className="text-[10px] font-medium text-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded mr-3 flex-shrink-0">{themeLabel}</span>
            {userCredits !== null && <span className="text-[10px] text-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded mr-3 flex-shrink-0 ml-auto">{userCredits.toLocaleString()} cr</span>}
            {[{ n: 1, l: 'Setup' }, { n: 2, l: 'Structure' }, { n: 3, l: 'Timeline' }].map((s, i) => (
              <div key={s.n} className="flex items-center flex-1 last:flex-initial">
                <button onClick={() => { if (s.n <= storyStep) setStoryStep(s.n as 1|2|3); }} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border transition-all ${storyStep === s.n ? 'bg-white text-black border-white' : storyStep > s.n ? 'border-[rgba(255,255,255,0.25)] text-[rgba(255,255,255,0.5)]' : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.25)]'}`}>
                    {storyStep > s.n ? <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,8 6.5,11.5 13,5"/></svg> : s.n}
                  </div>
                  <span className={`text-[12px] hidden sm:inline ${storyStep === s.n ? 'text-white font-medium' : 'text-[rgba(255,255,255,0.25)]'}`}>{s.l}</span>
                </button>
                {i < 2 && <div className={`flex-1 h-px mx-3 ${storyStep > s.n ? 'bg-[rgba(255,255,255,0.2)]' : 'bg-[rgba(255,255,255,0.06)]'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* ── STEP 1: Setup ── */}
          {storyStep === 1 && (
            <div className="flex flex-col flex-1 min-h-0 animate-[fadeIn_0.3s_ease]">
              <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                <div className="md:w-1/2 p-5 md:p-7 flex flex-col gap-5 overflow-y-auto">
                  <div>
                    <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.55)] uppercase tracking-[1.5px] mb-3">Story title or topic</h2>
                    <textarea value={storyTitle} onChange={e => setStoryTitle(e.target.value)}
                      className="w-full min-h-[120px] bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 text-[15px] text-white placeholder:text-[rgba(255,255,255,0.2)] outline-none resize-none focus:border-[rgba(255,255,255,0.18)] transition-colors leading-relaxed"
                      placeholder={GENRE_EXAMPLES.find(g => g.value === customGenre)?.placeholder ?? 'Describe your story topic...'} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setBlurFaces(!blurFaces)} className={`relative w-10 h-5 rounded-full transition-all ${blurFaces ? 'bg-white' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${blurFaces ? 'left-[22px] bg-black' : 'left-0.5 bg-[rgba(255,255,255,0.3)]'}`} />
                    </button>
                    <div>
                      <span className="text-[12px] text-[rgba(255,255,255,0.6)]">Blur faces</span>
                      <span className="text-[10px] text-[rgba(255,255,255,0.25)] ml-2">Recommended for crime & mystery</span>
                    </div>
                  </div>
                  {/* Aspect ratio */}
                  <div>
                    <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.55)] uppercase tracking-[1.5px] mb-2">Format</h2>
                    <div className="flex gap-2">
                      {([
                        { value: '9:16', label: 'Vertical', sub: 'TikTok / Reels', icon: 'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1z' },
                        { value: '16:9', label: 'Horizontal', sub: 'YouTube', icon: 'M2 7h20a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V8a1 1 0 011-1z' },
                      ] as const).map(r => (
                        <button key={r.value} onClick={() => setStoryAspectRatio(r.value)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border flex-1 transition-all ${storyAspectRatio === r.value ? 'border-white bg-[rgba(255,255,255,0.05)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={storyAspectRatio === r.value ? 'white' : 'rgba(255,255,255,0.3)'} strokeWidth="1.5"><path d={r.icon}/></svg>
                          <div className="text-left">
                            <div className={`text-[12px] font-medium ${storyAspectRatio === r.value ? 'text-white' : 'text-[rgba(255,255,255,0.5)]'}`}>{r.label}</div>
                            <div className="text-[10px] text-[rgba(255,255,255,0.25)]">{r.sub}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Global feature toggles */}
                  <div className="flex flex-col gap-2 mt-1">
                    {[
                      { key: 'camera', label: 'Camera movement', desc: 'Ken Burns zoom effect', value: globalCameraMove, set: setGlobalCameraMove },
                      { key: 'narrator', label: 'Narrator voice', desc: 'AI voice reads the script', value: globalNarrator, set: setGlobalNarrator },
                      { key: 'subtitles', label: 'Subtitles', desc: 'Word-by-word captions', value: globalSubtitles, set: setGlobalSubtitles },
                    ].map(({ key, label, desc, value, set }) => (
                      <div key={key} className="flex items-center gap-3">
                        <button onClick={() => set(!value)} className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${value ? 'bg-white' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${value ? 'left-[22px] bg-black' : 'left-0.5 bg-[rgba(255,255,255,0.3)]'}`} />
                        </button>
                        <div>
                          <span className="text-[12px] text-[rgba(255,255,255,0.6)]">{label}</span>
                          <span className="text-[10px] text-[rgba(255,255,255,0.25)] ml-2">{desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right: voice picker */}
                <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.1)] flex flex-col min-h-0 overflow-hidden">
                  <div className="p-5 md:p-7 pb-3 flex-shrink-0">
                    <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.55)] uppercase tracking-[1.5px] mb-1">Narrator voice</h2>
                    <p className="text-[11px] text-[rgba(255,255,255,0.25)]">Select a voice for the narration</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 md:px-5 py-1 min-h-0">
                    {voices.length === 0 ? (
                      <div className="flex items-center justify-center py-12"><div className="w-5 h-5 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-[rgba(255,255,255,0.35)] animate-spin" /></div>
                    ) : voices.map((v, idx) => (
                      <button key={v.voice_id} onClick={() => setStoryNarratorVoiceId(v.voice_id === storyNarratorVoiceId ? null : v.voice_id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all mb-1 ${storyNarratorVoiceId === v.voice_id ? 'bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.15)]' : 'border border-transparent hover:bg-[rgba(255,255,255,0.04)]'}`}>
                        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[14px] font-bold text-white" style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>{v.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-[rgba(255,255,255,0.9)]">{v.name}</div>
                          <div className="text-[11px] text-[rgba(255,255,255,0.35)] capitalize">{v.labels.gender}{v.labels.accent ? ` · ${v.labels.accent}` : ''} · {v.labels.descriptive}</div>
                        </div>
                        {storyNarratorVoiceId === v.voice_id && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5"><polyline points="3,8 6.5,11.5 13,5"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.1)] px-5 md:px-7 py-3 flex justify-end bg-[#0f0f0f]">
                <button onClick={() => setStoryStep(2)} disabled={!storySetupValid} className="px-5 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">Next →</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Structure ── */}
          {storyStep === 2 && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-[600px] mx-auto px-5 md:px-7 py-10 animate-[fadeIn_0.3s_ease]">
                <h2 className="text-[16px] font-medium text-white mb-2">How should we build it?</h2>
                <p className="text-[13px] text-[rgba(255,255,255,0.4)] mb-8">Choose how you want to structure your story.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <button onClick={() => setStoryStructure('auto')} className={`p-6 rounded-xl border text-left transition-all ${storyStructure === 'auto' ? 'border-white bg-[rgba(255,255,255,0.04)]' : 'border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] hover:border-[rgba(255,255,255,0.18)]'}`}>
                    <h3 className="text-[14px] font-medium text-white mb-2">Build it for me</h3>
                    <p className="text-[12px] text-[rgba(255,255,255,0.4)] leading-relaxed mb-5">We'll write a full cinematic script with hook, rising action, climax and resolution.</p>
                    <div className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-2">Video length</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[1, 2, 3, 5, 10].map(d => (<button key={d} onClick={e => { e.stopPropagation(); setStoryStructure('auto'); setStoryDuration(d); }} className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${storyStructure === 'auto' && storyDuration === d ? 'bg-white text-black font-medium' : 'border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.4)]'}`}>{d} min</button>))}
                    </div>
                    <p className="text-[9px] text-[rgba(255,255,255,0.2)] mt-2.5">{durationSceneNote(storyDuration)}</p>
                  </button>
                  <button onClick={() => setStoryStructure('manual')} className={`p-6 rounded-xl border text-left transition-all ${storyStructure === 'manual' ? 'border-white bg-[rgba(255,255,255,0.04)]' : 'border-[rgba(255,255,255,0.08)] bg-[#0f0f0f] hover:border-[rgba(255,255,255,0.18)]'}`}>
                    <h3 className="text-[14px] font-medium text-white mb-2">I'll write my own</h3>
                    <p className="text-[12px] text-[rgba(255,255,255,0.4)] leading-relaxed">Start with a blank timeline and build scenes manually.</p>
                  </button>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { if (storyStructure === 'auto') { setStoryStep(3); handleGenerateScript(); } else if (storyStructure === 'manual') { goToTimelineFromScript(); } }} disabled={!storyStructure}
                    className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">
                    {storyStructure === 'auto' ? 'Generate Script →' : storyStructure === 'manual' ? 'Start Building →' : 'Select an option'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Timeline Editor ── */}
          {storyStep === 3 && (
            <div className="flex flex-col flex-1 min-h-0 animate-[fadeIn_0.3s_ease]">
              {/* Script gen overlay */}
              {storyGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-[rgba(255,255,255,0.06)] border-t-white animate-spin mb-5" />
                  <h2 className="text-[16px] font-medium text-white mb-2">Writing your script...</h2>
                  <p className="text-[13px] text-[rgba(255,255,255,0.35)]">{durationSceneNote(storyDuration)}</p>
                </div>
              )}
              {storyError && !storyGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[rgba(248,113,113,0.08)] flex items-center justify-center mb-5"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.7)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
                  <p className="text-[14px] text-[rgba(248,113,113,0.7)] mb-4">{storyError}</p>
                  <button onClick={handleGenerateScript} className="px-5 py-2 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Retry</button>
                </div>
              )}

              {!storyGenerating && !storyError && generatedScript.length > 0 && (<>
                {/* Export modal */}
                {showExport && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-[380px] bg-[#0f0f0f] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mx-4">
                      <h3 className="text-[15px] font-medium text-white mb-4">Ready to generate video</h3>
                      <div className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-2">Resolution</div>
                      <div className="flex border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden mb-4">
                        {(['480p', '720p', '1080p'] as Resolution[]).map(r => (<button key={r} onClick={() => setExportRes(r)} className={`flex-1 py-2 text-[11px] transition-all ${exportRes === r ? 'bg-[rgba(255,255,255,0.08)] text-white' : 'text-[rgba(255,255,255,0.3)]'}`}>{r}<div className="text-[8px] text-[rgba(255,255,255,0.15)] mt-0.5">{RESOLUTION_CREDITS[r]} cr</div></button>))}
                      </div>
                      <div className="text-[12px] text-[rgba(255,255,255,0.4)] mb-4">
                        {generatedScript.filter(s => s.sceneDescription.trim()).every(s => s.videoUrl)
                          ? <span className="text-[rgba(74,222,128,0.7)]">Tüm sahneler hazır — export ücretsiz</span>
                          : <span>Eksik sahneler üretilecek · {generatedScript.filter(s => s.sceneDescription.trim() && !s.videoUrl).length} sahne kaldı</span>
                        }
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setShowExport(false)} className="flex-1 py-2.5 border border-[rgba(255,255,255,0.1)] rounded-lg text-[13px] text-[rgba(255,255,255,0.5)] hover:text-white transition-all">Cancel</button>
                        <button onClick={handleStoryExport} className="flex-1 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Generate Video →</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TOP BAR */}
                <div className="flex-shrink-0 h-[48px] border-b border-[rgba(255,255,255,0.08)] px-5 flex items-center justify-between bg-[#0a0a0a]">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStoryStep(2)} className="text-[11px] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors">← Back</button>
                    <span className="text-[10px] text-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded">{themeLabel}</span>
                    <span className="text-[11px] text-[rgba(255,255,255,0.25)]">{generatedScript.length} scenes</span>
                  </div>
                  <button onClick={() => setShowExport(true)} disabled={!storyHasApproved}
                    className="px-4 py-1.5 bg-white text-black text-[11px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">Export →</button>
                </div>

                {/* MAIN: Preview + Editor */}
                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                  {/* LEFT — Video Preview */}
                  <div className="md:w-[52%] flex flex-col bg-[#080808] relative">
                    <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden">
                      {selectedScene?.videoUrl ? (
                        <video
                          ref={storyVideoRef}
                          src={selectedScene.videoUrl}
                          loop
                          playsInline
                          onPlay={() => setStoryVideoPlaying(true)}
                          onPause={() => setStoryVideoPlaying(false)}
                          className="max-w-full max-h-full rounded-lg object-contain cursor-pointer"
                          onClick={() => {
                            const v = storyVideoRef.current;
                            if (!v) return;
                            storyVideoPlaying ? v.pause() : v.play();
                          }}
                        />
                      ) : selectedScene?.imageUrl ? (
                        <img src={selectedScene.imageUrl} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
                      ) : (
                        <div className={`w-full ${storyAspectRatio === '9:16' ? 'aspect-[9/16] max-w-[280px]' : 'aspect-[16/9] max-w-[420px]'} bg-[#0a0a0a] rounded-lg border border-[rgba(255,255,255,0.05)] flex items-center justify-center`}>
                          {selectedScene?.generating ? (<div className="flex flex-col items-center gap-2"><div className="w-6 h-6 rounded-full border-2 border-[rgba(255,255,255,0.06)] border-t-[rgba(255,255,255,0.3)] animate-spin" /><span className="text-[10px] text-[rgba(255,255,255,0.2)]">Generating...</span></div>
                          ) : (<span className="text-[14px] text-[rgba(255,255,255,0.08)] font-medium">{selectedScene ? selectedScene.sceneNumber : ''}</span>)}
                        </div>
                      )}
                      {selectedScene && <span className="absolute top-5 left-5 text-[9px] font-medium text-[rgba(255,255,255,0.3)] bg-[rgba(0,0,0,0.5)] px-2 py-0.5 rounded">Scene {selectedSceneIdx + 1} / {generatedScript.length}</span>}
                    </div>
                    {/* Nav bar */}
                    <div className="flex-shrink-0 h-[40px] bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-5 absolute bottom-0 left-0 right-0">
                      <button onClick={() => navigateScene(-1)} disabled={selectedSceneIdx <= 0} className="text-[rgba(255,255,255,0.3)] hover:text-white disabled:opacity-20 transition-colors"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><polygon points="10,2 4,8 10,14"/></svg></button>
                      {selectedScene?.videoUrl ? (
                        <button onClick={() => { const v = storyVideoRef.current; if (!v) return; storyVideoPlaying ? v.pause() : v.play(); }} className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">
                          {storyVideoPlaying
                            ? <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>
                            : <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><polygon points="3,1 14,8 3,15"/></svg>
                          }
                        </button>
                      ) : (
                        <span className="text-[10px] text-[rgba(255,255,255,0.35)] tabular-nums">{selectedSceneIdx + 1} of {generatedScript.length}</span>
                      )}
                      <button onClick={() => navigateScene(1)} disabled={selectedSceneIdx >= generatedScript.length - 1} className="text-[rgba(255,255,255,0.3)] hover:text-white disabled:opacity-20 transition-colors"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><polygon points="6,2 12,8 6,14"/></svg></button>
                    </div>
                  </div>

                  {/* RIGHT — Scene Editor */}
                  <div className="md:w-[48%] border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.08)] overflow-y-auto bg-[#0f0f0f]">
                    {selectedScene ? (
                      <div className="p-5 flex flex-col gap-4">
                        <input value={selectedScene.title} onChange={e => updateScriptScene(selectedScene.id, { title: e.target.value })} className="bg-transparent text-[15px] font-medium text-white outline-none border-b border-transparent focus:border-[rgba(255,255,255,0.1)] pb-1 transition-colors" />
                        <div className="border-t border-[rgba(255,255,255,0.05)]" />
                        <div><div className="text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider mb-1.5">Narrator</div>
                          <textarea value={selectedScene.narratorText} onChange={e => updateScriptScene(selectedScene.id, { narratorText: e.target.value })} className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-[13px] text-white outline-none resize-none min-h-[70px] focus:border-[rgba(255,255,255,0.15)] transition-colors leading-relaxed" /></div>
                        <div><div className="text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider mb-1.5">Scene description</div>
                          <textarea value={selectedScene.sceneDescription} onChange={e => updateScriptScene(selectedScene.id, { sceneDescription: e.target.value })} className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-[12px] text-[rgba(255,255,255,0.6)] outline-none resize-none min-h-[60px] focus:border-[rgba(255,255,255,0.15)] transition-colors leading-relaxed" /></div>
                        {/* Camera movement + Narrator toggles */}
                        <div className="flex gap-4">
                          <button onClick={() => updateScriptScene(selectedScene.id, { kenBurns: !selectedScene.kenBurns })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] transition-all ${selectedScene.kenBurns ? 'border-white text-white' : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.35)]'}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.069A1 1 0 0121 8.871v6.258a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
                            Camera move
                          </button>
                          <button onClick={() => updateScriptScene(selectedScene.id, { includeNarrator: !selectedScene.includeNarrator })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] transition-all ${selectedScene.includeNarrator ? 'border-white text-white' : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.35)]'}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                            Narrator
                          </button>
                          <button onClick={() => updateScriptScene(selectedScene.id, { includeSubtitles: !selectedScene.includeSubtitles })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] transition-all ${selectedScene.includeSubtitles ? 'border-white text-white' : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.35)]'}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h4M13 15h4M7 11h2M11 11h6"/></svg>
                            Subtitles
                          </button>
                        </div>
                        <div className="border-t border-[rgba(255,255,255,0.05)] pt-4">
                          {selectedScene.generating ? (<div className="flex items-center gap-2.5"><div className="w-4 h-4 rounded-full border-2 border-[rgba(255,255,255,0.06)] border-t-white animate-spin" /><span className="text-[12px] text-[rgba(255,255,255,0.4)]">Generating...</span></div>
                          ) : selectedScene.error ? (<div className="flex items-center gap-2"><span className="text-[11px] text-[rgba(248,113,113,0.6)]">{selectedScene.error}</span><button onClick={() => generateStoryScenePreview(selectedScene.id)} className="text-[11px] text-[rgba(255,255,255,0.5)] hover:text-white underline">Retry</button></div>
                          ) : selectedScene.imageUrl ? (
                            <div className="flex flex-col gap-2.5">
                              <div className="h-20 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)] overflow-hidden"><img src={selectedScene.imageUrl} alt="" className="w-full h-full object-cover" /></div>
                              <button onClick={() => generateStoryScenePreview(selectedScene.id)} className="self-start px-3 py-1.5 border border-[rgba(255,255,255,0.1)] rounded-md text-[11px] text-[rgba(255,255,255,0.5)] hover:text-white transition-all">Regenerate</button>
                            </div>
                          ) : (
                            <button onClick={() => generateStoryScenePreview(selectedScene.id)} disabled={!selectedScene.sceneDescription.trim()} className="px-4 py-2 border border-[rgba(255,255,255,0.12)] rounded-lg text-[12px] text-[rgba(255,255,255,0.55)] hover:text-white hover:border-[rgba(255,255,255,0.2)] disabled:opacity-20 disabled:cursor-not-allowed transition-all">Generate Preview</button>
                          )}
                        </div>
                        <div className="border-t border-[rgba(255,255,255,0.05)] pt-3 flex items-center gap-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${selectedScene.approved ? 'bg-[rgba(74,222,128,0.1)] text-[rgba(74,222,128,0.6)]' : selectedScene.generating ? 'bg-[rgba(250,204,21,0.08)] text-[rgba(250,204,21,0.5)]' : selectedScene.imageUrl ? 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.3)]' : 'bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.2)]'}`}>
                            {selectedScene.approved ? '✓ Approved' : selectedScene.generating ? 'Generating' : selectedScene.imageUrl ? 'Ready' : 'Queued'}
                          </span>
                          {selectedScene.imageUrl && !selectedScene.approved && (<button onClick={() => approveStoryScene(selectedScene.id)} className="text-[11px] text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.1)] px-2.5 py-1 rounded-md hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">Approve</button>)}
                          {selectedScene.approved && (<button onClick={() => unapproveStoryScene(selectedScene.id)} className="text-[11px] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors">Edit</button>)}
                        </div>
                      </div>
                    ) : (<div className="flex-1 flex items-center justify-center h-full"><p className="text-[13px] text-[rgba(255,255,255,0.2)]">Select a scene</p></div>)}
                  </div>
                </div>

                {/* TIMELINE STRIP */}
                <div className="flex-shrink-0 h-[100px] border-t border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] flex items-center overflow-x-auto px-3 gap-2">
                  {generatedScript.map((ss, idx) => (
                    <div key={ss.id} draggable onDragStart={() => { storyDragI.current = idx; }} onDragEnter={() => { storyDragO.current = idx; }} onDragEnd={onStoryDragEnd} onDragOver={e => e.preventDefault()}
                      onClick={() => setSelectedSceneId(ss.id)}
                      className={`flex-shrink-0 w-[90px] h-[76px] rounded-lg border cursor-pointer transition-all flex flex-col overflow-hidden ${ss.id === selectedSceneId ? 'border-white border-[1.5px]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'} ${ss.generating ? 'animate-pulse' : ''}`}>
                      <div className="h-[52px] bg-[#111] flex items-center justify-center relative overflow-hidden">
                        {ss.videoUrl ? <video src={ss.videoUrl} muted loop autoPlay playsInline className="w-full h-full object-cover" /> : ss.imageUrl ? <img src={ss.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[12px] text-[rgba(255,255,255,0.12)] font-medium">{ss.sceneNumber}</span>}
                        {ss.approved && <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[rgba(74,222,128,0.2)] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[rgba(74,222,128,0.7)]" /></div>}
                      </div>
                      <div className="h-[24px] bg-[#111] flex items-center justify-center px-1 border-t border-[rgba(255,255,255,0.04)]"><span className="text-[9px] text-[rgba(255,255,255,0.3)] truncate">{ss.title}</span></div>
                    </div>
                  ))}
                  <button onClick={addStoryScene} className="flex-shrink-0 w-[90px] h-[76px] rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] flex items-center justify-center hover:border-[rgba(255,255,255,0.18)] transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </>)}
            </div>
          )}
        </div>
        <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    )}

    {/* ═══ 2D ANIMATION FLOW ═══ */}
    {mode === 'cartoon' && (
    <div className="flex flex-col h-screen bg-black">
      <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.1)] sticky top-0 z-30 bg-black">
        <div className="max-w-[680px] mx-auto px-6 py-4 flex items-center">
          <button onClick={() => setMode('selecting')} className="text-[11px] text-[rgba(255,255,255,0.25)] hover:text-white mr-4 flex-shrink-0 transition-colors">←</button>
          {roadmap.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-initial">
              <button disabled={s.n === 4} onClick={() => {
                if (s.n === 1) setStep(1);
                if (s.n === 2 && chars.length > 0) setStep(2);
                if (s.n === 3 && approvedCount > 0) setStep(3);
              }} className="flex items-center gap-2 disabled:cursor-default">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium border transition-all ${step === s.n ? 'bg-white text-black border-white' : step > s.n ? 'border-[rgba(255,255,255,0.25)] text-[rgba(255,255,255,0.5)]' : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.25)]'}`}>
                  {step > s.n ? <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,8 6.5,11.5 13,5"/></svg> : s.n}
                </div>
                <span className={`text-[12px] hidden sm:inline ${step === s.n ? 'text-white font-medium' : 'text-[rgba(255,255,255,0.25)]'}`}>{s.l}</span>
              </button>
              {i < 3 && <div className={`flex-1 h-px mx-3 ${step > s.n ? 'bg-[rgba(255,255,255,0.2)]' : 'bg-[rgba(255,255,255,0.06)]'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">

        {/* STEP 1 */}
        {step === 1 && (
          <div className="flex flex-col flex-1 min-h-0 animate-[fadeIn_0.3s_ease]">
            {(genLoading || genDone) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-[400px] bg-[#0f0f0f] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mx-4">
                  {genLoading ? (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-10 h-10 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-white animate-spin mb-4" />
                      <p className="text-[14px] text-[rgba(255,255,255,0.55)]">Generating your character...</p>
                    </div>
                  ) : (
                    <div>
                      <div className="aspect-[3/4] bg-[#161616] rounded-[10px] border border-[rgba(255,255,255,0.08)] overflow-hidden mb-5">
                        {pendingChar?.imageUrl ? (
                          <img src={pendingChar.imageUrl} alt="Generated character" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => {
                          if (!editingChar && pendingChar) setEditingChar(pendingChar);
                          setGenDone(false);
                          setPendingChar(null);
                        }} className="flex-1 py-2.5 border border-[rgba(255,255,255,0.12)] rounded-lg text-[13px] text-[rgba(255,255,255,0.6)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">← Edit</button>
                        <button onClick={confirmChar} className="flex-1 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Use this character →</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
              <div className="md:w-1/2 p-5 md:p-7 flex flex-col gap-4 overflow-y-auto">
                <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.55)] uppercase tracking-[1.5px]">Describe your character</h2>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  className="min-h-[160px] w-full bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 text-[15px] text-white placeholder:text-[rgba(255,255,255,0.22)] outline-none resize-none focus:border-[rgba(255,255,255,0.18)] transition-colors leading-relaxed"
                  placeholder="A confident 60-year-old male politician in a navy suit. Strong voice, authoritative presence..." />
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  {photoUrl ? (
                    <div className="relative border border-[rgba(255,255,255,0.1)] rounded-[10px] overflow-hidden">
                      <img src={photoUrl} alt="" className="w-full h-28 object-cover" />
                      <button onClick={clearPhoto} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-[rgba(255,255,255,0.7)] hover:text-white text-xs">×</button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} className="w-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.12)] rounded-[10px] py-5 flex flex-col items-center gap-2 hover:border-[rgba(255,255,255,0.22)] transition-colors group">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" className="group-hover:stroke-[rgba(255,255,255,0.4)] transition-colors"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <span className="text-[12px] text-[rgba(255,255,255,0.3)] group-hover:text-[rgba(255,255,255,0.5)]">Upload a photo for likeness</span>
                      <span className="text-[9px] text-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.08)] rounded-full px-2 py-0.5">Optional</span>
                    </button>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-2">Animation Style</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLES.map(s => (
                      <button key={s.value} onClick={() => setStyle(s.value)}
                        className={`px-3 py-1.5 rounded-full text-[11px] transition-all ${style === s.value ? 'bg-white text-black font-medium' : 'border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.45)] hover:border-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.7)]'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.1)] flex flex-col min-h-0 overflow-hidden">
                <div className="p-5 md:p-7 pb-3 flex flex-col gap-3 flex-shrink-0">
                  <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.55)] uppercase tracking-[1.5px]">Select a voice</h2>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input type="text" value={vSearch} onChange={e => setVSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg text-[13px] text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none focus:border-[rgba(255,255,255,0.18)] transition-colors"
                      placeholder="Search by name..." />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {FILTER_OPTIONS.map(f => (
                      <button key={f.key} onClick={() => toggleFilter(f.key)}
                        className={`px-2.5 py-1 rounded-full text-[10px] border transition-all ${activeFilters.has(f.key) ? 'bg-white text-black border-white font-medium' : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.35)] hover:border-[rgba(255,255,255,0.18)]'}`}>
                        {f.label}
                      </button>
                    ))}
                    {activeFilters.size > 0 && <button onClick={() => setActiveFilters(new Set())} className="px-2 py-1 text-[10px] text-[rgba(255,255,255,0.3)] hover:text-white">Clear</button>}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 md:px-3 py-1 min-h-0">
                  {voices.length === 0 ? (
                    <div className="flex items-center justify-center py-12"><div className="w-5 h-5 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-[rgba(255,255,255,0.35)] animate-spin" /></div>
                  ) : filteredV.length === 0 ? (
                    <div className="flex flex-col items-center py-12">
                      <p className="text-[13px] text-[rgba(255,255,255,0.3)]">No voices match.</p>
                      <button onClick={() => { setVSearch(''); setActiveFilters(new Set()); }} className="text-[12px] text-[rgba(255,255,255,0.45)] hover:text-white mt-2">Clear filters</button>
                    </div>
                  ) : filteredV.map((v, idx) => (
                    <button key={v.voice_id} onClick={() => setSelVoice(v.voice_id === selVoice ? null : v.voice_id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${selVoice === v.voice_id ? 'bg-[rgba(255,255,255,0.06)] border-l-2 border-l-white' : 'hover:bg-[rgba(255,255,255,0.04)] border-l-2 border-l-transparent'}`}>
                      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-semibold text-white" style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>{v.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[rgba(255,255,255,0.9)]">{v.name}</div>
                        <div className="text-[11px] text-[rgba(255,255,255,0.35)] truncate">{[v.labels.gender, v.labels.accent, v.labels.age, v.labels.descriptive].filter(Boolean).join(' · ')}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handlePlayVoice(v.voice_id, v.preview_url); }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${playingId === v.voice_id ? 'bg-white text-black' : 'border border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.35)] hover:text-white'}`}>
                        {playingId === v.voice_id
                          ? <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx=".5"/><rect x="6" y="1" width="3" height="8" rx=".5"/></svg>
                          : <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><polygon points="3,0 10,5 3,10"/></svg>}
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {chars.length > 0 && (
              <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.1)] px-5 md:px-7 py-4">
                <div className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-2.5">Characters ({chars.length})</div>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {chars.map(c => (
                    <div key={c.id} className="relative group w-[100px] flex-shrink-0">
                      <button onClick={() => openEditChar(c)} className="w-full border border-[rgba(255,255,255,0.1)] rounded-[10px] overflow-hidden hover:border-[rgba(255,255,255,0.25)] transition-all bg-[#0f0f0f] text-left">
                        <div className="h-[68px] bg-[#131313] flex items-center justify-center overflow-hidden">
                          {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>}
                        </div>
                        <div className="px-2 py-1.5 text-[10px] text-center text-[rgba(255,255,255,0.5)] truncate">{c.name}</div>
                      </button>
                      <button onClick={() => setChars(prev => prev.filter(x => x.id !== c.id))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 border border-[rgba(255,255,255,0.1)] items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.3)] transition-all text-[10px] hidden group-hover:flex">×</button>
                    </div>
                  ))}
                  <button onClick={resetForm} className="w-[100px] h-[96px] flex-shrink-0 border border-dashed border-[rgba(255,255,255,0.1)] rounded-[10px] flex items-center justify-center hover:border-[rgba(255,255,255,0.18)] transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </div>
            )}

            <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.1)] px-5 md:px-7 py-3 flex items-center justify-between bg-[#0f0f0f]">
              <span className="text-[11px] text-[rgba(255,255,255,0.35)]">{editingChar ? editingChar.name : `Character ${chars.length + 1}`}</span>
              <div className="flex gap-2.5">
                <button onClick={handleGenChar} disabled={!prompt.trim() || genLoading}
                  className="px-4 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">Generate Character →</button>
                {chars.length > 0 && (
                  <button onClick={() => { if (scenes.length === 0) addScene(); setStep(2); }}
                    className="px-4 py-2 border border-[rgba(255,255,255,0.12)] text-[12px] text-[rgba(255,255,255,0.6)] rounded-lg hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">Next: Scenes →</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[820px] mx-auto px-5 md:px-7 py-7 animate-[fadeIn_0.3s_ease]">
              {scenes.map((sc, idx) => {
                const selBg = sc.backgrounds.find(b => b.id === sc.selectedBackgroundId);
                const placedChars = sc.characterPlacements.filter(cp => cp.characterId);
                const canGenerate = !!selBg?.description?.trim() && placedChars.length > 0;

                return (
                  <div key={sc.id} className={`mb-6 border rounded-xl transition-all ${sc.approved ? 'border-[rgba(74,222,128,0.2)] bg-[rgba(74,222,128,0.02)]' : 'border-[rgba(255,255,255,0.08)] bg-[#0f0f0f]'}`}>
                    <div className="flex items-center gap-2.5 p-5 pb-0">
                      <span className="text-[10px] font-medium text-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded uppercase tracking-wider">Scene {idx + 1}</span>
                      {sc.approved && <span className="flex items-center gap-1 text-[10px] text-[rgba(74,222,128,0.7)] font-medium"><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,8 6.5,11.5 13,5"/></svg>Approved</span>}
                      {sc.approved ? (
                        <button onClick={() => editScene(sc.id)} className="text-[10px] text-[rgba(255,255,255,0.35)] hover:text-white ml-auto">Edit</button>
                      ) : scenes.length > 1 ? (
                        <button onClick={() => setScenes(p => p.filter(s => s.id !== sc.id))} className="text-[10px] text-[rgba(248,113,113,0.4)] hover:text-[rgba(248,113,113,0.7)] ml-auto">Remove</button>
                      ) : null}
                    </div>

                    {sc.approved ? (
                      <div className="p-5 pt-4">
                        <div className="aspect-video bg-[#131313] rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden flex items-center justify-center">
                          {sc.imageUrl ? <img src={sc.imageUrl} alt={`Scene ${idx+1}`} className="w-full h-full object-cover" /> : <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>}
                        </div>
                        <p className="text-[11px] text-[rgba(255,255,255,0.3)] mt-3 leading-relaxed">{sc.description}</p>
                      </div>
                    ) : (
                      <div className="p-5 pt-4 flex flex-col gap-5">

                        {/* BACKGROUNDS */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-[12px] font-medium text-[rgba(255,255,255,0.55)] uppercase tracking-[1.5px]">Background</h3>
                            {selBg?.description && <span className="text-[10px] text-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-full truncate max-w-[200px]">{selBg.description.slice(0, 30)}{selBg.description.length > 30 ? '...' : ''}</span>}
                          </div>
                          <div className="flex gap-2.5 flex-wrap mb-3">
                            {sc.backgrounds.map((bg, bi) => {
                              const isSelected = sc.selectedBackgroundId === bg.id;
                              const isExpanded = sc.expandedBgId === bg.id;
                              const hasContent = bg.description.trim() || bg.photoUrl;
                              return (
                                <div key={bg.id} className="flex flex-col gap-1.5">
                                  <button onClick={() => upScene(sc.id, { selectedBackgroundId: bg.id, expandedBgId: isExpanded ? null : bg.id })}
                                    className={`w-[90px] aspect-square rounded-[10px] border flex flex-col items-center justify-center gap-1 transition-all overflow-hidden ${isSelected ? 'border-white bg-[rgba(255,255,255,0.05)]' : 'border-[rgba(255,255,255,0.08)] bg-[#111] hover:border-[rgba(255,255,255,0.15)]'}`}>
                                    {bg.photoUrl ? <img src={bg.photoUrl} alt="" className="w-full h-full object-cover" /> : hasContent ? <span className="text-[9px] text-[rgba(255,255,255,0.35)] px-2 text-center leading-tight">{bg.description.slice(0, 20)}{bg.description.length > 20 ? '…' : ''}</span> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'} strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>}
                                  </button>
                                  <span className={`text-[9px] text-center ${isSelected ? 'text-[rgba(255,255,255,0.5)]' : 'text-[rgba(255,255,255,0.25)]'}`}>Bg {bi + 1}</span>
                                </div>
                              );
                            })}
                            <div className="flex flex-col gap-1.5">
                              <button onClick={() => addBg(sc.id)} className="w-[90px] aspect-square rounded-[10px] border border-dashed border-[rgba(255,255,255,0.08)] flex items-center justify-center hover:border-[rgba(255,255,255,0.18)] transition-all">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
                              </button>
                              <span className="text-[9px] text-center text-[rgba(255,255,255,0.15)]">Add</span>
                            </div>
                          </div>

                          {sc.expandedBgId && (() => {
                            const ebg = sc.backgrounds.find(b => b.id === sc.expandedBgId);
                            if (!ebg) return null;
                            return (
                              <div className="border border-[rgba(255,255,255,0.08)] rounded-lg p-4 bg-[rgba(255,255,255,0.01)] flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-[rgba(255,255,255,0.4)]">Background {sc.backgrounds.findIndex(b => b.id === ebg.id) + 1}</span>
                                  {sc.backgrounds.length > 1 && <button onClick={() => removeBg(sc.id, ebg.id)} className="text-[10px] text-[rgba(248,113,113,0.4)] hover:text-[rgba(248,113,113,0.7)]">Remove</button>}
                                </div>
                                <textarea value={ebg.description} onChange={e => upBg(sc.id, ebg.id, { description: e.target.value })}
                                  className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 text-[13px] text-white placeholder:text-[rgba(255,255,255,0.18)] outline-none resize-none h-20 focus:border-[rgba(255,255,255,0.15)] transition-colors"
                                  placeholder="Describe this background..." />
                                {ebg.photoUrl ? (
                                  <div className="relative border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden h-24">
                                    <img src={ebg.photoUrl} alt="" className="w-full h-full object-cover" />
                                    <button onClick={() => upBg(sc.id, ebg.id, { photoUrl: null })} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-white text-[10px]">×</button>
                                  </div>
                                ) : (
                                  <label className="w-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.1)] rounded-lg py-3 flex flex-col items-center gap-1.5 hover:border-[rgba(255,255,255,0.18)] transition-colors cursor-pointer">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                    <span className="text-[10px] text-[rgba(255,255,255,0.25)]">Upload reference photo</span>
                                    <span className="text-[8px] text-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.06)] rounded-full px-1.5 py-0.5">Optional</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upBg(sc.id, ebg.id, { photoUrl: URL.createObjectURL(f) }); }} />
                                  </label>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* ASPECT RATIO */}
                        <div>
                          <div className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-2.5">Aspect Ratio</div>
                          <div className="flex gap-2">
                            {([{ r: '16:9' as AspectRatio, w: 40, h: 22 }, { r: '9:16' as AspectRatio, w: 22, h: 40 }, { r: '1:1' as AspectRatio, w: 30, h: 30 }]).map(({ r, w, h }) => (
                              <button key={r} onClick={() => upScene(sc.id, { aspectRatio: r })}
                                className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${sc.aspectRatio === r ? 'border-white bg-[rgba(255,255,255,0.05)] text-white' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.3)] hover:border-[rgba(255,255,255,0.15)]'}`}>
                                <div style={{ width: w, height: h }} className={`rounded-[3px] ${sc.aspectRatio === r ? 'bg-[rgba(255,255,255,0.25)]' : 'bg-[rgba(255,255,255,0.1)]'}`} />
                                <span className="text-[11px]">{r}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* CHARACTER PLACEMENT */}
                        <div>
                          <h3 className="text-[12px] font-medium text-[rgba(255,255,255,0.55)] uppercase tracking-[1.5px] mb-3">Place your characters</h3>
                          <div className="w-full h-[88px] bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-[10px] flex items-center justify-evenly px-4 gap-2 mb-3">
                            {sc.characterPlacements.map((cp, si) => {
                              const ch = cp.characterId ? chars.find(c => c.id === cp.characterId) : null;
                              return (
                                <div key={si}
                                  draggable={!!ch}
                                  onDragStart={() => { dragSlotI.current = { sceneId: sc.id, slot: si }; }}
                                  onDragEnter={() => { if (dragSlotI.current?.sceneId === sc.id && dragSlotI.current.slot !== si) { reorderPlacements(sc.id, dragSlotI.current.slot, si); dragSlotI.current = { sceneId: sc.id, slot: si }; } }}
                                  onDragEnd={() => { dragSlotI.current = null; }}
                                  onDragOver={e => e.preventDefault()}
                                  className={`flex flex-col items-center gap-1 ${ch ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                  {ch ? (
                                    <>
                                      <div className="w-[48px] h-[52px] rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#161616] flex items-center justify-center overflow-hidden relative select-none">
                                        {ch.imageUrl ? <img src={ch.imageUrl} alt={ch.name} className="w-full h-full object-cover object-top" draggable={false} /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>}
                                        <span className={`absolute top-0.5 right-0.5 text-[7px] font-bold px-1 rounded ${cp.role === 'speaking' ? 'bg-white text-black' : 'bg-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.4)]'}`}>{cp.role === 'speaking' ? 'S' : 'Si'}</span>
                                      </div>
                                      <span className="text-[8px] text-[rgba(255,255,255,0.35)] truncate max-w-[52px]">{ch.name}</span>
                                    </>
                                  ) : (
                                    <button onClick={() => { const placedIds = sc.characterPlacements.filter(p => p.characterId).map(p => p.characterId); const unplaced = chars.find(c => !placedIds.includes(c.id)); if (unplaced) upPlacement(sc.id, si, { characterId: unplaced.id }); }}
                                      className="w-[48px] h-[52px] rounded-lg border border-dashed border-[rgba(255,255,255,0.1)] flex items-center justify-center hover:border-[rgba(255,255,255,0.2)] transition-all">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex flex-col gap-2">
                            {sc.characterPlacements.map((cp, si) => {
                              if (!cp.characterId) return null;
                              const ch = chars.find(c => c.id === cp.characterId);
                              if (!ch) return null;
                              const posLabel = slotPositionLabel(si, placedChars.length);
                              return (
                                <div key={si} className="border border-[rgba(255,255,255,0.06)] rounded-lg p-3 bg-[rgba(255,255,255,0.01)]">
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-md bg-[#151515] border border-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                      {ch.imageUrl ? <img src={ch.imageUrl} alt="" className="w-full h-full object-cover object-top" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[12px] font-medium">{ch.name}</span>
                                      <span className="text-[9px] text-[rgba(255,255,255,0.25)] ml-2 capitalize">{posLabel}</span>
                                    </div>
                                    <div className="flex border border-[rgba(255,255,255,0.07)] rounded-md overflow-hidden">
                                      {(['speaking', 'silent'] as const).map(role => (
                                        <button key={role} onClick={() => upPlacement(sc.id, si, { role })}
                                          className={`px-2.5 py-1 text-[10px] capitalize transition-all ${cp.role === role ? 'bg-[rgba(255,255,255,0.08)] text-white' : 'text-[rgba(255,255,255,0.3)]'}`}>{role}</button>
                                      ))}
                                    </div>
                                    <button onClick={() => upPlacement(sc.id, si, { characterId: null })} className="text-[10px] text-[rgba(255,255,255,0.2)] hover:text-[rgba(248,113,113,0.6)] transition-colors">✕</button>
                                  </div>
                                  {cp.role === 'speaking' && (
                                    <textarea value={cp.dialogue} onChange={e => upPlacement(sc.id, si, { dialogue: e.target.value })}
                                      className="w-full mt-2 bg-[#131313] border border-[rgba(255,255,255,0.06)] rounded-lg p-2.5 text-[11px] outline-none resize-none h-14 placeholder:text-[rgba(255,255,255,0.18)] focus:border-[rgba(255,255,255,0.12)] transition-colors"
                                      placeholder={`${ch.name}'s dialogue...`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* PREVIEW */}
                        <div>
                          {sc.generating && <div className="flex items-center gap-3 py-4"><div className="w-5 h-5 rounded-full border-2 border-[rgba(255,255,255,0.06)] border-t-white animate-spin" /><span className="text-[13px] text-[rgba(255,255,255,0.45)]">Generating scene preview...</span></div>}
                          {sc.error && !sc.generating && <div className="flex items-center gap-2 py-2 mb-3"><span className="text-[12px] text-[rgba(248,113,113,0.7)]">{sc.error}</span><button onClick={() => generateScenePreview(sc.id)} className="text-[12px] text-[rgba(255,255,255,0.5)] hover:text-white underline">Retry</button></div>}
                          {sc.imageUrl !== null && !sc.generating && (
                            <div className="mb-2">
                              <div className="aspect-video bg-[#131313] rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden mb-3"><img src={sc.imageUrl} alt={`Scene ${idx+1}`} className="w-full h-full object-cover" /></div>
                              <div className="flex gap-2.5">
                                <button onClick={() => generateScenePreview(sc.id)} className="px-3.5 py-2 border border-[rgba(255,255,255,0.1)] rounded-lg text-[12px] text-[rgba(255,255,255,0.55)] hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-all">Regenerate</button>
                                <button onClick={() => approveScene(sc.id)} className="px-3.5 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-all">Looks good ✓</button>
                              </div>
                            </div>
                          )}
                          {sc.imageUrl === null && !sc.generating && !sc.error && (
                            <button onClick={() => generateScenePreview(sc.id)} disabled={!canGenerate}
                              className="px-4 py-2 bg-[#0f0f0f] border border-[rgba(255,255,255,0.12)] text-[12px] text-[rgba(255,255,255,0.6)] rounded-lg hover:text-white hover:border-[rgba(255,255,255,0.2)] disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                              Generate Scene Preview
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between mt-2">
                <button onClick={addScene} className="text-[11px] px-3 py-1.5 border border-[rgba(255,255,255,0.1)] rounded-lg text-[rgba(255,255,255,0.45)] hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-all">+ Add Scene</button>
                <button onClick={() => setStep(3)} disabled={approvedCount === 0} className="px-5 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">Next: Review →</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[820px] mx-auto px-5 md:px-7 py-7 animate-[fadeIn_0.3s_ease]">
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
                <button onClick={handleFinalGenerate} className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Generate Animation →</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[860px] mx-auto px-5 md:px-7 py-7 animate-[fadeIn_0.3s_ease]">
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
                  <video src={finalVideoUrl} controls autoPlay muted loop playsInline className="w-full aspect-video bg-[#0e0e0e]" />
                  <div className="p-4 flex items-center justify-between">
                    <div><h3 className="text-[15px] font-medium">Final Video Ready</h3><p className="text-[12px] text-[rgba(255,255,255,0.35)] mt-0.5">{genScenes.length} scene{genScenes.length > 1 ? 's' : ''} · {res}</p></div>
                    <button onClick={() => downloadVideo(finalVideoUrl!, 'animave-story.mp4')} className="px-4 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-colors">
                      Download MP4
                    </button>
                  </div>
                </div>
              )}

              {genStatus === 'completed' && <div className="flex justify-center"><button onClick={resetAll} className="px-5 py-2.5 border border-[rgba(255,255,255,0.1)] text-[13px] text-[rgba(255,255,255,0.55)] rounded-lg hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">Create Another</button></div>}
              {genStatus === 'failed' && <div className="flex justify-center gap-3"><button onClick={() => { setStep(3); setGenStatus('idle'); }} className="px-5 py-2.5 border border-[rgba(255,255,255,0.1)] text-[13px] text-[rgba(255,255,255,0.55)] rounded-lg hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">← Back to Review</button><button onClick={handleFinalGenerate} className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Retry</button></div>}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
    )}
  </>);
}

export default function CreatePage() { return <Suspense><CreatePageInner /></Suspense>; }
