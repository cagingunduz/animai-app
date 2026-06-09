'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { animatedStoryCost } from '@/lib/types';

type Step = 'setup' | 'character' | 'generating' | 'done';
type Aspect = '16:9' | '9:16' | '1:1';

interface Voice { voice_id: string; name: string; preview_url?: string; labels?: { gender?: string; descriptive?: string; accent?: string; age?: string; use_case?: string; [k: string]: string | undefined } }
interface SceneStatus { scene_index: number; status: string; image_url: string | null; video_url: string | null; }

const STYLES = [
  { id: 'western_cartoon', label: 'Western Cartoon', grad: 'from-[#3a2a17] to-[#14100a]' },
  { id: 'anime', label: 'Anime', grad: 'from-[#2a1d33] to-[#0f0d18]' },
  { id: 'pixar', label: 'Pixar 3D', grad: 'from-[#33231d] to-[#141014]' },
  { id: 'comic', label: 'Comic', grad: 'from-[#3a1a1a] to-[#1a1206]' },
];
const ASPECTS: { id: Aspect; label: string; sub: string }[] = [
  { id: '9:16', label: '9:16', sub: 'TikTok / Reels' },
  { id: '16:9', label: '16:9', sub: 'YouTube' },
  { id: '1:1', label: '1:1', sub: 'Instagram' },
];
const DURATIONS = [1, 2, 3, 5, 10];

