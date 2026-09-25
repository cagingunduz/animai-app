'use client';

import { useState } from 'react';
import Logo from '@/components/Logo';
import { FORMATS, FormatIcon } from '@/components/FormatArt';

export default function MobileContent() {
  const [showWarning, setShowWarning] = useState(false);

  return (
    <div className="min-h-screen bg-black text-[var(--fg)] flex flex-col">
      <header className="flex items-center justify-between px-5 h-14 border-b border-[var(--line)]">
        <Logo size={20} />
        <button onClick={() => setShowWarning(true)} className="ui-btn ui-btn-sm ui-btn-primary">Start creating</button>
      </header>

      <main className="flex-1 px-5 pt-10 pb-10">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] leading-tight mb-2">Turn ideas into animated videos</h1>
        <p className="text-[14px] text-[var(--fg-3)] leading-relaxed mb-6">
          Script, storyboard, voice and edit, generated end to end from a single prompt.
        </p>
        <button onClick={() => setShowWarning(true)} className="ui-btn ui-btn-primary ui-btn-lg w-full mb-10">Start creating</button>

        <div className="text-[12px] text-[var(--fg-4)] mb-2">Formats</div>
        <div className="rounded-[10px] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden">
          {FORMATS.map(f => (
            <div key={f.key} className="flex items-center gap-3 px-3.5 py-3">
              <span className="text-[var(--fg-3)]"><FormatIcon k={f.key} /></span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium">{f.title}</div>
                <div className="text-[12px] text-[var(--fg-4)] truncate">{f.tagline}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showWarning && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-3" onClick={() => setShowWarning(false)}>
          <div className="w-full max-w-sm rounded-xl bg-[var(--surface)] border border-[var(--line-2)] p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold mb-1.5">Best on desktop</h2>
            <p className="text-[13px] text-[var(--fg-3)] leading-relaxed mb-5">
              The Animave studio is built for larger screens. Open <span className="text-[var(--fg)]">animave.com</span> on your computer to start creating.
            </p>
            <button onClick={() => setShowWarning(false)} className="ui-btn ui-btn-secondary ui-btn-lg w-full">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
