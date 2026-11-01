'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SURVIVAL_CREDITS } from '@/lib/types';
import StudioGenerationView from './StudioGenerationView';
import { EditorHeader, EditorPage, Intro, Section, TextArea, Chip, Segmented, ActionBar, Credits, Ico } from '@/components/editor/kit';

type Step = 'setup' | 'generating' | 'done';

const SETTINGS = ['auto', 'apartment', 'subway', 'school at night', 'hospital', 'cabin', 'plane', 'office', 'motel', 'elevator', 'parking garage', 'lighthouse'];
const label = (s: string) => (s === 'auto' ? 'You pick' : s[0].toUpperCase() + s.slice(1));

const IDEAS = [
  'The power dies in your tower block and the water stops',
  'A note under your door lists three rules for tonight',
  'The last train stops between two stations',
  'You wake up locked in the school after dark',
  'A storm traps you in a motel with one other guest',
];

const FACTS = [
  ['Vertical', '9:16 · 1080p'],
  ['Hook', '“Imagine you…”'],
  ['On screen', 'Day, clock, rules'],
  ['Ending', 'A choice to comment'],
];

export default function SurvivalStory({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('setup');
  const [idea, setIdea] = useState('');
  const [setting, setSetting] = useState('auto');
  const [seconds, setSeconds] = useState<60 | 70 | 80 | 90>(70);
  const [day, setDay] = useState(1);

  const [genStatus, setGenStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [genMsg, setGenMsg] = useState('');
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [title, setTitle] = useState('');
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [genErr, setGenErr] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const pollStatus = async (jid: string) => {
    try {
      const r = await fetch(`/api/survival/${jid}`);
      const d = await r.json();
      setGenMsg(d.message || ''); setGenStep(d.step || 0); setGenTotal(d.total_steps || 0);
      if (d.title) setTitle(d.title);
      if (d.status === 'completed') {
        setGenStatus('completed'); setFinalVideo(d.final_video_url); setStep('done');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'completed', final_video_url: d.final_video_url, title: d.title || undefined }).eq('job_id', jid); } catch { /* noop */ }
      } else if (d.status === 'failed') {
        setGenStatus('failed'); setGenErr(d.error || 'Generation failed');
        if (pollRef.current) clearInterval(pollRef.current);
        try { await createClient().from('animations').update({ status: 'failed' }).eq('job_id', jid); } catch { /* noop */ }
      } else setGenStatus('processing');
    } catch { /* keep polling */ }
  };

  const startGeneration = async () => {
    setStep('generating'); setGenStatus('processing'); setGenErr(''); setFinalVideo(null); setTitle('');
    try {
      const r = await fetch('/api/survival', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim(), setting, seconds, day }),
      });
      const d = await r.json();
      if (r.status === 402) { setGenStatus('failed'); setGenErr(d.error || 'Not enough credits.'); return; }
      if (d.job_id) {
        pollRef.current = setInterval(() => pollStatus(d.job_id), 5000);
        pollStatus(d.job_id);
      } else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  const shownTitle = title || (idea.trim() ? idea.trim().split('\n')[0].slice(0, 80) : 'Survival Story');

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader
        format="Survival Story"
        onBack={onBack}
        steps={['Setup', 'Render']}
        current={step === 'setup' ? 0 : 1}
        right={<Credits n={SURVIVAL_CREDITS} />}
      />

      {step === 'setup' && (
        <>
          <EditorPage>
            <Intro title="What are they surviving tonight?"
              desc="“Imagine you…” A stickman thriller in real 3D sets: a clock that keeps moving, rules that pay off, a twist that breaks one, and a choice your viewers argue about in the comments." />

            <Section title="Idea" hint="Optional. Leave it empty and we pitch ten and pick the best.">
              <TextArea big value={idea} onChange={e => setIdea(e.target.value)} rows={3} maxLength={400}
                placeholder="A place, a threat, a ticking clock…" />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {IDEAS.map(i => (
                  <Chip key={i} on={idea.trim().toLowerCase() === i.toLowerCase()} onClick={() => setIdea(i)}>{i}</Chip>
                ))}
              </div>
            </Section>

            <Section title="Setting" hint="Rotate it between episodes.">
              <div className="flex flex-wrap gap-1.5">
                {SETTINGS.map(s => <Chip key={s} on={setting === s} onClick={() => setSetting(s)}>{label(s)}</Chip>)}
              </div>
            </Section>

            <Section title="Length">
              <Segmented<60 | 70 | 80 | 90> full value={seconds} onChange={setSeconds} options={[
                { value: 60, label: '60 s' },
                { value: 70, label: '70 s', sub: 'best' },
                { value: 80, label: '80 s' },
                { value: 90, label: '90 s' },
              ]} />
            </Section>

            <Section title="Episode" hint="The day on the HUD. Day 1 starts a series.">
              <Segmented<number> value={day} onChange={setDay} options={[1, 2, 3, 4, 5].map(n => ({ value: n, label: `Day ${n}` }))} />
            </Section>

            <Section title="What you get">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {FACTS.map(([k, v]) => (
                  <div key={k} className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
                    <div className="text-[11.5px] text-[var(--fg-4)]">{k}</div>
                    <div className="text-[13px] mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[var(--fg-4)] mt-3">Takes about 10–15 minutes: story, voices, the sets and shots, a still check, render and sound.</p>
            </Section>
          </EditorPage>

          <ActionBar left={<><Credits n={SURVIVAL_CREDITS} /><span className="hidden sm:inline">· deducted when you generate</span></>}>
            <button onClick={startGeneration} className="ui-btn ui-btn-primary">
              Generate{Ico.arrow}
            </button>
          </ActionBar>
        </>
      )}

      {step === 'generating' && (
        <StudioGenerationView
          title={shownTitle}
          modeLabel="Survival Story"
          aspect="9:16"
          status={genStatus}
          message={genMsg || 'Writing the story...'}
          error={genErr}
          scenes={[]}
          finalVideo={finalVideo}
          step={genStep}
          totalSteps={genTotal}
          onBack={() => setStep('setup')}
          onRetry={startGeneration}
        />
      )}

      {step === 'done' && finalVideo && (
        <StudioGenerationView
          title={shownTitle}
          modeLabel="Survival Story"
          aspect="9:16"
          status={genStatus}
          message="Your survival story is ready"
          scenes={[]}
          finalVideo={finalVideo}
          step={genTotal}
          totalSteps={genTotal || 1}
          onBack={() => setStep('setup')}
          downloadHref={`/api/download?url=${encodeURIComponent(finalVideo)}&filename=${encodeURIComponent(shownTitle + '.mp4')}`}
          onCreateAnother={() => { setStep('setup'); setFinalVideo(null); setGenStatus('idle'); setTitle(''); }}
        />
      )}
    </div>
  );
}