// Voice filter dimensions (driven by ElevenLabs labels)
const FILTER_DIMS: { key: string; label: string }[] = [
  { key: 'accent', label: 'Accent' },
  { key: 'gender', label: 'Gender' },
  { key: 'age', label: 'Age' },
  { key: 'use_case', label: 'Use case' },
];
const prettyLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function AnimatedStorytelling({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('setup');

  // setup
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('western_cartoon');
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [durationMinutes, setDurationMinutes] = useState(1);
  const [includeNarrator, setIncludeNarrator] = useState(true);
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [narratorSpeed, setNarratorSpeed] = useState(1);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [previewVoice, setPreviewVoice] = useState<string | null>(null); // voice_id currently loading/playing
  const [voiceFilters, setVoiceFilters] = useState<Record<string, string>>({}); // dim key -> selected value
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reqRef = useRef<string | null>(null); // latest requested voice (guards async races)

  // character
  const [charDesc, setCharDesc] = useState('');
  const [charUrl, setCharUrl] = useState<string | null>(null);
  const [charGen, setCharGen] = useState(false);
  const [charErr, setCharErr] = useState('');

  // generation
  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [scenes, setScenes] = useState<SceneStatus[]>([]);
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [genErr, setGenErr] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/voices').then(r => r.json()).then(d => setVoices(Array.isArray(d) ? d : (d?.voices || []))).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const stopPreview = () => {
    reqRef.current = null;
    if (audioRef.current) { try { audioRef.current.pause(); } catch { /* noop */ } audioRef.current = null; }
    setPreviewVoice(null);
  };

  const playVoicePreview = (v: Voice) => {
    // Second click on the playing voice → stop it.
    if (previewVoice === v.voice_id) { stopPreview(); return; }
    stopPreview();
    reqRef.current = v.voice_id;
    setPreviewVoice(v.voice_id);

    const startUrl = (url: string) => {
      if (reqRef.current !== v.voice_id || !url) { stopPreview(); return; }
      let failed = false;
      const onFail = () => {
        if (failed || reqRef.current !== v.voice_id) return;
        failed = true;
        // preview_url is broken for this voice → fall back to live TTS once.
        if (url === v.preview_url) fallbackTTS();
        else stopPreview();
      };
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => { if (reqRef.current === v.voice_id) stopPreview(); };
      a.onerror = onFail;
      a.play().catch(onFail);
    };

    const fallbackTTS = async () => {
      try {
        const res = await fetch('/api/tts-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Once upon a time, an unforgettable adventure was about to begin.', voice_id: v.voice_id }),
        });
        const data = await res.json();
        if (reqRef.current !== v.voice_id) return;
        startUrl(data?.audio_url || '');
      } catch {
        if (reqRef.current === v.voice_id) stopPreview();
      }
    };

    if (v.preview_url) startUrl(v.preview_url);
    else fallbackTTS();
  };

  const generateCharacter = async () => {
    if (!charDesc.trim()) return;
    setCharGen(true); setCharErr(''); setCharUrl(null);
    try {
      const r = await fetch('/api/generate-character', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: charDesc, style }),
      });
      const d = await r.json();
      if (d.character_image_url) setCharUrl(d.character_image_url);
      else setCharErr(d.error || 'Failed to generate character');
    } catch { setCharErr('Failed to generate character'); }
    setCharGen(false);
  };

  const pollStatus = async (jid: string) => {
    try {
      const r = await fetch(`/api/status/${jid}`);
      const d = await r.json();
      setGenMsg(d.message || ''); setGenStep(d.step || 0); setGenTotal(d.total_steps || 0);
      setScenes(d.scenes || []);
      if (d.status === 'completed') {
        setGenStatus('completed'); setFinalVideo(d.final_video_url); setStep('done');
        if (pollRef.current) clearInterval(pollRef.current);
        // Mark the dashboard record completed so it shows in "Last 24 Hours"
        try {
          await createClient().from('animations')
            .update({ status: 'completed', final_video_url: d.final_video_url })
            .eq('job_id', jid);
        } catch { /* non-fatal */ }
      } else if (d.status === 'failed') {
        setGenStatus('failed'); setGenErr(d.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
        try {
          await createClient().from('animations').update({ status: 'failed' }).eq('job_id', jid);
        } catch { /* non-fatal */ }
      } else setGenStatus('processing');
    } catch { /* keep polling */ }
  };

  const startGeneration = async () => {
    setStep('generating'); setGenStatus('processing'); setGenErr(''); setFinalVideo(null); setScenes([]);
    try {
      const r = await fetch('/api/animated-story', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, theme: '', style, aspect_ratio: aspect, resolution, duration_minutes: durationMinutes,
          include_narrator: includeNarrator && !!voiceId,
          narrator_voice_id: voiceId,
          narrator_speed: narratorSpeed,
          include_subtitles: includeSubtitles && includeNarrator && !!voiceId,
          characters: [{ id: 'char-1', description: charDesc, char_url: charUrl, style }],
        }),
      });
      const d = await r.json();
      console.log('[animated-story] start response:', d);
      if (r.status === 402) {
        setGenStatus('failed');
        setGenErr(d.error || 'Yetersiz kredi.');
        return;
      }
      if (d.job_id) {
        pollRef.current = setInterval(() => pollStatus(d.job_id), 3000);
        pollStatus(d.job_id);
      } else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  // ── Voice filtering ──
  const filterOptions = (key: string) =>
    Array.from(new Set(voices.map(v => v.labels?.[key]).filter(Boolean) as string[])).sort();
  const filteredVoices = voices.filter(v =>
    FILTER_DIMS.every(d => !voiceFilters[d.key] || v.labels?.[d.key] === voiceFilters[d.key])
  );
  const setVoiceFilter = (key: string, val: string) =>
    setVoiceFilters(f => { const n = { ...f }; if (val) n[key] = val; else delete n[key]; return n; });
  const activeFilterCount = Object.keys(voiceFilters).length;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.08)] sticky top-0 z-30 bg-black">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center">
          <button onClick={onBack} className="text-[13px] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors mr-3">←</button>
          <span className="text-[15px] font-semibold tracking-[-0.3px]">Animated Storytelling</span>
          <div className="flex-1 flex justify-center items-center">
            {[0, 1, 2].map(i => {
              const stepIndex = step === 'setup' ? 0 : step === 'character' ? 1 : 2;
              const done = i < stepIndex;
              const current = i === stepIndex;
              const reached = i <= stepIndex;
              return (
                <div key={i} className="flex items-center">
                  <span className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all duration-300
                    ${reached ? 'bg-white text-black' : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.35)] border border-[rgba(255,255,255,0.1)]'}
                    ${current ? 'ring-2 ring-[rgba(255,255,255,0.18)] ring-offset-2 ring-offset-black' : ''}`}>
                    {done
                      ? <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="black" strokeWidth="2.5"><path d="M2 7.5l3.2 3.2L12 4" /></svg>
                      : i + 1}
                  </span>
                  {i < 2 && (
                    <span className="relative h-[2px] w-16 mx-1 rounded-full bg-[rgba(255,255,255,0.1)] overflow-hidden">
                      <span className={`absolute inset-y-0 left-0 bg-white rounded-full transition-all duration-500 ${i < stepIndex ? 'w-full' : current ? 'w-1/2' : 'w-0'}`} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <span className="w-6" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-6 py-8 animate-[fadeIn_0.3s_ease]">

          {/* ── SETUP ── */}
          {step === 'setup' && (
            <div className="flex flex-col gap-7">
              {/* Story Title / Prompt */}
              <div>
                <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Story Title / Prompt</label>
                <textarea value={title} onChange={e => setTitle(e.target.value)} rows={3}
                  placeholder="A detective uncovers a midnight conspiracy…"
                  className="w-full bg-[#0e0e0e] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3.5 text-[14px] outline-none resize-none focus:border-[rgba(255,255,255,0.2)] transition-colors placeholder:text-[rgba(255,255,255,0.22)] leading-relaxed" />
              </div>

              {/* Visual Style */}
              <div>
                <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Visual Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden border transition-all ${style === s.id ? 'border-white' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.22)]'}`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${s.grad}`} />
                      <div className="absolute inset-0 flex items-end p-3">
                        <span className="text-[13px] font-semibold tracking-[-0.2px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">{s.label}</span>
                      </div>
                      {style === s.id && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="black" strokeWidth="2.5"><path d="M2 7l3.5 3.5L12 4" /></svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format · Quality · Length */}
              <div className="flex flex-col sm:flex-row gap-5">
                <div>
                  <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Format</label>
                  <div className="flex gap-1.5">
                    {ASPECTS.map(a => (
                      <button key={a.id} onClick={() => setAspect(a.id)} title={a.sub}
                        className={`px-3 py-2 rounded-lg border text-[12px] transition-all flex items-center gap-1.5 ${aspect === a.id ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)]'}`}>
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          {a.id === '9:16'
                            ? <rect x="6.5" y="2.5" width="7" height="15" rx="1.5" />
                            : a.id === '16:9'
                            ? <rect x="2.5" y="6.5" width="15" height="7" rx="1.5" />
                            : <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" />}
                        </svg>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Quality</label>
                  <div className="flex gap-1.5">
                    {(['720p', '1080p'] as const).map(r => (
                      <button key={r} onClick={() => setResolution(r)}
                        className={`px-3.5 py-1.5 rounded-lg border text-[12px] transition-all flex flex-col items-center leading-tight ${resolution === r ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)]'}`}>
                        <span>{r}</span>
                        <span className="text-[9px] text-[rgba(255,255,255,0.35)]">{animatedStoryCost(durationMinutes, r).toLocaleString()} cr</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)] block mb-2.5">Length</label>
                  <div className="flex gap-1.5">
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => setDurationMinutes(d)}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] transition-all flex flex-col items-center leading-tight ${durationMinutes === d ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)]'}`}>
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5" /><path d="M10 5.5V10l3 1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {d} min
                        </span>
                        <span className="text-[9px] text-[rgba(255,255,255,0.35)]">{animatedStoryCost(d, resolution).toLocaleString()} cr</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Narrator */}
              <div>
                <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                  <label className="text-[12px] font-medium text-[rgba(255,255,255,0.7)]">Narrator</label>
                  <button onClick={() => setIncludeNarrator(v => !v)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${includeNarrator ? 'bg-white' : 'bg-[rgba(255,255,255,0.12)]'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${includeNarrator ? 'left-[18px] bg-black' : 'left-0.5 bg-[rgba(255,255,255,0.5)]'}`} />
                  </button>
                  {includeNarrator && (
                    <div className="flex items-center gap-1.5 flex-wrap ml-1">
                      {FILTER_DIMS.map(d => {
                        const opts = filterOptions(d.key);
                        if (opts.length < 2) return null;
                        const sel = voiceFilters[d.key];
                        const open = openFilter === d.key;
                        return (
                          <div key={d.key} className="relative">
                            <button type="button" onClick={() => setOpenFilter(open ? null : d.key)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10.5px] transition-all ${sel ? 'border-[rgba(255,255,255,0.4)] text-white bg-[rgba(255,255,255,0.07)]' : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.2)]'}`}>
                              {sel ? prettyLabel(sel) : d.label}
                              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className={open ? 'rotate-180' : ''}><path d="M2 3.5L5 6.5 8 3.5" /></svg>
                            </button>
                            {open && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />
                                <div className="absolute z-20 mt-1 left-0 min-w-[140px] max-h-[210px] overflow-y-auto bg-[#161616] border border-[rgba(255,255,255,0.12)] rounded-lg p-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                                  <button type="button" onClick={() => { setVoiceFilter(d.key, ''); setOpenFilter(null); }}
                                    className={`w-full text-left px-2 py-1.5 rounded text-[11px] ${!sel ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.05)]'}`}>All</button>
                                  {opts.map(o => (
                                    <button key={o} type="button" onClick={() => { setVoiceFilter(d.key, o); setOpenFilter(null); }}
                                      className={`w-full text-left px-2 py-1.5 rounded text-[11px] ${sel === o ? 'bg-[rgba(255,255,255,0.1)] text-white' : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)]'}`}>{prettyLabel(o)}</button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {activeFilterCount > 0 && (
                        <button type="button" onClick={() => setVoiceFilters({})}
                          className="text-[10.5px] text-[rgba(255,255,255,0.4)] hover:text-white px-1 transition-colors">Clear</button>
                      )}
                    </div>
                  )}
                </div>
                {includeNarrator && (
                  <>
                    {filteredVoices.length === 0 && (
                      <div className="text-[11px] text-[rgba(255,255,255,0.35)] py-3">No voices match these filters.</div>
                    )}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[230px] overflow-y-auto pr-1">
                      {filteredVoices.map(v => (
                        <div key={v.voice_id} onClick={() => setVoiceId(v.voice_id === voiceId ? null : v.voice_id)}
                          className={`flex items-center gap-2.5 pl-2 pr-1.5 py-2 rounded-xl border transition-all cursor-pointer ${voiceId === v.voice_id ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]'}`}>
                          <div className="w-8 h-8 rounded-full shrink-0"
                            style={{
                              background: v.labels?.gender === 'female'
                                ? 'radial-gradient(circle at 28% 26%, #ffffff 0%, transparent 52%), radial-gradient(circle at 74% 70%, #ff7fb5 0%, transparent 56%), radial-gradient(circle at 68% 22%, #ffd4e6 0%, transparent 48%), linear-gradient(135deg, #ffd2e2, #ff9ec6)'
                                : 'radial-gradient(circle at 28% 26%, #ffffff 0%, transparent 52%), radial-gradient(circle at 74% 70%, #5b8cff 0%, transparent 56%), radial-gradient(circle at 68% 22%, #d3e2ff 0%, transparent 48%), linear-gradient(135deg, #dbe7ff, #6f9bff)',
                              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -2px 5px rgba(0,0,0,0.18)',
                            }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-medium truncate">{v.name}</div>
                            {v.labels?.descriptive && <div className="text-[10px] text-[rgba(255,255,255,0.35)] truncate">{v.labels.descriptive}</div>}
                          </div>
                          <button type="button" title="Preview voice"
                            onClick={(e) => { e.stopPropagation(); playVoicePreview(v); }}
                            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.18)] transition-colors">
                            {previewVoice === v.voice_id
                              ? <span className="block w-2 h-2 rounded-full bg-white animate-pulse" />
                              : <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12px] text-[rgba(255,255,255,0.5)]">Speed</span>
                        <div className="flex gap-1.5">
                          {[1, 1.5, 2].map(sp => (
                            <button key={sp} onClick={() => setNarratorSpeed(sp)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${narratorSpeed === sp ? 'border-white bg-white text-black' : 'border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.25)]'}`}>
                              {sp}x
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[12px] text-[rgba(255,255,255,0.5)]">Captions</span>
                        <button onClick={() => setIncludeSubtitles(v => !v)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${includeSubtitles ? 'bg-white' : 'bg-[rgba(255,255,255,0.12)]'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${includeSubtitles ? 'left-[18px] bg-black' : 'left-0.5 bg-[rgba(255,255,255,0.5)]'}`} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-4 border-t border-[rgba(255,255,255,0.06)] pt-5">
                {includeNarrator && !voiceId && <span className="text-[11px] text-[rgba(255,255,255,0.3)]">Pick a narrator voice to continue</span>}
                <button onClick={() => setStep('character')} disabled={!title.trim() || (includeNarrator && !voiceId)}
                  className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
                  Next Step
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 7h12M8 2l5 5-5 5" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* ── CHARACTER ── */}
          {step === 'character' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[15px] font-medium mb-1">Create your character</h2>
                <p className="text-[12px] text-[rgba(255,255,255,0.4)]">Describe the main character — they'll appear consistently across every scene.</p>
              </div>
              <textarea value={charDesc} onChange={e => setCharDesc(e.target.value)}
                placeholder="A detective with slicked-back dark hair, full beard, tan trench coat, red tie..."
                className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-lg p-3.5 text-[13px] outline-none resize-none h-24 focus:border-[rgba(255,255,255,0.18)] transition-colors placeholder:text-[rgba(255,255,255,0.2)] leading-relaxed" />
              <div className="flex items-center gap-3">
                <button onClick={generateCharacter} disabled={!charDesc.trim() || charGen}
                  className="px-4 py-2 border border-[rgba(255,255,255,0.12)] rounded-lg text-[12px] hover:border-[rgba(255,255,255,0.25)] disabled:opacity-30 transition-all">
                  {charGen ? 'Generating…' : charUrl ? 'Regenerate' : 'Generate Character'}
                </button>
                {charErr && <span className="text-[11px] text-[rgba(248,113,113,0.7)]">{charErr}</span>}
              </div>

              <div className="flex items-center justify-center min-h-[220px] border border-[rgba(255,255,255,0.06)] rounded-xl bg-[#0d0d0d] overflow-hidden">
                {charGen ? (
                  <div className="flex flex-col items-center gap-2"><div className="w-6 h-6 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-white animate-spin" /><span className="text-[11px] text-[rgba(255,255,255,0.3)]">Designing character…</span></div>
                ) : charUrl ? (
                  <img src={charUrl} alt="character" className="max-h-[320px] object-contain" />
                ) : (
                  <span className="text-[12px] text-[rgba(255,255,255,0.25)]">Your character will appear here</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <button onClick={() => setStep('setup')} className="px-4 py-2 text-[12px] text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">← Back</button>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[rgba(255,255,255,0.4)]">
                    <span className="text-white font-medium">{animatedStoryCost(durationMinutes, resolution).toLocaleString()}</span> credits · deducted now
                  </span>
                  <button onClick={startGeneration} disabled={!charUrl}
                    className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                    Generate Story →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── GENERATING ── */}
          {step === 'generating' && (
            <div className="flex flex-col items-center gap-6 py-6">
              {genStatus === 'failed' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-[rgba(248,113,113,0.08)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.7)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </div>
                  <p className="text-[13px] text-[rgba(248,113,113,0.7)] text-center">{genErr}</p>
                  <button onClick={startGeneration} className="px-5 py-2 bg-white text-black text-[12px] font-medium rounded-lg hover:bg-gray-200 transition-all">Retry</button>
                  <button onClick={() => setStep('character')} className="text-[12px] text-[rgba(255,255,255,0.4)] hover:text-white">← Back</button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-white animate-spin" />
                  <div className="text-center">
                    <p className="text-[14px] font-medium">Creating your animated story…</p>
                    <p className="text-[12px] text-[rgba(255,255,255,0.4)] mt-1">{genMsg || 'Starting…'}</p>
                  </div>
                  {genTotal > 0 && (
                    <div className="w-full max-w-[360px]">
                      <div className="flex justify-between text-[10px] text-[rgba(255,255,255,0.3)] mb-1"><span>Step {genStep}/{genTotal}</span><span>{Math.round((genStep / genTotal) * 100)}%</span></div>
                      <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${(genStep / genTotal) * 100}%` }} /></div>
                    </div>
                  )}
                  {scenes.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center max-w-[460px]">
                      {scenes.map(s => (
                        <div key={s.scene_index} className={`w-[64px] h-[64px] rounded-lg border overflow-hidden flex items-center justify-center bg-[#111] ${s.status === 'processing' ? 'animate-pulse border-white' : s.status === 'completed' ? 'border-[rgba(74,222,128,0.4)]' : 'border-[rgba(255,255,255,0.08)]'}`}>
                          {s.image_url ? <img src={s.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[11px] text-[rgba(255,255,255,0.2)]">{s.scene_index}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-[rgba(255,255,255,0.25)]">This can take a few minutes — feel free to wait here.</p>
                </>
              )}
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && finalVideo && (
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-2 text-[rgba(74,222,128,0.8)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-[14px] font-medium">Your animated story is ready</span>
              </div>
              <video src={finalVideo} controls autoPlay loop playsInline
                className={`rounded-xl border border-[rgba(255,255,255,0.08)] bg-black ${aspect === '9:16' ? 'max-h-[70vh]' : 'w-full max-w-[560px]'}`} />
              <div className="flex gap-3">
                <a href={finalVideo} download className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-all">Download MP4</a>
                <button onClick={() => { setStep('setup'); setCharUrl(null); setCharDesc(''); setFinalVideo(null); setGenStatus('idle'); setScenes([]); }}
                  className="px-5 py-2.5 border border-[rgba(255,255,255,0.12)] rounded-lg text-[13px] text-[rgba(255,255,255,0.6)] hover:text-white transition-all">Create Another</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
