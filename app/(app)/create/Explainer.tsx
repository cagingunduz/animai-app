'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EXPLAINER_CREDITS } from '@/lib/types';
import StudioGenerationView from './StudioGenerationView';
import { EditorHeader, EditorPage, Intro, Section, Label, TextArea, Chip, Segmented, ActionBar, Credits, ErrorNote, Spinner, Ico } from '@/components/editor/kit';

type Step = 'topic' | 'script' | 'style' | 'generating' | 'done';
interface Point { name: string; line: string; explain: string[] }
interface Script { title: string; hook: string[]; points: Point[]; close: string }
type Params = Record<string, string>;
interface VoiceSample { voice: string; label: string; url: string }

// The presenter's parts (kept in step with render_service/explainer/presenter.js).
const OPTIONS: Record<string, string[]> = {
  skin: ['light', 'fair', 'medium', 'tan', 'brown', 'deep'],
  hair: ['short', 'curly', 'long', 'bun', 'buzz', 'bald', 'side', 'afro'],
  hairColor: ['black', 'brown', 'auburn', 'blonde', 'grey', 'white', 'pink', 'blue'],
  glasses: ['none', 'round', 'square'],
  top: ['hoodie', 'tee', 'shirt', 'blazer'],
  topColor: ['red', 'ink', 'navy', 'green', 'mustard', 'grey', 'cream', 'blue', 'purple'],
  beard: ['none', 'stubble', 'full', 'moustache'],
  accessory: ['none', 'cap', 'earrings', 'headphones'],
};
const PART_LABEL: Record<string, string> = { skin: 'Skin', hair: 'Hair', hairColor: 'Hair colour', glasses: 'Glasses', top: 'Top', topColor: 'Top colour', beard: 'Beard', accessory: 'Extra' };
const DEFAULT_PARAMS: Params = { skin: 'fair', hair: 'short', hairColor: 'brown', glasses: 'round', top: 'hoodie', topColor: 'red', beard: 'none', accessory: 'none' };
const IDEAS = ['Why you forget what you read', 'How compound interest works', 'How to fall asleep faster', 'Why planes fly so high', 'How to write a cold email that gets replies', 'Why some passwords are easy to crack'];
const VOICE_DEFAULT = 'am_michael';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const words = (sc: Script | null) => !sc ? 0 : [...sc.hook, ...sc.points.flatMap(p => [p.line, ...p.explain]), sc.close].join(' ').split(/\s+/).filter(Boolean).length;

