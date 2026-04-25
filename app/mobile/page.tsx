export default function MobilePage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" className="mb-7">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4" stroke="rgba(255,255,255,0.2)"/>
      </svg>

      <h1 className="text-[20px] font-semibold tracking-[-0.5px] text-white mb-3">
        Desktop only
      </h1>
      <p className="text-[14px] text-[rgba(255,255,255,0.4)] leading-relaxed max-w-[280px]">
        AnimAI requires a desktop browser. Please open{' '}
        <span className="text-[rgba(255,255,255,0.65)]">animave.com</span>{' '}
        on your computer to continue.
      </p>

      <div className="mt-10 flex items-center gap-2 text-[11px] text-[rgba(255,255,255,0.2)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="12,2 22,20 2,20"/>
          <line x1="12" y1="8" x2="12" y2="15"/>
          <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
        </svg>
        AnimAI
      </div>
    </div>
  );
}
