'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type Resolution, RESOLUTION_CREDITS } from '@/lib/types';

type AnimStyle = 'western-cartoon' | 'anime' | 'pixar' | 'comic' | 'chibi' | 'retro' | 'custom';
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

const STYLES: { value: AnimStyle; label: string }[] = [
  { value: 'western-cartoon', label: 'Western Cartoon' }, { value: 'anime', label: 'Anime' }, { value: 'pixar', label: 'Pixar' },
  { value: 'comic', label: 'Comic' }, { value: 'chibi', label: 'Chibi' }, { value: 'retro', label: 'Retro' }, { value: 'custom', label: 'Custom' },
];

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

export default function CreatePage() {
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

  useEffect(() => { fetch('/api/voices').then(r => r.json()).then(setVoices).catch(() => {}); }, []);

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
        body: JSON.stringify({ description: prompt, style, photo_url: photoUrl })
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
  };

  const roadmap = [{ n: 1, l: 'Characters' }, { n: 2, l: 'Scenes' }, { n: 3, l: 'Review' }, { n: 4, l: 'Generate' }] as const;

  return (
    <div className="flex flex-col h-screen bg-black">
      <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.1)] sticky top-0 z-30 bg-black">
        <div className="max-w-[680px] mx-auto px-6 py-4 flex items-center">
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
                        <button onClick={() => { setGenDone(false); setPendingChar(null); }} className="flex-1 py-2.5 border border-[rgba(255,255,255,0.12)] rounded-lg text-[13px] text-[rgba(255,255,255,0.6)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all">← Edit</button>
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
                    <button key={c.id} onClick={() => openEditChar(c)} className="w-[100px] flex-shrink-0 border border-[rgba(255,255,255,0.1)] rounded-[10px] overflow-hidden hover:border-[rgba(255,255,255,0.25)] transition-all bg-[#0f0f0f] text-left">
                      <div className="h-[68px] bg-[#131313] flex items-center justify-center overflow-hidden">
                        {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover object-top" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>}
                      </div>
                      <div className="px-2 py-1.5 text-[10px] text-center text-[rgba(255,255,255,0.5)] truncate">{c.name}</div>
                    </button>
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
                      {s.status === 'completed' && s.video_url && <a href={s.video_url} download className="text-[11px] text-[rgba(255,255,255,0.4)] hover:text-white transition-colors">Download</a>}
                    </div>
                  </div>
                ))}
              </div>

              {genStatus === 'completed' && finalVideoUrl && (
                <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden bg-[#0f0f0f] mb-6">
                  <video src={finalVideoUrl} controls autoPlay muted loop playsInline className="w-full aspect-video bg-[#0e0e0e]" />
                  <div className="p-4 flex items-center justify-between">
                    <div><h3 className="text-[15px] font-medium">Final Video Ready</h3><p className="text-[12px] text-[rgba(255,255,255,0.35)] mt-0.5">{genScenes.length} scene{genScenes.length > 1 ? 's' : ''} · {res}</p></div>
                    <a href={finalVideoUrl} download className="px-4 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-colors">Download MP4</a>
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
  );
}
