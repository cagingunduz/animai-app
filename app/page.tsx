import Link from 'next/link';

const NAV = ['Home', 'Features', 'Showcase', 'Pricing'];
const PURPLE = '#7c3aed';

/* floating profile card */
function Profile({ label, grad, className }: { label: string; grad: string; className: string }) {
  return (
    <div className={`absolute w-[150px] rounded-2xl bg-white p-2 shadow-[0_18px_50px_rgba(60,40,120,0.14)] ${className}`}>
      <div className="h-[150px] rounded-xl mb-2" style={{ background: grad }} />
      <p className="text-[11px] text-[#6b6f78] px-1 pb-1">{label}</p>
    </div>
  );
}

/* feature badge with thin purple arrow */
function Badge({ text, side, className }: { text: string; side: 'l' | 'r'; className: string }) {
  return (
    <div className={`absolute flex items-center gap-2 ${className}`}>
      {side === 'r' && (
        <svg width="46" height="20" viewBox="0 0 46 20" fill="none" stroke={PURPLE} strokeWidth="1.5"><path d="M1 4c14 8 28 8 42 6" strokeLinecap="round" /><path d="M39 12l5-2-3-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
      <span className="bg-white rounded-full px-4 py-2 text-[13px] font-medium text-[#15171c] shadow-[0_10px_30px_rgba(60,40,120,0.12)] whitespace-nowrap">{text}</span>
      {side === 'l' && (
        <svg width="46" height="20" viewBox="0 0 46 20" fill="none" stroke={PURPLE} strokeWidth="1.5"><path d="M45 4C31 12 17 12 3 10" strokeLinecap="round" /><path d="M7 12l-5-2 3-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f5f5f6] text-[#15171c]"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* ── floating pill nav ── */}
      <header className="relative z-20 max-w-[1000px] mx-auto px-5 pt-6">
        <div className="flex items-center justify-between bg-white rounded-full pl-6 pr-2 py-2 shadow-[0_12px_40px_rgba(60,40,120,0.10)] border border-[rgba(124,58,237,0.08)]">
          <Link href="/" className="text-[20px] font-extrabold tracking-[-0.5px]"><span className="text-[#15171c]">A</span><span style={{ color: PURPLE }}>nimave</span></Link>
          <nav className="hidden md:flex items-center gap-7">
            {NAV.map(n => <a key={n} href="#" className="text-[14px] text-[#4a4f59] hover:text-[#15171c] transition-colors">{n}</a>)}
          </nav>
          <Link href="/login" className="bg-[#15171c] text-white text-[14px] font-medium px-5 py-2.5 rounded-full hover:bg-black transition-colors" style={{ boxShadow: `0 0 0 1.5px rgba(124,58,237,0.5), 0 8px 24px rgba(124,58,237,0.25)` }}>Start Creating</Link>
        </div>
      </header>

      {/* ── hero text ── */}
      <section className="relative z-10 max-w-[820px] mx-auto px-5 text-center pt-12">
        <div className="inline-flex items-center gap-3 bg-white rounded-full pl-2 pr-4 py-1.5 shadow-[0_8px_30px_rgba(60,40,120,0.08)]">
          <div className="flex -space-x-2">
            {['#c4b5fd', '#a78bfa', '#8b5cf6'].map((c, i) => <span key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: c }} />)}
          </div>
          <span className="text-[13px] font-medium text-[#3f4654]">+2.5K Creators</span>
          <span className="w-px h-4 bg-[#e6e8ec]" />
          <span className="text-[13px] text-[#f5b301]">★★★★★</span>
        </div>

        <h1 className="mt-7 text-[40px] md:text-[56px] leading-[1.08] font-bold tracking-[-1.5px]">
          Bring Your Stories to Life<br />with AI Animation
        </h1>
        <p className="mt-5 max-w-[560px] mx-auto text-[15px] md:text-[16px] leading-relaxed text-[#7a818d]">
          Generate talking characters, whiteboard animations, and dynamic movements from a single prompt with our advanced image-to-video engine.
        </p>
        <Link href="/login" className="inline-block mt-8 bg-[#15171c] text-white text-[15px] font-semibold px-8 py-3.5 rounded-2xl hover:bg-black transition-colors" style={{ boxShadow: `0 0 0 1.5px rgba(124,58,237,0.5), 0 12px 34px rgba(124,58,237,0.28)` }}>Start Animating</Link>
      </section>

      {/* ── phone + floating elements ── */}
      <section className="relative max-w-[1240px] mx-auto px-5 mt-4 h-[640px]">
        {/* purple ambient glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[120px] -z-0" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 65%)' }} />

        {/* phone */}
        <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[300px] h-[610px] rounded-[44px] bg-[#0c0c10] p-2.5 shadow-[0_40px_100px_rgba(60,40,120,0.35)] z-10">
          <div className="relative w-full h-full rounded-[36px] overflow-hidden" style={{ background: 'linear-gradient(165deg, #efe6c8 0%, #b06be0 38%, #7c2bd6 60%, #b3162e 100%)' }}>
            <div className="absolute top-0 inset-x-0 h-9 flex items-center justify-between px-6 text-white text-[12px] font-medium z-10">
              <span>9:41</span>
              <div className="flex items-center gap-1.5"><span>▦</span><span>▾</span><span>▮</span></div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-24 h-5 rounded-full bg-black/80" />
            {/* abstract motion streaks */}
            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(115deg, transparent 0 7px, rgba(255,255,255,0.06) 7px 8px)' }} />
            <div className="absolute bottom-14 inset-x-0 text-center text-white font-extrabold text-[26px] tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">AI ANIMATION</div>
          </div>
        </div>

        {/* profile cards */}
        <Profile label="Content Creator" grad="linear-gradient(160deg,#5b8cff,#8b5cf6)" className="hidden lg:block left-[2%] top-[40px]" />
        <Profile label="Animator" grad="linear-gradient(160deg,#a78bfa,#7c3aed)" className="hidden md:block left-[15%] top-[6px]" />
        <Profile label="Content Creator" grad="linear-gradient(160deg,#c084fc,#9333ea)" className="hidden md:block right-[15%] top-[330px]" />
        <Profile label="Animator" grad="linear-gradient(160deg,#818cf8,#a855f7)" className="hidden lg:block right-[2%] top-[360px]" />

        {/* feature badges */}
        <Badge text="Talking Characters" side="r" className="hidden md:flex left-[10%] top-[150px]" />
        <Badge text="Whiteboard Style" side="r" className="hidden md:flex left-[8%] top-[470px]" />
        <Badge text="Image-to-Video Motor" side="l" className="hidden md:flex right-[8%] top-[90px]" />
        <Badge text="Storytelling Tools" side="l" className="hidden md:flex right-[10%] top-[250px]" />
      </section>
    </div>
  );
}
