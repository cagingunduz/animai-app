import Link from 'next/link';

const NAV = ['Product', 'Features', 'Use Cases', 'Pricing'];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-[#15171c]"
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
      <header className="relative max-w-[1280px] mx-auto px-6 md:px-8 py-5 flex items-center justify-between">
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

      {/* body intentionally empty */}
    </div>
  );
}