// Loads the presenter rig once and draws a live, talking preview of the chosen parts.
function PresenterPreview({ params }: { params: Params }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!(window as any).EXP);
  useEffect(() => {
    if ((window as any).EXP) { setReady(true); return; }
    let s = document.querySelector<HTMLScriptElement>('script[data-presenter]');
    if (!s) { s = document.createElement('script'); s.src = '/explainer/presenter.js'; s.dataset.presenter = '1'; document.head.appendChild(s); }
    const on = () => setReady(true);
    s.addEventListener('load', on);
    return () => s?.removeEventListener('load', on);
  }, []);
  useEffect(() => {
    if (!ready || !host.current) return;
    host.current.innerHTML = '';
    const talk = '0013567532100002468864200000135797531000000';
    const rig = (window as any).EXP.rig(host.current, params, { mouth: talk.repeat(40), duration: 600, nods: [1.2, 4.8], points: [], palms: [], seed: 5 });
    let raf = 0; const t0 = performance.now();
    const loop = () => { rig.render(((performance.now() - t0) / 1000) % 60); raf = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [ready, params]);
  return (
    <div className="relative w-full aspect-[650/560] overflow-hidden rounded-[12px] border border-[var(--line)]" style={{ background: '#EBE7E1' }}>
      <div ref={host} className="absolute left-1/2 top-[6%] -translate-x-1/2 origin-top scale-[0.62] sm:scale-[0.7]" style={{ width: 650, height: 770 }} />
      {!ready && <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>}
    </div>
  );
}

function shrinkImage(file: File, max = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function Explainer({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('topic');
  const [topic, setTopic] = useState('');
  const [mention, setMention] = useState('');
  const [script, setScript] = useState<Script | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const [voices, setVoices] = useState<VoiceSample[]>([]);
  const [voice, setVoice] = useState(VOICE_DEFAULT);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [mode, setMode] = useState<'random' | 'describe' | 'photo'>('random');
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [describe, setDescribe] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [genErr, setGenErr] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); audioRef.current?.pause(); }, []);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error || 'Something went wrong');
    return d;
  };

  const writeScript = async () => {
    setBusy('script'); setErr('');
    try {
      const d = await post('/api/explainer/script', { topic: topic.trim(), mention: mention.trim() || null });
      setScript(d.script); setStep('script');
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };

  const setPoint = (i: number, patch: Partial<Point>) => setScript(s => s && ({ ...s, points: s.points.map((p, j) => j === i ? { ...p, ...patch } : p) }));

  const loadVoices = async () => {
    if (!script) return;
    setBusy('voices'); setErr('');
    try { const d = await post('/api/explainer/voices', { text: script.hook[0] }); setVoices(d.voices || []); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };
  const play = (v: VoiceSample) => {
    audioRef.current?.pause();
    if (playing === v.voice) { setPlaying(null); return; }
    const a = new Audio(v.url); audioRef.current = a; setPlaying(v.voice);
    a.onended = () => setPlaying(null); a.play().catch(() => setPlaying(null));
  };

  const shuffle = () => {
    const EXP = (window as any).EXP;
    const seed = Math.floor(Math.random() * 1e6);
    if (EXP) setParams(EXP.random(seed));
    else setParams(Object.fromEntries(Object.entries(OPTIONS).map(([k, v]) => [k, v[seed % v.length]])));
  };
  const designPresenter = async () => {
    setBusy('presenter'); setErr('');
    try {
      const d = await post('/api/explainer/presenter', mode === 'photo' ? { image: photo, description: describe.trim() || null } : { description: describe.trim() });
      setParams(d.params);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };
  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    try { setPhoto(await shrinkImage(f)); } catch { setErr('That picture could not be read.'); }
  };

  const pollStatus = async (jid: string) => {
    try {
      const r = await fetch(`/api/explainer/${jid}`);
      const d = await r.json();
      setGenMsg(d.message || ''); setGenStep(d.step || 0); setGenTotal(d.total_steps || 0);
      if (d.status === 'completed') {
        setGenStatus('completed'); setFinalVideo(d.final_video_url); setStep('done');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'completed', final_video_url: d.final_video_url }).eq('job_id', jid); } catch { /* noop */ }
      } else if (d.status === 'failed') {
        setGenStatus('failed'); setGenErr(d.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'failed' }).eq('job_id', jid); } catch { /* noop */ }
      } else setGenStatus('processing');
    } catch { /* keep polling */ }
  };

  const generate = async () => {
    if (!script) return;
    audioRef.current?.pause();
    setStep('generating'); setGenStatus('processing'); setGenErr(''); setFinalVideo(null);
    try {
      const r = await fetch('/api/explainer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script, voice, presenter: params }) });
      const d = await r.json();
      if (r.status === 402) { setGenStatus('failed'); setGenErr(d.error || 'Not enough credits.'); return; }
      if (d.job_id) { pollRef.current = setInterval(() => pollStatus(d.job_id), 3000); pollStatus(d.job_id); }
      else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  const stepIndex = step === 'topic' ? 0 : step === 'script' ? 1 : step === 'style' ? 2 : 3;
  const n = words(script), seconds = Math.round(n / 2.8);
  const scriptOk = !!script && script.hook.every(h => h.trim()) && script.points.length >= 2 && script.points.every(p => p.line.trim()) && !!script.close.trim();
  const title = script?.title || topic || 'Explainer';

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader format="Explainer" onBack={onBack} steps={['Topic', 'Script', 'Voice & host', 'Render']} current={stepIndex}
        onStep={i => { if (i === 0 && step !== 'generating') setStep('topic'); if (i === 1 && script && step !== 'generating') setStep('script'); if (i === 2 && scriptOk && step !== 'generating') setStep('style'); }}
        right={<Credits n={EXPLAINER_CREDITS} />} />

      {step === 'topic' && (
        <>
          <EditorPage>
            <Intro title="What should we explain?" desc="A cartoon host explains it in 30–60 seconds while cards, counters and little demos act out every point. You approve the script before anything is recorded." />
            <Section n={1} title="Topic">
              <TextArea big value={topic} onChange={e => setTopic(e.target.value)} rows={2} maxLength={500} placeholder="Why you forget what you read…" />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {IDEAS.map(i => <Chip key={i} on={topic === i} onClick={() => setTopic(i)}>{i}</Chip>)}
              </div>
            </Section>
            <Section n={2} title="Must mention" hint="Optional: a product, tool, link or name, woven in naturally">
              <input className="ui-input w-full" value={mention} onChange={e => setMention(e.target.value)} maxLength={300} placeholder="e.g. our app Animave, a free template at animave.com" />
            </Section>
            {err && <ErrorNote>{err}</ErrorNote>}
          </EditorPage>
          <ActionBar left={<span>The script is free to write and edit · credits are used when you render</span>}>
            <button onClick={writeScript} disabled={!topic.trim() || !!busy} className="ui-btn ui-btn-primary">
              {busy === 'script' ? <><Spinner /> Writing…</> : <>Write script{Ico.arrow}</>}
            </button>
          </ActionBar>
        </>
      )}

      {step === 'script' && script && (
        <>
          <EditorPage>
            <Intro title="Check the script" desc="Edit anything. The host reads it exactly as written." right={<span className="text-[12px] text-[var(--fg-4)] tabular-nums">{n} words · ~{seconds} s</span>} />
            <Section n={1} title="Title">
              <input className="ui-input w-full" value={script.title} onChange={e => setScript({ ...script, title: e.target.value })} maxLength={100} />
            </Section>
            <Section n={2} title="Hook" hint="Line 1 names the problem in a few words · line 2 promises the payoff">
              {script.hook.map((h, i) => (
                <input key={i} className="ui-input w-full mb-2" value={h} onChange={e => setScript({ ...script, hook: script.hook.map((x, j) => j === i ? e.target.value : x) })} />
              ))}
            </Section>
            <Section n={3} title="Points" right={script.points.length < 7 ? <button className="ui-btn ui-btn-sm ui-btn-secondary" onClick={() => setScript({ ...script, points: [...script.points, { name: '', line: '', explain: [''] }] })}>Add point</button> : undefined}>
              <div className="space-y-3">
                {script.points.map((p, i) => (
                  <div key={i} className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[12px] text-[var(--fg-4)] tabular-nums">#{i + 1}</span>
                      <input className="ui-input flex-1 !h-8 !text-[12.5px]" value={p.name} onChange={e => setPoint(i, { name: e.target.value })} placeholder="short name" maxLength={24} />
                      {script.points.length > 2 && <button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={() => setScript({ ...script, points: script.points.filter((_, j) => j !== i) })}>Remove</button>}
                    </div>
                    <Label>Point</Label>
                    <input className="ui-input w-full mb-2" value={p.line} onChange={e => setPoint(i, { line: e.target.value })} />
                    <Label>Explanation</Label>
                    {p.explain.map((x, j) => (
                      <input key={j} className="ui-input w-full mb-2" value={x} onChange={e => setPoint(i, { explain: p.explain.map((y, k) => k === j ? e.target.value : y) })} />
                    ))}
                    {p.explain.length < 2 && <button className="text-[12px] text-[var(--fg-3)] hover:text-white" onClick={() => setPoint(i, { explain: [...p.explain, ''] })}>+ another line</button>}
                  </div>
                ))}
              </div>
            </Section>
            <Section n={4} title="Closing line" hint="Pays off the hook, so the video loops">
              <input className="ui-input w-full" value={script.close} onChange={e => setScript({ ...script, close: e.target.value })} />
            </Section>
            {err && <ErrorNote>{err}</ErrorNote>}
          </EditorPage>
          <ActionBar left={<button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={writeScript} disabled={!!busy}>{busy === 'script' ? <><Spinner /> Rewriting…</> : 'Rewrite'}</button>}>
            <button onClick={() => { setStep('style'); if (!voices.length) loadVoices(); }} disabled={!scriptOk} className="ui-btn ui-btn-primary">Looks good{Ico.arrow}</button>
          </ActionBar>
        </>
      )}

      {step === 'style' && script && (
        <>
          <EditorPage width={820}>
            <Intro title="Voice and host" desc="Pick who reads it and who presents it." />
            <Section n={1} title="Voice" hint={`Each one reads: “${script.hook[0]}”`}>
              {busy === 'voices' && !voices.length ? (
                <div className="flex items-center gap-2 text-[12.5px] text-[var(--fg-3)] py-3"><Spinner /> Recording samples…</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(voices.length ? voices : [{ voice: VOICE_DEFAULT, label: 'Michael (US, calm)', url: '' }]).map(v => (
                    <button key={v.voice} type="button" onClick={() => setVoice(v.voice)}
                      className={`flex items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left transition-colors ${voice === v.voice ? 'border-white/50 bg-white/[0.06]' : 'border-[var(--line)] hover:border-[var(--line-3)]'}`}>
                      {v.url && (
                        <span role="button" onClick={e => { e.stopPropagation(); play(v); }} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] flex-shrink-0">{playing === v.voice ? '❚❚' : '▶'}</span>
                      )}
                      <span className="text-[12.5px] leading-tight">{v.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {!voices.length && busy !== 'voices' && <button className="mt-2 text-[12px] text-[var(--fg-3)] hover:text-white" onClick={loadVoices}>Hear the voices</button>}
            </Section>

            <Section n={2} title="Presenter">
              <div className="grid md:grid-cols-[300px_1fr] gap-5">
                <PresenterPreview params={params} />
                <div>
                  <Segmented full value={mode} onChange={setMode} options={[
                    { value: 'random', label: 'Random' }, { value: 'describe', label: 'Describe' }, { value: 'photo', label: 'Your character' },
                  ]} />
                  <div className="mt-4">
                    {mode === 'random' && (
                      <button className="ui-btn ui-btn-secondary" onClick={shuffle}>Shuffle</button>
                    )}
                    {mode === 'describe' && (
                      <>
                        <TextArea value={describe} onChange={e => setDescribe(e.target.value)} rows={3} maxLength={500}
                          placeholder="A young woman with curly red hair, round glasses and a mustard hoodie…" />
                        <button className="ui-btn ui-btn-secondary mt-2" onClick={designPresenter} disabled={!describe.trim() || !!busy}>
                          {busy === 'presenter' ? <><Spinner /> Drawing…</> : 'Create host'}
                        </button>
                      </>
                    )}
                    {mode === 'photo' && (
                      <>
                        <label className="flex items-center gap-3 rounded-[10px] border border-dashed border-[var(--line-2)] px-3 py-3 cursor-pointer hover:border-[var(--line-3)]">
                          {photo ? <img src={photo} alt="" className="w-14 h-14 rounded-md object-cover" /> : <span className="w-14 h-14 rounded-md bg-white/5 flex items-center justify-center text-[var(--fg-4)]">+</span>}
                          <span className="text-[12.5px] text-[var(--fg-3)]">A photo of you, or a drawing of your character. We turn it into a host in the same style.</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => onPhoto(e.target.files?.[0])} />
                        </label>
                        <button className="ui-btn ui-btn-secondary mt-2" onClick={designPresenter} disabled={!photo || !!busy}>
                          {busy === 'presenter' ? <><Spinner /> Drawing…</> : 'Create my host'}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-5 pt-4 border-t border-[var(--line)]">
                    {Object.entries(OPTIONS).map(([k, opts]) => (
                      <label key={k} className="flex items-center justify-between gap-2 text-[12px] text-[var(--fg-3)]">
                        {PART_LABEL[k]}
                        <select className="ui-input !h-8 !py-0 !text-[12.5px] w-[120px]" value={params[k]} onChange={e => setParams({ ...params, [k]: e.target.value })}>
                          {opts.map(o => <option key={o} value={o}>{cap(o)}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
            {err && <ErrorNote>{err}</ErrorNote>}
          </EditorPage>
          <ActionBar left={<><Credits n={EXPLAINER_CREDITS} /><span className="hidden sm:inline">· ~{seconds} s video · deducted when you render</span></>}>
            <button onClick={generate} disabled={!scriptOk} className="ui-btn ui-btn-primary">Render{Ico.arrow}</button>
          </ActionBar>
        </>
      )}

      {step === 'generating' && (
        <StudioGenerationView title={title} modeLabel="Explainer" aspect="9:16" status={genStatus} message={genMsg || 'Recording the narrator...'}
          error={genErr} scenes={[]} finalVideo={finalVideo} step={genStep} totalSteps={genTotal}
          onBack={() => setStep('style')} onRetry={generate} />
      )}

      {step === 'done' && finalVideo && (
        <StudioGenerationView title={title} modeLabel="Explainer" aspect="9:16" status={genStatus} message="Your explainer is ready"
          scenes={[]} finalVideo={finalVideo} step={genTotal} totalSteps={genTotal || 1} onBack={() => setStep('style')}
          downloadHref={`/api/download?url=${encodeURIComponent(finalVideo)}&filename=${encodeURIComponent(title + '.mp4')}`}
          onCreateAnother={() => { setStep('topic'); setScript(null); setFinalVideo(null); setGenStatus('idle'); }} />
      )}
    </div>
  );
}
