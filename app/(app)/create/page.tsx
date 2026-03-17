'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type Resolution, RESOLUTION_CREDITS } from '@/lib/types';

type AnimStyle = 'western-cartoon' | 'anime' | 'pixar' | 'comic' | 'chibi' | 'retro' | 'custom';
type AspectRatio = '16:9' | '9:16' | '1:1';
interface Voice { id: string; name: string; description: string; gender: string; accent: string; age: string; language: string; category: string; color: string; preview_url: string; }
interface CharDef { id: string; name: string; prompt: string; style: AnimStyle; voiceId?: string; voiceName?: string; imageUrl?: string; }
interface SceneCharRef { characterId: string; role: 'speaking' | 'silent'; dialogue: string; }
interface SceneDef { id: string; description: string; aspectRatio: AspectRatio; characters: SceneCharRef[]; }

const STYLES: { value: AnimStyle; label: string }[] = [
  { value: 'western-cartoon', label: 'Western Cartoon' }, { value: 'anime', label: 'Anime' }, { value: 'pixar', label: 'Pixar' },
  { value: 'comic', label: 'Comic' }, { value: 'chibi', label: 'Chibi' }, { value: 'retro', label: 'Retro' }, { value: 'custom', label: 'Custom' },
];
const VFILTERS = [{ value: 'all', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'narrator', label: 'Narrator' }, { value: 'character', label: 'Character' }];

