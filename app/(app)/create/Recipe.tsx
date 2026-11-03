'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RECIPE_CREDITS } from '@/lib/types';
import StudioGenerationView from './StudioGenerationView';
import { EditorHeader, EditorPage, Intro, Section, TextArea, Chip, Segmented, ActionBar, Credits, ErrorNote, Spinner, Ico } from '@/components/editor/kit';

type Step = 'dish' | 'recipe' | 'generating' | 'done';
// The plan comes from the backend (recipe_pipeline.clean_recipe); the form edits the words and amounts only and
// sends everything else back untouched.
interface RecipeStep { kind: string; line: string; title: string; amount: string; unit: string; name: string; [k: string]: unknown }
interface Plan { name: string; mode: 'drink' | 'dish'; intro: string; voice: string; steps: RecipeStep[]; [k: string]: unknown }

const IDEAS = ['Mojito', 'Margarita', 'Shakshuka', 'Pancake batter', 'Red lentil soup', 'Iced latte', 'Guacamole', 'Carbonara'];
const LENGTHS = [30, 40] as const;
const VOICES = [
  { value: 'af_heart', label: 'Heart' }, { value: 'am_michael', label: 'Michael' },
  { value: 'bf_emma', label: 'Emma' }, { value: 'bm_george', label: 'George' },
];
const ACTION = new Set(['muddle', 'stir', 'shake', 'whisk']);

