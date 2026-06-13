'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ── tiny inline icons (thin stroke, Flik-style) ── */
const I = {
  home: (p: any) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>,
  cut: (p: any) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.5 15.5M14.5 14.5 20 20M8.5 8.5 12 12" /></svg>,
  link: (p: any) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>,
  panelL: (p: any) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9 4v16" /></svg>,
  panelR: (p: any) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M15 4v16" /></svg>,
  bell: (p: any) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  search: (p: any) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>,
  newFile: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M12 11v6M9 14h6" /></svg>,
  newFolder: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M12 11v4M10 13h4" /></svg>,
  upload: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>,
  list: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>,
  grid: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  plus: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  clock: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  dots: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>,
  attach: (p: any) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3l7.5-7.5" /></svg>,
  send: (p: any) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
  vid: (p: any) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 9h18M9 6v12" /></svg>,
  img: (p: any) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 3-3 4 4" /></svg>,
  audio: (p: any) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>,
  chevron: (p: any) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="m6 9 6 6 6-6" /></svg>,
};

function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-medium text-[rgba(255,255,255,0.35)]"><span className="text-[rgba(255,255,255,0.25)]">{children}</span></span>;
}

export default function EditorPage() {
  const [dark, setDark] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [msg, setMsg] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#09090b] text-white select-none"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* ─── Top bar ─── */}
      <header className="flex-shrink-0 h-[52px] flex items-center justify-between px-3.5 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center text-[18px] font-bold italic mr-1">/</div>
          <Link href="/dashboard" className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.55)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"><I.home /></Link>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.55)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"><I.cut /></button>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.13)] text-[12.5px] font-medium transition-colors"><I.link />Share</button>
          <div className="flex items-center gap-0.5 ml-1">
            <button onClick={() => setLeftOpen(v => !v)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${leftOpen ? 'text-white bg-[rgba(255,255,255,0.06)]' : 'text-[rgba(255,255,255,0.45)] hover:text-white'}`}><I.panelL /></button>
            <button onClick={() => setRightOpen(v => !v)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${rightOpen ? 'text-white bg-[rgba(255,255,255,0.06)]' : 'text-[rgba(255,255,255,0.45)] hover:text-white'}`}><I.panelR /></button>
          </div>
          <button onClick={() => setDark(v => !v)} className="relative w-[42px] h-[22px] rounded-full bg-[rgba(255,255,255,0.1)] mx-1 transition-colors" title="Theme">
            <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all ${dark ? 'left-[3px]' : 'left-[23px]'}`} />
          </button>
          <span className="h-7 px-3 rounded-full border border-[rgba(255,255,255,0.1)] flex items-center text-[12px] text-[rgba(255,255,255,0.65)]">0 credits</span>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"><I.bell /></button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5b8cff] to-[#9b6cff] ml-0.5" />
        </div>
      </header>

      {/* ─── Body: left | center | right ─── */}
      <div className="flex-1 flex min-h-0">

        {/* Left — files */}
        {leftOpen && (
          <aside className="w-[320px] flex-shrink-0 border-r border-[rgba(255,255,255,0.07)] flex flex-col">
            <div className="px-3.5 pt-3.5 pb-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-1.5 text-[14px] font-semibold hover:text-white text-[rgba(255,255,255,0.92)]">Untitled <I.chevron className="text-[rgba(255,255,255,0.4)]" /></button>
                <div className="flex items-center gap-0.5 text-[rgba(255,255,255,0.45)]">
                  <button className="w-7 h-7 rounded-md flex items-center justify-center hover:text-white hover:bg-[rgba(255,255,255,0.06)]"><I.newFile /></button>
                  <button className="w-7 h-7 rounded-md flex items-center justify-center hover:text-white hover:bg-[rgba(255,255,255,0.06)]"><I.newFolder /></button>
                  <button className="w-7 h-7 rounded-md flex items-center justify-center hover:text-white hover:bg-[rgba(255,255,255,0.06)]"><I.upload /></button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]"><I.search /></span>
                  <input placeholder="Search files" className="w-full h-9 pl-9 pr-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-[13px] outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[rgba(255,255,255,0.3)] transition-colors" />
                </div>
                <div className="flex items-center rounded-lg border border-[rgba(255,255,255,0.07)] overflow-hidden">
                  <button onClick={() => setView('list')} className={`w-8 h-9 flex items-center justify-center ${view === 'list' ? 'text-white bg-[rgba(255,255,255,0.07)]' : 'text-[rgba(255,255,255,0.35)] hover:text-white'}`}><I.list /></button>
                  <button onClick={() => setView('grid')} className={`w-8 h-9 flex items-center justify-center ${view === 'grid' ? 'text-white bg-[rgba(255,255,255,0.07)]' : 'text-[rgba(255,255,255,0.35)] hover:text-white'}`}><I.grid /></button>
                </div>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[13px] text-[rgba(255,255,255,0.28)]">This project is empty</span>
            </div>
          </aside>
        )}

        {/* Center — canvas */}
        <main className="flex-1 relative flex flex-col items-center justify-center min-w-0">
          <div className="w-full max-w-[620px] rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
            <div className="aspect-[16/10] bg-[#101012] relative flex items-center justify-center">
              {/* stylised editor mock */}
              <div className="absolute inset-5 rounded-xl bg-[#161618] border border-[rgba(255,255,255,0.06)] overflow-hidden flex flex-col">
                <div className="h-7 flex items-center gap-1.5 px-3 border-b border-[rgba(255,255,255,0.05)]"><span className="w-2 h-2 rounded-full bg-[#ff5f57]" /><span className="w-2 h-2 rounded-full bg-[#febc2e]" /><span className="w-2 h-2 rounded-full bg-[#28c840]" /></div>
                <div className="flex-1 grid grid-cols-3 gap-1 p-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="rounded-md bg-gradient-to-br from-[#3a2f28] to-[#1a1512]" />)}
                </div>
                <div className="px-3 pb-3 flex flex-col gap-1">
                  <div className="h-3 rounded bg-[rgba(255,255,255,0.06)] flex gap-0.5 p-0.5">{[...Array(6)].map((_, i) => <div key={i} className="flex-1 rounded-sm bg-[#5b8cff]/60" />)}</div>
                  <div className="h-3 rounded bg-[#28c840]/25" />
                </div>
              </div>
            </div>
            <div className="p-5">
              <h2 className="text-[16px] font-semibold mb-1.5">Video editor</h2>
              <p className="text-[13px] text-[rgba(255,255,255,0.45)] leading-relaxed">A full multi-track editor with agentic editing — Animave assembles the cuts, transitions, and timeline for you.</p>
            </div>
          </div>

          {/* floating add-content toolbar */}
          <div className="absolute bottom-12 flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl bg-[#161618] border border-[rgba(255,255,255,0.08)] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"><I.upload /></button>
            <span className="w-px h-5 bg-[rgba(255,255,255,0.08)] mx-0.5" />
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"><I.vid /></button>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"><I.img /></button>
            <button className="w-9 h-9 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"><I.audio /></button>
          </div>

          {/* shortcut hints */}
          <div className="absolute bottom-4 flex items-center gap-4">
            <Kbd>⌘L files</Kbd><Kbd>⌘J editor</Kbd><Kbd>⌘F search</Kbd><Kbd>⌘B chat</Kbd><Kbd>@ mention</Kbd>
          </div>
        </main>

        {/* Right — chat */}
        {rightOpen && (
          <aside className="w-[420px] flex-shrink-0 border-l border-[rgba(255,255,255,0.07)] flex flex-col">
            <div className="h-[52px] flex-shrink-0 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.07)]">
              <span className="text-[14px] font-medium">Chat 1</span>
              <div className="flex items-center gap-0.5 text-[rgba(255,255,255,0.45)]">
                <button className="w-7 h-7 rounded-md flex items-center justify-center hover:text-white hover:bg-[rgba(255,255,255,0.06)]"><I.plus /></button>
                <button className="w-7 h-7 rounded-md flex items-center justify-center hover:text-white hover:bg-[rgba(255,255,255,0.06)]"><I.clock /></button>
                <button className="w-7 h-7 rounded-md flex items-center justify-center hover:text-white hover:bg-[rgba(255,255,255,0.06)]"><I.dots /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                <span className="text-[12.5px] text-[rgba(255,255,255,0.55)]">0 credits remaining</span>
                <button className="flex items-center gap-1 h-7 px-3 rounded-lg bg-white text-black text-[11.5px] font-semibold hover:bg-gray-200 transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" /></svg>
                  Upgrade Now
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 p-3.5 pt-0">
              <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] focus-within:border-[rgba(255,255,255,0.2)] transition-colors">
                <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder="Type your message here…"
                  className="w-full bg-transparent px-3.5 pt-3 text-[13px] outline-none resize-none placeholder:text-[rgba(255,255,255,0.28)] leading-relaxed" />
                <div className="flex items-center justify-between px-2.5 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <button className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-[11.5px] text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.2)]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 8a4 4 0 0 0 0 8M17 8a4 4 0 0 1 0 8" /><circle cx="12" cy="12" r="2.5" /></svg>
                      Agent <I.chevron className="text-[rgba(255,255,255,0.4)]" />
                    </button>
                    <button className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-[11.5px] text-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.2)]">Sonnet 4.6 <I.chevron className="text-[rgba(255,255,255,0.4)]" /></button>
                    <span className="text-[11px] font-bold text-[#ff4d6d] px-1">MAX</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.45)] hover:text-white"><I.attach /></button>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.18)]"><I.send /></button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[rgba(255,255,255,0.35)]">
                <span>Workspace</span><span className="text-[rgba(255,255,255,0.2)]">/</span>
                <span className="flex items-center gap-1 text-[rgba(255,255,255,0.65)]">⌂ Default</span>
                <span className="text-[rgba(255,255,255,0.2)]">·</span>
                <span className="flex items-center gap-1">✂ Video Editor</span>
                <span className="ml-auto text-[rgba(255,255,255,0.25)]">⌘;</span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
