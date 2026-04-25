'use client';

import { useState } from 'react';

export default function MobileContent() {
  const [showWarning, setShowWarning] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navbar */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <polygon points="12,2 22,20 2,20"/>
            <line x1="12" y1="8" x2="12" y2="15"/>
            <circle cx="12" cy="17" r="0.5" fill="white"/>
          </svg>
          <span className="text-[15px] font-semibold tracking-[-0.3px]">AnimAI</span>
        </div>
        <button
          onClick={() => setShowWarning(true)}
          className="px-3.5 py-2 bg-white text-black text-[12px] font-semibold rounded-lg"
        >
          Start Creating
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-16">
        <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <polygon points="9,7 16,10.5 9,14" fill="rgba(255,255,255,0.15)" stroke="none"/>
          </svg>
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.8px] leading-tight mb-3">
          Turn ideas into<br/>animations
        </h1>
        <p className="text-[14px] text-[rgba(255,255,255,0.4)] leading-relaxed max-w-[260px]">
          AI-powered storytelling with voiceover, cinematic scenes and automatic editing.
        </p>
        <button
          onClick={() => setShowWarning(true)}
          className="mt-8 px-6 py-3 bg-white text-black text-[14px] font-semibold rounded-xl"
        >
          Start Creating →
        </button>
        <div className="flex flex-wrap gap-2 justify-center mt-8">
          {['AI Voiceover', 'Ken Burns', 'Auto Export', 'Story Scripts'].map(f => (
            <span key={f} className="text-[11px] text-[rgba(255,255,255,0.35)] border border-[rgba(255,255,255,0.08)] rounded-full px-3 py-1">
              {f}
            </span>
          ))}
        </div>
      </main>

      {/* Warning bottom sheet */}
      {showWarning && (
        <div
          className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 px-4 pb-8"
          onClick={() => setShowWarning(false)}
        >
          <div
            className="w-full max-w-sm bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <h2 className="text-[16px] font-semibold mb-2">Desktop required</h2>
            <p className="text-[13px] text-[rgba(255,255,255,0.4)] leading-relaxed mb-5">
              AnimAI is built for desktop. Open{' '}
              <span className="text-[rgba(255,255,255,0.7)]">animave.com</span>{' '}
              on your computer to start creating.
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full py-2.5 bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.6)] text-[13px] rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