export default function Recipe({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('dish');
  const [dish, setDish] = useState('');
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(30);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [genErr, setGenErr] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const writeRecipe = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/recipe/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dish: dish.trim(), length }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Something went wrong');
      setPlan(d.recipe); setStep('recipe');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const setStepField = (i: number, k: keyof RecipeStep, v: string) =>
    setPlan(p => p && ({ ...p, steps: p.steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const removeStep = (i: number) => setPlan(p => p && ({ ...p, steps: p.steps.filter((_, j) => j !== i) }));

  const pollStatus = async (jid: string) => {
    try {
      const r = await fetch(`/api/recipe/${jid}`);
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
    if (!plan) return;
    setStep('generating'); setGenStatus('processing'); setGenErr(''); setFinalVideo(null);
    try {
      const r = await fetch('/api/recipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipe: plan }) });
      const d = await r.json();
      if (r.status === 402) { setGenStatus('failed'); setGenErr(d.error || 'Not enough credits.'); return; }
      if (d.job_id) { pollRef.current = setInterval(() => pollStatus(d.job_id), 4000); pollStatus(d.job_id); }
      else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  const words = plan ? [plan.intro, ...plan.steps.map(s => s.line)].join(' ').split(/\s+/).filter(Boolean).length : 0;
  const seconds = plan ? Math.round(Math.max(words / 3.2, 2.4 + plan.steps.length * 2.7) + 2.8) : 0;
  const planOk = !!plan && plan.steps.length >= 3 && !!plan.intro.trim() && plan.steps.every(s => s.line.trim());
  const title = plan?.name || 'Recipe';

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader format="Recipe" onBack={onBack} steps={['Dish', 'Recipe', 'Render']}
        current={step === 'dish' ? 0 : step === 'recipe' ? 1 : 2}
        onStep={i => { if (step === 'generating') return; if (i === 0) setStep('dish'); if (i === 1 && plan) setStep('recipe'); }}
        right={<Credits n={RECIPE_CREDITS} />} />

      {step === 'dish' && (
        <>
          <EditorPage>
            <Intro title="What are we making?" desc="A drink or a dish. Every ingredient goes into the glass or the pan with its measurement on screen, from empty to finished." />
            <Section n={1} title="Dish or drink" hint="A name, or paste your own recipe">
              <TextArea big value={dish} onChange={e => setDish(e.target.value)} rows={4} maxLength={1500}
                placeholder="Shakshuka — or paste your recipe with its amounts and steps" />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {IDEAS.map(i => <Chip key={i} on={dish.trim().toLowerCase() === i.toLowerCase()} onClick={() => setDish(i)}>{i}</Chip>)}
              </div>
            </Section>
            <Section n={2} title="Length">
              <Segmented value={length} onChange={setLength} options={LENGTHS.map(l => ({ value: l, label: `${l} s` }))} />
            </Section>
            {err && <ErrorNote>{err}</ErrorNote>}
          </EditorPage>
          <ActionBar left={<span>The recipe is free to write and edit · credits are used when you render</span>}>
            <button onClick={writeRecipe} disabled={dish.trim().length < 2 || busy} className="ui-btn ui-btn-primary">
              {busy ? <><Spinner /> Writing…</> : <>Write recipe{Ico.arrow}</>}
            </button>
          </ActionBar>
        </>
      )}

      {step === 'recipe' && plan && (
        <>
          <EditorPage width={820}>
            <Intro title="Check the recipe" desc="Edit the amounts and the lines. The narrator reads each line while that step happens on screen."
              right={<span className="text-[12px] text-[var(--fg-4)] tabular-nums">{plan.steps.length} steps · ~{seconds} s</span>} />
            <Section n={1} title="Name">
              <input className="ui-input w-full" value={plan.name} onChange={e => setPlan({ ...plan, name: e.target.value })} maxLength={24} />
            </Section>
            <Section n={2} title="Opening line">
              <input className="ui-input w-full" value={plan.intro} onChange={e => setPlan({ ...plan, intro: e.target.value })} maxLength={120} />
            </Section>
            <Section n={3} title="Steps" hint={plan.mode === 'drink' ? 'In the glass, in this order' : 'In the pan, in this order'}>
              <div className="space-y-2.5">
                {plan.steps.map((s, i) => (
                  <div key={i} className="rounded-[10px] border border-[var(--line)] p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-right text-[11.5px] text-[var(--fg-4)] tabular-nums flex-shrink-0">{i + 1}</span>
                      <input className="ui-input flex-1 min-w-0" value={s.title} onChange={e => setStepField(i, 'title', e.target.value)} maxLength={22} aria-label="Step title" />
                      {!ACTION.has(s.kind) && <>
                        <input className="ui-input w-[84px]" value={s.amount} onChange={e => setStepField(i, 'amount', e.target.value)} maxLength={10} placeholder="Amount" aria-label="Amount" />
                        <input className="ui-input w-[84px]" value={s.unit} onChange={e => setStepField(i, 'unit', e.target.value)} maxLength={10} placeholder="Unit" aria-label="Unit" />
                      </>}
                      <button type="button" className="ui-btn ui-btn-sm ui-btn-ghost flex-shrink-0" onClick={() => removeStep(i)} disabled={plan.steps.length <= 3} aria-label="Remove step">×</button>
                    </div>
                    <input className="ui-input w-full mt-2" value={s.line} onChange={e => setStepField(i, 'line', e.target.value)} maxLength={140} aria-label="Narration" />
                  </div>
                ))}
              </div>
            </Section>
            <Section n={4} title="Narrator">
              <Segmented value={plan.voice} onChange={v => setPlan({ ...plan, voice: v })} options={VOICES} />
            </Section>
            {err && <ErrorNote>{err}</ErrorNote>}
          </EditorPage>
          <ActionBar left={<button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={writeRecipe} disabled={busy}>{busy ? <><Spinner /> Rewriting…</> : 'Rewrite'}</button>}>
            <span className="hidden sm:inline"><Credits n={RECIPE_CREDITS} /></span>
            <button onClick={generate} disabled={!planOk} className="ui-btn ui-btn-primary">Render{Ico.arrow}</button>
          </ActionBar>
        </>
      )}

      {step === 'generating' && (
        <StudioGenerationView title={title} modeLabel="Recipe" aspect="9:16" status={genStatus} message={genMsg || 'Recording the narrator...'}
          error={genErr} scenes={[]} finalVideo={finalVideo} step={genStep} totalSteps={genTotal}
          onBack={() => setStep('recipe')} onRetry={generate} />
      )}

      {step === 'done' && finalVideo && (
        <StudioGenerationView title={title} modeLabel="Recipe" aspect="9:16" status={genStatus} message="Your reel is ready"
          scenes={[]} finalVideo={finalVideo} step={genTotal} totalSteps={genTotal || 1} onBack={() => setStep('recipe')}
          downloadHref={`/api/download?url=${encodeURIComponent(finalVideo)}&filename=${encodeURIComponent(title + '.mp4')}`}
          onCreateAnother={() => { setStep('dish'); setPlan(null); setFinalVideo(null); setGenStatus('idle'); }} />
      )}
    </div>
  );
}