let _u = 0;
function uid() { return `u${++_u}-${Date.now()}`; }

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chars, setChars] = useState<CharDef[]>([]);
  const [scenes, setScenes] = useState<SceneDef[]>([]);
  const [res, setRes] = useState<Resolution>('720p');
  const [lip, setLip] = useState(false);

  // Step 1 form
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<AnimStyle>('anime');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selVoice, setSelVoice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Voices
  const [voices, setVoices] = useState<Voice[]>([]);
  const [vSearch, setVSearch] = useState('');
  const [vFilter, setVFilter] = useState('all');
  const [playing, setPlaying] = useState<string | null>(null);

  // Gen state
  const [genLoading, setGenLoading] = useState(false);
  const [genDone, setGenDone] = useState(false);
  const [pendingChar, setPendingChar] = useState<CharDef | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);

  useEffect(() => { fetch('/api/voices').then(r => r.json()).then(setVoices).catch(() => {}); }, []);

  const filteredV = voices.filter(v => {
    if (vSearch && !v.name.toLowerCase().includes(vSearch.toLowerCase()) && !v.description.toLowerCase().includes(vSearch.toLowerCase())) return false;
    if (vFilter === 'male' && v.gender !== 'male') return false;
    if (vFilter === 'female' && v.gender !== 'female') return false;
    if (vFilter === 'narrator' && v.category !== 'Narrator') return false;
    if (vFilter === 'character' && v.category !== 'Character') return false;
    return true;
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setPhotoUrl(URL.createObjectURL(f)); };
  const clearPhoto = () => { setPhotoUrl(null); if (fileRef.current) fileRef.current.value = ''; };

  const resetForm = () => { setPrompt(''); setStyle('anime'); setSelVoice(null); clearPhoto(); };

  const handleGenChar = async () => {
    if (!prompt.trim()) return;
    setGenLoading(true);
    try {
      const r = await fetch('/api/generate-character', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, style }) });
      const d = await r.json();
      const voice = voices.find(v => v.id === selVoice);
      setPendingChar({ id: d.character_id || uid(), name: `Character ${chars.length + 1}`, prompt, style, voiceId: selVoice || undefined, voiceName: voice?.name, imageUrl: d.character_image_url });
      setGenDone(true);
    } catch {}
    setGenLoading(false);
  };

  const confirmChar = () => {
    if (pendingChar) setChars(prev => [...prev, pendingChar]);
    setPendingChar(null); setGenDone(false); resetForm();
  };

  const addScene = () => {
    setScenes(prev => [...prev, { id: uid(), description: '', aspectRatio: '16:9', characters: chars.map(c => ({ characterId: c.id, role: 'speaking' as const, dialogue: '' })) }]);
  };

  const upScene = (id: string, u: Partial<SceneDef>) => setScenes(p => p.map(s => s.id === id ? { ...s, ...u } : s));
  const upSC = (sid: string, cid: string, u: Partial<SceneCharRef>) => setScenes(p => p.map(s => s.id !== sid ? s : { ...s, characters: s.characters.map(c => c.characterId === cid ? { ...c, ...u } : c) }));

  const speakCount = scenes.reduce((a, s) => a + s.characters.filter(c => c.role === 'speaking').length, 0);
  const totalCr = scenes.length * RESOLUTION_CREDITS[res] + (lip ? speakCount * 25 : 0);

  const dragI = useRef<number | null>(null);
  const dragO = useRef<number | null>(null);
  const onDragEnd = () => {
    if (dragI.current === null || dragO.current === null) return;
    const c = [...scenes]; const [rm] = c.splice(dragI.current, 1); c.splice(dragO.current, 0, rm);
    setScenes(c); dragI.current = null; dragO.current = null;
  };

  const handleFinal = async () => {
    setFinalLoading(true);
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { data } = await sb.from('animations').insert({ user_id: user.id, title: scenes[0]?.description?.slice(0, 50) || 'Untitled', status: 'processing', scenes_count: scenes.length, resolution: res, lipsync: lip }).select('id').single();
    if (data) router.push(`/status/${data.id}`);
    setFinalLoading(false);
  };

  // ═══ ROADMAP BAR ═══
  const steps = [{ n: 1, l: 'Characters' }, { n: 2, l: 'Scene' }, { n: 3, l: 'Review' }] as const;

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Roadmap */}
      <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-30 bg-black">
        <div className="max-w-[560px] mx-auto px-6 py-4 flex items-center">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-initial">
              <button onClick={() => { if (s.n === 1) setStep(1); if (s.n === 2 && chars.length > 0) setStep(2); if (s.n === 3 && scenes.length > 0) setStep(3); }} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium border transition-all ${step === s.n ? 'bg-white text-black border-white' : step > s.n ? 'border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.4)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.2)]'}`}>
                  {step > s.n ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,8 6.5,11.5 13,5"/></svg> : s.n}
                </div>
                <span className={`text-[13px] ${step === s.n ? 'text-white font-medium' : 'text-[rgba(255,255,255,0.2)]'}`}>{s.l}</span>
              </button>
              {i < 2 && <div className={`flex-1 h-px mx-4 ${step > s.n ? 'bg-[rgba(255,255,255,0.15)]' : 'bg-[rgba(255,255,255,0.05)]'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ STEP 1 ═══ */}
        {step === 1 && (
          <div className="flex flex-col animate-[fadeIn_0.3s_ease]">
            {/* Gen modal */}
            {(genLoading || genDone) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-[400px] bg-[#0a0a0a] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 mx-4">
                  {genLoading ? (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-10 h-10 rounded-full border-2 border-[rgba(255,255,255,0.06)] border-t-white animate-spin mb-4" />
                      <p className="text-[14px] text-[rgba(255,255,255,0.4)]">Generating your character...</p>
                    </div>
                  ) : (
                    <div>
                      <div className="aspect-[16/9] bg-[#111] rounded-[10px] border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-5">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setGenDone(false); setPendingChar(null); }} className="flex-1 py-2.5 border border-[rgba(255,255,255,0.08)] rounded-lg text-[13px] text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)] transition-all">← Edit</button>
                        <button onClick={confirmChar} className="flex-1 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Use this character →</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Two panels */}
            <div className="flex flex-col md:flex-row flex-1">
              {/* LEFT — Prompt */}
              <div className="md:w-1/2 p-5 md:p-7 flex flex-col gap-4">
                <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px]">Describe your character</h2>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  className="min-h-[160px] w-full bg-[#0a0a0a] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 text-[15px] text-white placeholder:text-[rgba(255,255,255,0.15)] outline-none resize-none focus:border-[rgba(255,255,255,0.12)] transition-colors leading-relaxed"
                  placeholder="A confident 60-year-old male politician in a navy suit. Strong voice, authoritative presence..." />

                {/* Photo */}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  {photoUrl ? (
                    <div className="relative border border-[rgba(255,255,255,0.07)] rounded-[10px] overflow-hidden">
                      <img src={photoUrl} alt="" className="w-full h-28 object-cover" />
                      <button onClick={clearPhoto} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-white text-xs">×</button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} className="w-full border-[1.5px] border-dashed border-[rgba(255,255,255,0.08)] rounded-[10px] py-5 flex flex-col items-center gap-2 hover:border-[rgba(255,255,255,0.15)] transition-colors group">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" className="group-hover:stroke-[rgba(255,255,255,0.3)] transition-colors"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <span className="text-[12px] text-[rgba(255,255,255,0.2)] group-hover:text-[rgba(255,255,255,0.35)]">Upload a photo for likeness</span>
                      <span className="text-[9px] text-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.05)] rounded-full px-2 py-0.5">Optional</span>
                    </button>
                  )}
                </div>

                {/* Style */}
                <div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.25)] uppercase tracking-wider mb-2">Animation Style</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLES.map(s => (
                      <button key={s.value} onClick={() => setStyle(s.value)}
                        className={`px-3 py-1.5 rounded-full text-[11px] transition-all ${style === s.value ? 'bg-white text-black font-medium' : 'border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.35)] hover:border-[rgba(255,255,255,0.15)]'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT — Voice */}
              <div className="md:w-1/2 border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.07)] flex flex-col">
                <div className="p-5 md:p-7 pb-0 flex flex-col gap-3 flex-shrink-0">
                  <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px]">Select a voice</h2>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input value={vSearch} onChange={e => setVSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#0a0a0a] border border-[rgba(255,255,255,0.07)] rounded-lg text-[13px] text-white placeholder:text-[rgba(255,255,255,0.18)] outline-none focus:border-[rgba(255,255,255,0.12)]"
                      placeholder="Start typing to search..." />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {VFILTERS.map(f => (
                      <button key={f.value} onClick={() => setVFilter(f.value)}
                        className={`px-2.5 py-1 rounded-full text-[10px] border transition-all ${vFilter === f.value ? 'border-[rgba(255,255,255,0.2)] text-white bg-[rgba(255,255,255,0.04)]' : 'border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.25)]'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 md:px-3 py-2 max-h-[400px] md:max-h-none">
                  {voices.length === 0 ? (
                    <div className="flex items-center justify-center py-12"><div className="w-5 h-5 rounded-full border-2 border-[rgba(255,255,255,0.05)] border-t-[rgba(255,255,255,0.25)] animate-spin" /></div>
                  ) : filteredV.map(v => (
                    <button key={v.id} onClick={() => setSelVoice(v.id === selVoice ? null : v.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${selVoice === v.id ? 'bg-[rgba(255,255,255,0.04)] border-l-2 border-l-white' : 'hover:bg-[rgba(255,255,255,0.015)] border-l-2 border-l-transparent'}`}>
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-white" style={{ background: `linear-gradient(135deg, ${v.color}, ${v.color}88)` }}>
                        {v.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium">{v.name}</div>
                        <div className="text-[10px] text-[rgba(255,255,255,0.25)] truncate">{v.description}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setPlaying(playing === v.id ? null : v.id); }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${playing === v.id ? 'bg-white text-black' : 'border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.25)] hover:text-white'}`}>
                        {playing === v.id
                          ? <svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx=".5"/><rect x="6" y="1" width="3" height="8" rx=".5"/></svg>
                          : <svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,0 10,5 2,10"/></svg>}
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Character strip */}
            {chars.length > 0 && (
              <div className="border-t border-[rgba(255,255,255,0.07)] px-5 md:px-7 py-4">
                <div className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider mb-2.5">Characters ({chars.length})</div>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {chars.map(c => (
                    <div key={c.id} className="w-[100px] flex-shrink-0 border border-[rgba(255,255,255,0.06)] rounded-[10px] overflow-hidden hover:border-[rgba(255,255,255,0.1)] transition-all bg-[#0a0a0a]">
                      <div className="h-[68px] bg-[#0e0e0e] flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
                      </div>
                      <div className="px-2 py-1.5 text-[10px] text-center text-[rgba(255,255,255,0.4)] truncate">{c.name}</div>
                    </div>
                  ))}
                  <button onClick={resetForm} className="w-[100px] h-[96px] flex-shrink-0 border border-dashed border-[rgba(255,255,255,0.06)] rounded-[10px] flex items-center justify-center hover:border-[rgba(255,255,255,0.12)] transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                </div>
              </div>
            )}

            {/* Bottom */}
            <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.07)] px-5 md:px-7 py-3 flex items-center justify-between bg-[#0a0a0a]">
              <span className="text-[11px] text-[rgba(255,255,255,0.2)]">Character {chars.length + 1}</span>
              <div className="flex gap-2.5">
                <button onClick={handleGenChar} disabled={!prompt.trim() || genLoading}
                  className="px-4 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">
                  Generate Character →
                </button>
                {chars.length > 0 && (
                  <button onClick={() => { if (scenes.length === 0) addScene(); setStep(2); }}
                    className="px-4 py-2 border border-[rgba(255,255,255,0.08)] text-[12px] text-[rgba(255,255,255,0.5)] rounded-lg hover:text-white hover:border-[rgba(255,255,255,0.15)] transition-all">
                    Next: Scene →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 2 ═══ */}
        {step === 2 && (
          <div className="max-w-[800px] mx-auto px-5 md:px-7 py-7 animate-[fadeIn_0.3s_ease]">
            {scenes.map((sc, idx) => (
              <div key={sc.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-medium text-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 rounded uppercase tracking-wider">Scene {idx + 1}</span>
                  {scenes.length > 1 && <button onClick={() => setScenes(p => p.filter(s => s.id !== sc.id))} className="text-[10px] text-[rgba(248,113,113,0.3)] hover:text-[rgba(248,113,113,0.6)] ml-auto">Remove</button>}
                </div>
                <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mb-3">Describe your scene</h2>
                <textarea value={sc.description} onChange={e => upScene(sc.id, { description: e.target.value })}
                  className="w-full min-h-[180px] bg-[#0a0a0a] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 text-[14px] text-white placeholder:text-[rgba(255,255,255,0.15)] outline-none resize-none focus:border-[rgba(255,255,255,0.1)] leading-relaxed mb-4"
                  placeholder="A press conference room. The politician stands up, slams his fist on the table and shouts: 'This ends today!'" />

                <div className="flex gap-5 mb-4">
                  <div>
                    <div className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider mb-2">Aspect Ratio</div>
                    <div className="flex border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden">
                      {(['16:9', '9:16', '1:1'] as AspectRatio[]).map(r => (
                        <button key={r} onClick={() => upScene(sc.id, { aspectRatio: r })}
                          className={`px-3.5 py-1.5 text-[11px] transition-all ${sc.aspectRatio === r ? 'bg-[rgba(255,255,255,0.07)] text-white' : 'text-[rgba(255,255,255,0.25)]'}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider mb-2">Characters</div>
                <div className="flex flex-col gap-2.5">
                  {sc.characters.map(scr => {
                    const ch = chars.find(c => c.id === scr.characterId);
                    if (!ch) return null;
                    return (
                      <div key={scr.characterId} className="border border-[rgba(255,255,255,0.04)] rounded-lg p-3 bg-[rgba(255,255,255,0.006)]">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-md bg-[#111] flex items-center justify-center flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
                          </div>
                          <span className="text-[12px] font-medium flex-1">{ch.name}</span>
                          <div className="flex border border-[rgba(255,255,255,0.05)] rounded-md overflow-hidden">
                            {(['speaking', 'silent'] as const).map(role => (
                              <button key={role} onClick={() => upSC(sc.id, scr.characterId, { role })}
                                className={`px-2.5 py-1 text-[10px] capitalize ${scr.role === role ? 'bg-[rgba(255,255,255,0.06)] text-white' : 'text-[rgba(255,255,255,0.2)]'}`}>{role}</button>
                            ))}
                          </div>
                        </div>
                        {scr.role === 'speaking' && (
                          <textarea value={scr.dialogue} onChange={e => upSC(sc.id, scr.characterId, { dialogue: e.target.value })}
                            className="w-full mt-2 bg-[#0e0e0e] border border-[rgba(255,255,255,0.04)] rounded-lg p-2.5 text-[11px] outline-none resize-none h-14 placeholder:text-[rgba(255,255,255,0.12)] focus:border-[rgba(255,255,255,0.08)]"
                            placeholder={`${ch.name}'s dialogue...`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {idx < scenes.length - 1 && <div className="border-b border-[rgba(255,255,255,0.03)] mt-6" />}
              </div>
            ))}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
              <button onClick={addScene} className="text-[11px] px-3 py-1.5 border border-[rgba(255,255,255,0.06)] rounded-lg text-[rgba(255,255,255,0.35)] hover:text-white hover:border-[rgba(255,255,255,0.12)] transition-all">+ Add Scene</button>
              <button onClick={() => setStep(3)} disabled={scenes.every(s => !s.description.trim())}
                className="px-5 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-15 disabled:cursor-not-allowed transition-all">Next: Review →</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3 ═══ */}
        {step === 3 && (
          <div className="max-w-[800px] mx-auto px-5 md:px-7 py-7 animate-[fadeIn_0.3s_ease]">
            <h2 className="text-[12px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[1.5px] mb-5">Review your scenes</h2>

            <div className="flex flex-col gap-2.5 mb-8">
              {scenes.map((sc, idx) => (
                <div key={sc.id} draggable onDragStart={() => { dragI.current = idx; }} onDragEnter={() => { dragO.current = idx; }} onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}
                  className="border border-[rgba(255,255,255,0.05)] rounded-xl p-4 bg-[#0a0a0a] flex items-start gap-3.5 cursor-grab active:cursor-grabbing hover:border-[rgba(255,255,255,0.08)] transition-all group">
                  <span className="text-[10px] font-medium text-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 rounded flex-shrink-0 mt-0.5">Scene {idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[rgba(255,255,255,0.5)] line-clamp-2 leading-relaxed">{sc.description || 'No description'}</p>
                    <div className="flex gap-1.5 mt-1.5">{sc.characters.filter(c => c.role === 'speaking').map(c => { const ch = chars.find(x => x.id === c.characterId); return ch ? <span key={c.characterId} className="text-[9px] text-[rgba(255,255,255,0.18)] border border-[rgba(255,255,255,0.04)] rounded px-1.5 py-0.5">{ch.name}</span> : null; })}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.08)" className="flex-shrink-0 mt-1 opacity-40 group-hover:opacity-100 transition-opacity"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>
                </div>
              ))}
            </div>

            {/* Settings */}
            <div className="border border-[rgba(255,255,255,0.05)] rounded-xl p-5 bg-[#0a0a0a] mb-6">
              <h3 className="text-[11px] font-medium text-[rgba(255,255,255,0.3)] uppercase tracking-[1.5px] mb-4">Settings</h3>
              <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                <div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider mb-2">Resolution</div>
                  <div className="flex border border-[rgba(255,255,255,0.05)] rounded-lg overflow-hidden">
                    {(['480p', '720p', '1080p'] as Resolution[]).map(r => (
                      <button key={r} onClick={() => setRes(r)} className={`px-3.5 py-2 text-[11px] transition-all ${res === r ? 'bg-[rgba(255,255,255,0.06)] text-white' : 'text-[rgba(255,255,255,0.2)]'}`}>
                        <div>{r}</div><div className="text-[8px] text-[rgba(255,255,255,0.12)] mt-0.5">{RESOLUTION_CREDITS[r]} cr/scene</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider mb-2">Lip Sync</div>
                  <button onClick={() => setLip(!lip)} className={`relative w-10 h-5 rounded-full transition-all ${lip ? 'bg-white' : 'bg-[rgba(255,255,255,0.06)]'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${lip ? 'left-[22px] bg-black' : 'left-0.5 bg-[rgba(255,255,255,0.2)]'}`} />
                  </button>
                  {lip && <div className="text-[9px] text-[rgba(255,255,255,0.18)] mt-1.5">+25 cr/role</div>}
                </div>
                <div className="md:ml-auto">
                  <div className="text-[10px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider mb-2">Total</div>
                  <div className="text-[24px] font-semibold tracking-[-1px]">{totalCr} <span className="text-[12px] font-normal text-[rgba(255,255,255,0.2)]">credits</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleFinal} disabled={finalLoading}
                className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-all flex items-center gap-2">
                {finalLoading ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-black/20 border-t-black animate-spin" /> Generating...</> : 'Generate Animation →'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
