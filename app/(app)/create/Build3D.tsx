'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BUILD3D_CREDITS } from '@/lib/types';
import StudioGenerationView from './StudioGenerationView';
import { EditorHeader, EditorPage, Intro, Section, TextArea, Chip, ActionBar, Credits, Ico } from '@/components/editor/kit';

type Step = 'setup' | 'generating' | 'done';

type Set3D = 'yard' | 'body';

// One engine, two sets: the cut-open backyard (3D Build) and the x-ray body (3D Health).
const COPY: Record<Set3D, { format: string; title: string; desc: string; placeholder: string; ideas: string[]; titleFor: (t: string) => string }> = {
  yard: {
    format: '3D Build',
    title: 'What should we build in the yard?',
    desc: 'A yard cut open like a cake. A calm narrator builds an everyday thing step by step: every problem forces the next real fix, all in 3D.',
    placeholder: 'A rainwater cistern, a root cellar, a French drain…',
    // things that build well in a cut-open yard: holes, tanks, pipes, layers, water
    ideas: ['Rainwater cistern', 'French drain', 'Root cellar', 'Compost heap', 'Fire pit', 'Retaining wall', 'Geothermal heat pump', 'Basement'],
    titleFor: t => `How a Hole in Your Yard Becomes a ${t}`,
  },
  body: {
    format: '3D Health',
    title: 'What happens in your body when…',
    desc: 'An x-ray body with glowing organs and a blood vessel cut open. A calm narrator walks through what your body does, step by step, in 3D.',
    placeholder: 'You eat a donut, you drink coffee, you catch a cold…',
    // moments with real, showable steps: organs, blood, cells, molecules
    ideas: ['You eat a donut', 'You drink coffee', 'You catch a cold', 'You hold your breath', 'You cut your finger', 'You get a sunburn', 'You skip a night of sleep', 'You get scared'],
    titleFor: t => `What Happens in Your Body When ${t.replace(/^when\s+/i, '')}`,
  },
};

const FACTS = [
  ['Vertical', '9:16 · 1080p'],
  ['Length', '60–75 s'],
  ['Narrator', 'Calm male voice'],
  ['Captions', 'One word at a time'],
];

export default function Build3D({ onBack, set = 'yard' }: { onBack: () => void; set?: Set3D }) {
  const copy = COPY[set];
  const [step, setStep] = useState<Step>('setup');
  const [topic, setTopic] = useState('');

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
      const r = await fetch(`/api/build3d/${jid}`);
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
      const r = await fetch('/api/build3d', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), set }),
      });
      const d = await r.json();
      if (r.status === 402) { setGenStatus('failed'); setGenErr(d.error || 'Not enough credits.'); return; }
      if (d.job_id) {
        pollRef.current = setInterval(() => pollStatus(d.job_id), 4000);
        pollStatus(d.job_id);
      } else { setGenStatus('failed'); setGenErr(d.error || 'Failed to start'); }
    } catch { setGenStatus('failed'); setGenErr('Failed to start generation'); }
  };

  const shownTitle = title || (topic.trim() ? copy.titleFor(topic.trim()) : copy.format);

  return (
    <div className="flex flex-col min-h-screen text-white">
      <EditorHeader
        format={copy.format}
        onBack={onBack}
        steps={['Setup', 'Render']}
        current={step === 'setup' ? 0 : 1}
        right={<Credits n={BUILD3D_CREDITS} />}
      />

      {step === 'setup' && (
        <>
          <EditorPage>
            <Intro title={copy.title} desc={copy.desc} />

            <Section n={1} title="Topic" hint="Optional. Leave it empty and we pick one.">
              <TextArea big value={topic} onChange={e => setTopic(e.target.value)} rows={2} maxLength={300}
                placeholder={copy.placeholder} />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {copy.ideas.map(i => (
                  <Chip key={i} on={topic.trim().toLowerCase() === i.toLowerCase()} onClick={() => setTopic(i)}>{i}</Chip>
                ))}
              </div>
            </Section>

            <Section n={2} title="What you get">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {FACTS.map(([k, v]) => (
                  <div key={k} className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
                    <div className="text-[11.5px] text-[var(--fg-4)]">{k}</div>
                    <div className="text-[13px] mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[var(--fg-4)] mt-3">Takes about 10 minutes: script, voice, 3D scene, render and sound.</p>
            </Section>
          </EditorPage>

          <ActionBar left={<><Credits n={BUILD3D_CREDITS} /><span className="hidden sm:inline">· deducted when you generate</span></>}>
            <button onClick={startGeneration} className="ui-btn ui-btn-primary">
              Generate{Ico.arrow}
            </button>
          </ActionBar>
        </>
      )}

      {step === 'generating' && (
        <StudioGenerationView
          title={shownTitle}
          modeLabel={copy.format}
          aspect="9:16"
          status={genStatus}
          message={genMsg || 'Writing the script...'}
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
          modeLabel={copy.format}
          aspect="9:16"
          status={genStatus}
          message="Your 3D video is ready"
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
