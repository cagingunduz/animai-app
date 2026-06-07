'use client';

import { useState, useEffect, useRef } from 'react';

type Step = 'setup' | 'character' | 'generating' | 'done';
type Aspect = '16:9' | '9:16' | '1:1';

interface Voice { voice_id: string; name: string; preview_url?: string; labels?: { gender?: string; descriptive?: string; accent?: string } }
interface SceneStatus { scene_index: number; status: string; image_url: string | null; video_url: string | null; }

const STYLES = [
  { id: 'western_cartoon', label: 'Western Cartoon' },
  { id: 'anime', label: 'Anime' },
  { id: 'pixar', label: 'Pixar 3D' },
  { id: 'comic', label: 'Comic' },
];
const ASPECTS: { id: Aspect; label: string; sub: string }[] = [
  { id: '9:16', label: '9:16', sub: 'TikTok / Reels' },
  { id: '16:9', label: '16:9', sub: 'YouTube' },
  { id: '1:1', label: '1:1', sub: 'Instagram' },
];
const DURATIONS = [1, 2, 3, 5, 10];

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const playVoicePreview = async (v: Voice) => {
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setPreviewVoice(v.voice_id);
      // Prefer the ElevenLabs preview_url (instant + free); fall back to live TTS.
      let url = v.preview_url || '';
      if (!url) {
        const res = await fetch('/api/tts-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'Once upon a time, an unforgettable adventure was about to begin.', voice_id: v.voice_id }),
        });
        const data = await res.json();
        url = data?.audio_url || '';
      }
      if (url) {
        const a = new Audio(url);
        audioRef.current = a;
        a.onended = () => setPreviewVoice(null);
        a.onerror = () => setPreviewVoice(null);
        await a.play();
      } else {
        setPreviewVoice(null);
      }
    } catch {
      setPreviewVoice(null);
    }
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
      } else if (d.status === 'failed') {
        setGenStatus('failed'); setGenErr(d.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
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
      if (d.job_id) {
        pollRef.current = setInterval(() => pollStatus(d.job_id), 3000);
        pollStatus(d.job_id);
      } else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.08)] sticky top-0 z-30 bg-black">
        <div className="max-w-[640px] mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={onBack} className="text-[11px] text-[rgba(255,255,255,0.3)] hover:text-white transition-colors">←</button>
          <span className="text-[13px] font-medium">Animated Storytelling</span>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-[rgba(255,255,255,0.3)]">
            {(['setup', 'character', 'generating'] as Step[]).map((s, i) => (
              <div key={s} className={`flex items-center gap-2 ${step === s || (step === 'done' && s === 'generating') ? 'text-white' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === s ? 'bg-white text-black border-white' : 'border-[rgba(255,255,255,0.15)]'}`}>{i + 1}</span>
                {i < 2 && <span className="w-4 h-px bg-[rgba(255,255,255,0.1)]" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-6 py-8 animate-[fadeIn_0.3s_ease]">

          {/* ── SETUP ── */}
          {step === 'setup' && (
            <div className="flex flex-col gap-6">
              <div>
                <label className="text-[11px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider block mb-2">Story title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="A detective uncovers a midnight conspiracy"
                  className="w-full bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-lg px-3.5 py-2.5 text-[14px] outline-none focus:border-[rgba(255,255,255,0.18)] transition-colors placeholder:text-[rgba(255,255,255,0.2)]" />
              </div>

              <div>
                <label className="text-[11px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider block mb-2">Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className={`py-2.5 rounded-lg border text-[12px] transition-all ${style === s.id ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)]'}`}>{s.label}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider block mb-2">Format</label>
                  <div className="flex flex-col gap-2">
                    {ASPECTS.map(a => (
                      <button key={a.id} onClick={() => setAspect(a.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] transition-all ${aspect === a.id ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)]'}`}>
                        <span>{a.label}</span><span className="text-[10px] text-[rgba(255,255,255,0.3)]">{a.sub}</span></button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[11px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider block mb-2">Quality</label>
                    <div className="flex gap-2">
                      {(['720p', '1080p'] as const).map(r => (
                        <button key={r} onClick={() => setResolution(r)}
                          className={`flex-1 py-2 rounded-lg border text-[12px] transition-all ${resolution === r ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)]'}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider block mb-2">Length</label>
                    <div className="flex gap-2">
                      {DURATIONS.map(d => (
                        <button key={d} onClick={() => setDurationMinutes(d)}
                          className={`flex-1 py-2 rounded-lg border text-[11px] transition-all ${durationMinutes === d ? 'border-white bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)]'}`}>{d} min</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Narrator */}
              <div className="border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium">Narrator</div>
                    <div className="text-[11px] text-[rgba(255,255,255,0.35)]">AI voice-over for each scene</div>
                  </div>
                  <button onClick={() => setIncludeNarrator(v => !v)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${includeNarrator ? 'bg-white' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-black transition-all ${includeNarrator ? 'left-[18px]' : 'left-0.5'} ${includeNarrator ? '' : 'bg-[rgba(255,255,255,0.5)]'}`} />
                  </button>
                </div>
                {includeNarrator && (
                  <div className="mt-3 border-t border-[rgba(255,255,255,0.05)] pt-3">
                    <div className="text-[11px] text-[rgba(255,255,255,0.4)] mb-2">Choose a voice</div>
                    <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                      {voices.map(v => (
                        <div key={v.voice_id} onClick={() => setVoiceId(v.voice_id === voiceId ? null : v.voice_id)}
                          className={`flex items-center justify-between gap-1.5 text-left pl-3 pr-1.5 py-2 rounded-lg border transition-all cursor-pointer ${voiceId === v.voice_id ? 'border-white bg-[rgba(255,255,255,0.08)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]'}`}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] font-medium">{v.name}</span>
                              {v.labels?.gender && <span className="text-[10px] text-[rgba(255,255,255,0.4)]">({v.labels.gender === 'male' ? 'Male' : 'Female'})</span>}
                            </div>
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
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[12px] text-[rgba(255,255,255,0.5)]">Narration speed</span>
                      <div className="flex gap-1.5">
                        {[1, 1.5, 2].map(sp => (
                          <button key={sp} onClick={() => setNarratorSpeed(sp)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${narratorSpeed === sp ? 'border-white bg-white text-black' : 'border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.25)]'}`}>
                            {sp}x
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[12px] text-[rgba(255,255,255,0.5)]">Captions (subtitles)</span>
                      <button onClick={() => setIncludeSubtitles(v => !v)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${includeSubtitles ? 'bg-white' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${includeSubtitles ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setStep('character')} disabled={!title.trim() || (includeNarrator && !voiceId)}
                className="self-end px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                Next: Character →
              </button>
              {includeNarrator && !voiceId && <p className="text-[11px] text-[rgba(255,255,255,0.3)] self-end -mt-3">Pick a narrator voice to continue</p>}
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

              <div className="flex justify-between">
                <button onClick={() => setStep('setup')} className="px-4 py-2 text-[12px] text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">← Back</button>
                <button onClick={startGeneration} disabled={!charUrl}
                  className="px-6 py-2.5 bg-white text-black text-[13px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                  Generate Story →
                </button>
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
