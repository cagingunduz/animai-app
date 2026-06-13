'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const NAV = ['Home', 'Features', 'Pricing', 'Animation', 'Resources'];

const SUGGESTIONS = [
  { t: 'Make A cartoon video for school kids', icon: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M9 15c.8.7 1.9 1 3 1s2.2-.3 3-1" strokeLinecap="round" /></svg> },
  { t: 'Make A promotional video for business', icon: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></svg> },
  { t: 'Generate an office presentation video', icon: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18" strokeLinecap="round" /><path d="M7 14l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { t: 'Make A course lesson video for tech', icon: (p: any) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 0 2 2h13" /></svg> },
];

export default function LandingPage() {
  const router = useRouter();
  const [idea, setIdea] = useState('');

  const go = () => router.push(idea.trim() ? `/create?idea=${encodeURIComponent(idea.trim())}` : '/create');

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eceef1] text-[#15171c]"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── soft pastel claymorphism background ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 top-0 w-[820px] h-[820px] rounded-full blur-[90px]" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(168,210,255,0.55), transparent 62%)' }} />
        <div className="absolute left-[28%] top-[38%] w-[680px] h-[560px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(255,198,219,0.42), transparent 62%)' }} />
        <div className="absolute -right-40 top-[12%] w-[900px] h-[720px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(214,226,255,0.55), transparent 65%)' }} />
        <div className="absolute right-[6%] bottom-[-10%] w-[640px] h-[520px] rounded-full blur-[110px]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent 60%)' }} />
      </div>

      {/* ── header ── */}
      <header className="relative max-w-[1240px] mx-auto px-6 md:px-10 py-7 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-[#15171c] text-white flex items-center justify-center">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" /></svg>
          </span>
          <span className="text-[24px] font-semibold tracking-[-0.5px]">animave</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 bg-white/70 backdrop-blur rounded-full p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white">
          {NAV.map((n, i) => (
            <a key={n} href="#"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[14px] transition-colors ${i === 0 ? 'bg-[#15171c] text-white font-medium' : 'text-[#5b616e] hover:text-[#15171c]'}`}>
              {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-white" />}{n}
            </a>
          ))}
        </nav>

        <Link href="/login" className="bg-[#15171c] text-white text-[14px] font-medium px-6 py-3 rounded-full hover:bg-black transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.12)]">Try Demo</Link>
      </header>

      {/* ── hero ── */}
      <main className="relative max-w-[1000px] mx-auto px-6 pt-10 md:pt-16 pb-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-white rounded-full pl-3 pr-4 py-2 text-[14px] font-medium shadow-[0_8px_30px_rgba(0,0,0,0.07)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" /></svg>
          Your AI Video Starts Here
        </div>

        <h1 className="mt-7 text-[44px] md:text-[64px] leading-[1.05] font-semibold tracking-[-1.5px] text-[#6b7280]">
          Create Videos Instantly<br />with a <span className="text-[#15171c]">Single Prompt</span>
        </h1>

        <p className="mt-6 max-w-[640px] text-[15.5px] md:text-[16px] leading-relaxed text-[#5b616e]">
          Type your idea, and our AI instantly turns it into a realistic video. Preview in real-time, customize styles, and export with a single click—perfect for creators, marketers, and teams.
        </p>

        {/* prompt box */}
        <div className="mt-9 w-full max-w-[920px] bg-white rounded-[26px] p-5 md:p-6 shadow-[0_24px_70px_rgba(20,30,60,0.10)] border border-white text-left">
          <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) go(); }}
            placeholder="Type your video idea here..."
            className="w-full bg-transparent text-[16px] outline-none resize-none placeholder:text-[#9aa0ab] leading-relaxed" />
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button className="w-10 h-10 rounded-full border border-[#e6e8ec] flex items-center justify-center text-[#5b616e] hover:bg-[#f5f6f8] transition-colors">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button className="flex items-center gap-2 h-10 px-4 rounded-full border border-[#e6e8ec] text-[14px] text-[#444b57] hover:bg-[#f5f6f8] transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3l7.5-7.5" /></svg>
                Attach
              </button>
              <button className="flex items-center gap-2 h-10 px-4 rounded-full border border-[#e6e8ec] text-[14px] text-[#444b57] hover:bg-[#f5f6f8] transition-colors">
                Cinematic
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <button className="w-10 h-10 rounded-full border border-[#e6e8ec] flex items-center justify-center text-[#5b616e] hover:bg-[#f5f6f8] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" /></svg>
              </button>
              <button onClick={go} className="w-11 h-11 rounded-full bg-[#15171c] text-white flex items-center justify-center hover:bg-black transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* suggestion cards */}
        <div className="mt-7 w-full max-w-[920px] grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {SUGGESTIONS.map(s => (
            <button key={s.t} onClick={() => router.push(`/create?idea=${encodeURIComponent(s.t)}`)}
              className="bg-white/70 hover:bg-white border border-white rounded-2xl p-4 text-left flex flex-col justify-between h-[112px] shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors">
              <span className="text-[13.5px] leading-snug text-[#3a4150]">{s.t}</span>
              <span className="text-[#7a818d]"><s.icon width="20" height="20" /></span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
