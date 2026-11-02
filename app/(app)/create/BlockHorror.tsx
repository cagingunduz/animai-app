'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BLOCK_CREDITS } from '@/lib/types';
import StudioGenerationView from './StudioGenerationView';
import { EditorHeader, EditorPage, Intro, Section, Label, TextArea, Segmented, ActionBar, Credits, ErrorNote, Spinner, Ico } from '@/components/editor/kit';

type Step = 'story' | 'script' | 'generating' | 'done';
type Role = 'narration' | 'run' | 'blackout' | 'twist';
interface Line { id: string; text: string; role: Role }
interface Script { title: string; hero: string; loved_one: string; lines: Line[]; monster_line: string; keywords: string[] }
interface Pitch { title: string; rule: string; twist: string }

const ROLE_LABEL: Record<Role, string> = { narration: '', run: 'Run!', blackout: 'Blackout', twist: 'Twist' };
const LENGTHS = [40, 45, 50] as const;

export default function BlockHorror({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('story');
  const [story, setStory] = useState('');
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(45);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [script, setScript] = useState<Script | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [genErr, setGenErr] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.error || 'Something went wrong');
    return d;
  };

  const pitch = async () => {
    setBusy('pitch'); setErr('');
    try { const d = await post('/api/block/pitches', {}); setPitches(d.pitches || []); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };
  const writeScript = async () => {
    setBusy('script'); setErr('');
    try { const d = await post('/api/block/script', { story: story.trim(), length }); setScript(d.script); setStep('script'); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };
  const setLine = (i: number, text: string) => setScript(s => s && ({ ...s, lines: s.lines.map((l, j) => (j === i ? { ...l, text } : l)) }));

  const pollStatus = async (jid: string) => {
    try {
      const r = await fetch(`/api/block/${jid}`);
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
    setStep('generating'); setGenStatus('processing'); setGenErr(''); setFinalVideo(null);
    try {
      const r = await fetch('/api/block', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ script }) });
      const d = await r.json();
      if (r.status === 402) { setGenStatus('failed'); setGenErr(d.error || 'Not enough credits.'); return; }
      if (d.job_id) { pollRef.current = setInterval(() => pollStatus(d.job_id), 4000); pollStatus(d.job_id); }
      else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  const words = script ? script.lines.map(l => l.text).join(' ').split(/\s+/).filter(Boolean).length : 0;
  const seconds = Math.round(words / 3.5) + 3;
  const scriptOk = !!script && script.lines.length >= 10 && script.lines.every(l => l.text.trim()) && !!script.monster_line.trim();
  const title = script?.title || 'Block Horror';

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader format="Block Horror" onBack={onBack} steps={['Story', 'Script', 'Render']}
        current={step === 'story' ? 0 : step === 'script' ? 1 : 2}
        onStep={i => { if (step === 'generating') return; if (i === 0) setStep('story'); if (i === 1 && script) setStep('script'); }}
        right={<Credits n={BLOCK_CREDITS} />} />

      {step === 'story' && (
        <>
          <EditorPage>
            <Intro title="What does this town obey?" desc="One rule everyone follows, and the real reason behind it, revealed at the end. A kid breaks the rule for someone he loves; the tall thing is waiting in the dark." />
            <Section n={1} title="Your story" hint="The rule, then the twist">
              <TextArea big value={story} onChange={e => setStory(e.target.value)} rows={3} maxLength={800}
                placeholder="In this town, nobody stays outside when the streetlights die. Twist: the lights were never keeping it out, they were keeping it asleep." />
              <div className="mt-3 flex items-center gap-3">
                <button className="ui-btn ui-btn-sm ui-btn-secondary" onClick={pitch} disabled={!!busy}>
                  {busy === 'pitch' ? <><Spinner /> Thinking…</> : 'Pitch me 3'}
                </button>
                <span className="text-[12px] text-[var(--fg-4)]">No idea? Get three original rules with their twists.</span>
              </div>
              {pitches.length > 0 && (
                <div className="grid gap-2 mt-3">
                  {pitches.map((p, i) => {
                    const text = `${p.rule} Twist: ${p.twist}`;
                    return (
                      <button key={i} type="button" onClick={() => setStory(text)}
                        className={`text-left rounded-[10px] border px-3.5 py-3 transition-colors ${story === text ? 'border-white/50 bg-white/[0.06]' : 'border-[var(--line)] hover:border-[var(--line-3)]'}`}>
                        <div className="text-[13px] font-medium">{p.title}</div>
                        <div className="text-[12.5px] text-[var(--fg-2)] mt-1">{p.rule}</div>
                        <div className="text-[12px] text-[var(--fg-4)] mt-1">Twist: {p.twist}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>
            <Section n={2} title="Length">
              <Segmented value={length} onChange={setLength} options={LENGTHS.map(l => ({ value: l, label: `${l} s` }))} />
            </Section>
            {err && <ErrorNote>{err}</ErrorNote>}
          </EditorPage>
          <ActionBar left={<span>The script is free to write and edit · credits are used when you render</span>}>
            <button onClick={writeScript} disabled={story.trim().length < 5 || !!busy} className="ui-btn ui-btn-primary">
              {busy === 'script' ? <><Spinner /> Writing…</> : <>Write script{Ico.arrow}</>}
            </button>
          </ActionBar>
        </>
      )}

      {step === 'script' && script && (
        <>
          <EditorPage>
            <Intro title="Check the script" desc="Edit any line. The narrator reads it exactly as written; sounds come from the sound design, so keep sound words out."
              right={<span className="text-[12px] text-[var(--fg-4)] tabular-nums">{words} words · ~{seconds} s</span>} />
            <Section n={1} title="Title">
              <input className="ui-input w-full" value={script.title} onChange={e => setScript({ ...script, title: e.target.value })} maxLength={80} />
            </Section>
            <Section n={2} title="Narration">
              <div className="space-y-1.5">
                {script.lines.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-2">
                    <span className="w-6 text-right text-[11.5px] text-[var(--fg-4)] tabular-nums flex-shrink-0">{i + 1}</span>
                    <input className="ui-input flex-1" value={l.text} onChange={e => setLine(i, e.target.value)} />
                    {ROLE_LABEL[l.role] && <span className="text-[11px] px-2 py-0.5 rounded-full border border-[var(--line-2)] text-[var(--fg-3)] flex-shrink-0">{ROLE_LABEL[l.role]}</span>}
                  </div>
                ))}
              </div>
            </Section>
            <Section n={3} title="The thing says" hint="One short line, in its own deep voice">
              <input className="ui-input w-full" value={script.monster_line} onChange={e => setScript({ ...script, monster_line: e.target.value })} maxLength={40} />
            </Section>
            <Section n={4} title="Red words" hint="Key nouns shown in red in the captions">
              <Label>Comma separated</Label>
              <input className="ui-input w-full" value={script.keywords.join(', ')}
                onChange={e => setScript({ ...script, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </Section>
            {err && <ErrorNote>{err}</ErrorNote>}
          </EditorPage>
          <ActionBar left={<button className="ui-btn ui-btn-sm ui-btn-ghost" onClick={writeScript} disabled={!!busy}>{busy === 'script' ? <><Spinner /> Rewriting…</> : 'Rewrite'}</button>}>
            <span className="hidden sm:inline"><Credits n={BLOCK_CREDITS} /></span>
            <button onClick={generate} disabled={!scriptOk} className="ui-btn ui-btn-primary">Render{Ico.arrow}</button>
          </ActionBar>
        </>
      )}

      {step === 'generating' && (
        <StudioGenerationView title={title} modeLabel="Block Horror" aspect="9:16" status={genStatus} message={genMsg || 'Recording the narrator...'}
          error={genErr} scenes={[]} finalVideo={finalVideo} step={genStep} totalSteps={genTotal}
          onBack={() => setStep('script')} onRetry={generate} />
      )}

      {step === 'done' && finalVideo && (
        <StudioGenerationView title={title} modeLabel="Block Horror" aspect="9:16" status={genStatus} message="Your Short is ready"
          scenes={[]} finalVideo={finalVideo} step={genTotal} totalSteps={genTotal || 1} onBack={() => setStep('script')}
          downloadHref={`/api/download?url=${encodeURIComponent(finalVideo)}&filename=${encodeURIComponent(title + '.mp4')}`}
          onCreateAnother={() => { setStep('story'); setScript(null); setFinalVideo(null); setGenStatus('idle'); }} />
      )}
    </div>
  );
}
