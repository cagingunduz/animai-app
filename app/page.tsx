'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const NAV = ['Product', 'Features', 'Use Cases', 'Pricing'];

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
    <div className="relative min-h-screen flex flex-col overflow-hidden text-[#15171c]"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── vibrant frosted gradient mesh ── */}
      <div className="fixed inset-0 -z-10" style={{
        background: `
          radial-gradient(at 16% 10%, #fff8e3 0px, transparent 42%),
          radial-gradient(at 46% -5%, #ffe1c6 0px, transparent 48%),
          radial-gradient(at 84% 12%, #ff7d9e 0px, transparent 50%),
          radial-gradient(at 98% 42%, #ffb16f 0px, transparent 46%),
          radial-gradient(at 6% 50%, #ffffff 0px, transparent 40%),
          radial-gradient(at 22% 94%, #a6e8e0 0px, transparent 52%),
          radial-gradient(at 58% 104%, #c3d6ff 0px, transparent 52%),
          radial-gradient(at 90% 90%, #e6d2ff 0px, transparent 46%),
          linear-gradient(140deg, #fdf4ea 0%, #f6ecf3 55%, #eaf3f4 100%)
        `,
      }} />

      {/* ── top navigation ── */}
      <header className="relative w-full max-w-[1280px] mx-auto px-6 md:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-[11px] bg-[#15171c] text-white flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" /></svg>
          </span>
          <span className="text-[22px] font-extrabold tracking-[-0.6px]">animave</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-white/25 backdrop-blur-md border border-white/50 rounded-full px-2 py-1.5 shadow-[0_8px_30px_rgba(120,120,140,0.12)]">
          {NAV.map(n => (
            <a key={n} href="#" className="px-4 py-1.5 rounded-full text-[13.5px] text-[#3f4654] hover:text-[#15171c] hover:bg-white/50 transition-colors">{n}</a>
          ))}
        </nav>

        <Link href="/login" className="bg-[#15171c] text-white text-[13.5px] font-medium px-6 py-2.5 rounded-full hover:bg-black transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.14)]">Get Started</Link>
      </header>

      {/* ── hero ── */}
      <main className="relative w-full max-w-[940px] mx-auto px-6 flex-1 flex flex-col items-center justify-center text-center py-4">
        <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur rounded-full pl-2.5 pr-3.5 py-1.5 text-[13px] font-medium shadow-[0_8px_30px_rgba(0,0,0,0.07)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" /></svg>
          Your AI Video Starts Here
        </div>

        <h1 className="mt-4 text-[34px] md:text-[48px] leading-[1.06] font-semibold tracking-[-1.2px] text-[#6b7280]">
          Create Videos Instantly<br />with a <span className="text-[#15171c]">Single Prompt</span>
        </h1>

        <p className="mt-3.5 max-w-[600px] text-[14px] md:text-[15px] leading-relaxed text-[#4a5160]">
          Type your idea, and our AI instantly turns it into a realistic video. Preview in real-time, customize styles, and export with a single click—perfect for creators, marketers, and teams.
        </p>

        {/* prompt box */}
        <div className="mt-6 w-full max-w-[840px] bg-white/80 backdrop-blur-md rounded-[22px] p-4 md:p-5 shadow-[0_24px_70px_rgba(20,30,60,0.12)] border border-white/70 text-left">
          <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) go(); }}
            placeholder="Type your video idea here..."
            className="w-full bg-transparent text-[15px] outline-none resize-none placeholder:text-[#9aa0ab] leading-relaxed pt-1" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button className="w-10 h-10 rounded-full border border-[#e6e8ec] bg-white/60 flex items-center justify-center text-[#5b616e] hover:bg-white transition-colors">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button className="flex items-center gap-2 h-10 px-4 rounded-full border border-[#e6e8ec] bg-white/60 text-[14px] text-[#444b57] hover:bg-white transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3l7.5-7.5" /></svg>
                Attach
              </button>
              <button className="flex items-center gap-2 h-10 px-4 rounded-full border border-[#e6e8ec] bg-white/60 text-[14px] text-[#444b57] hover:bg-white transition-colors">
                Cinematic
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <button className="w-10 h-10 rounded-full border border-[#e6e8ec] bg-white/60 flex items-center justify-center text-[#5b616e] hover:bg-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" /></svg>
              </button>
              <button onClick={go} className="w-11 h-11 rounded-full bg-[#15171c] text-white flex items-center justify-center hover:bg-black transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* suggestion cards */}
        <div className="mt-5 w-full max-w-[840px] grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SUGGESTIONS.map(s => (
            <button key={s.t} onClick={() => router.push(`/create?idea=${encodeURIComponent(s.t)}`)}
              className="bg-white/55 hover:bg-white/85 backdrop-blur border border-white/60 rounded-2xl p-3.5 text-left flex flex-col justify-between h-[88px] shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-colors">
              <span className="text-[12.5px] leading-snug text-[#3a4150]">{s.t}</span>
              <span className="text-[#6b7280]"><s.icon width="18" height="18" /></span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
