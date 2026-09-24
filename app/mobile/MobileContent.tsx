'use client';

import { useState } from 'react';
import Logo from '@/components/Logo';
import FormatArt, { FORMATS } from '@/components/FormatArt';

export default function MobileContent() {
  const [showWarning, setShowWarning] = useState(false);

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px]">
        <div className="absolute inset-0 ui-grid-bg [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute left-1/2 -top-32 -translate-x-1/2 w-[600px] h-[360px] bg-[radial-gradient(ellipse,rgba(255,255,255,0.1),transparent_65%)]" />
      </div>

      <header className="relative flex items-center justify-between px-5 py-4">
        <Logo size={22} />
        <button onClick={() => setShowWarning(true)} className="ui-btn ui-btn-sm ui-btn-primary">Start creating</button>
      </header>

      <main className="relative flex-1 flex flex-col px-5 pt-12 pb-10">
        <div className="ui-rise">
          <span className="inline-flex items-center gap-2 ui-chip ui-chip-muted !h-6 !px-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />AI animation studio
          </span>
          <h1 className="text-[40px] font-semibold tracking-[-0.055em] leading-[0.98] mb-4">
            Ideas in.<br /><span className="text-white/30">Animation out.</span>
          </h1>
          <p className="text-[15px] text-[var(--fg-3)] leading-relaxed max-w-[320px]">
            Script, storyboard, voice and edit — generated end to end from a single prompt.
          </p>
          <button onClick={() => setShowWarning(true)} className="ui-btn ui-btn-primary ui-btn-lg w-full mt-8">
            Start creating
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-12 ui-rise ui-rise-2">
          {FORMATS.slice(0, 4).map(f => (
            <div key={f.key} className="rounded-2xl border border-[var(--line)] overflow-hidden bg-[#0a0a0a]">
              <FormatArt k={f.key} className="aspect-[16/10]" />
              <div className="px-3 py-2.5 border-t border-[var(--line)]">
                <div className="text-[12.5px] font-medium">{f.title}</div>
                <div className="text-[10.5px] text-[var(--fg-4)] truncate">{f.tagline}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Desktop-required sheet */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 px-3 pb-3" onClick={() => setShowWarning(false)}>
          <div className="w-full max-w-sm ui-card !bg-[#0c0c0c] !rounded-[24px] p-6 animate-[ui-rise_.45s_cubic-bezier(.22,1,.36,1)]" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-white/15 mx-auto -mt-2 mb-6" />
            <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center mb-5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] mb-2">Best on desktop</h2>
            <p className="text-[14px] text-[var(--fg-3)] leading-relaxed mb-6">
              The Animave studio is built for larger screens. Open <span className="text-white font-medium">animave.com</span> on your computer to start creating.
            </p>
            <button onClick={() => setShowWarning(false)} className="ui-btn ui-btn-secondary ui-btn-lg w-full">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
