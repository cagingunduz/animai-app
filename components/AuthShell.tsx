import Logo from '@/components/Logo';

export function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[var(--line)]" />
      <span className="text-[12px] text-[var(--fg-4)]">or</span>
      <div className="flex-1 h-px bg-[var(--line)]" />
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-[var(--fg-2)]">{label}</span>
        {hint}
      </span>
      {children}
    </label>
  );
}

// The reel wall on the right: three columns of the formats' preview loops drifting up and down at different speeds.
const COLS = [
  { dir: 'reelUp', dur: 46, clips: ['premium', 'scifi_toon', 'caption_news'] },
  { dir: 'reelDown', dur: 58, clips: ['paper_lantern', 'survival', 'whiteboard'] },
  { dir: 'reelUp', dur: 52, clips: ['teardown', 'explainer', 'telestrator'] },
];

function ReelWall() {
  return (
    <div className="relative h-full overflow-hidden rounded-[28px] bg-[#0b0b10]">
      <div className="absolute inset-0 opacity-90" style={{ background: 'radial-gradient(70% 55% at 20% 15%, rgba(110,96,255,.45), transparent 70%), radial-gradient(60% 50% at 85% 85%, rgba(255,120,190,.30), transparent 70%)' }} />
      <div className="absolute inset-0 grid grid-cols-3 gap-4 px-5 -rotate-[6deg] scale-[1.08] origin-center">
        {COLS.map((c, i) => (
          <div key={i} className="reel-col flex flex-col gap-4" style={{ animation: `${c.dir} ${c.dur}s linear infinite` }}>
            {[...c.clips, ...c.clips].map((k, j) => (
              <div key={j} className="relative w-full rounded-[18px] overflow-hidden bg-black/40 shadow-[0_30px_60px_-25px_rgba(0,0,0,.8)] ring-1 ring-white/10" style={{ paddingTop: '177.78%' }}>
                <video src={`/create/formats/${k}.mp4`} poster={`/create/formats/${k}.jpg`} muted loop autoPlay playsInline preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30 pointer-events-none" />
      <div className="absolute left-8 right-8 bottom-8 text-white">
        <div className="text-[12px] text-white/60 mb-2">Animave · reels studio</div>
        <div className="text-[30px] leading-[1.1] font-semibold tracking-[-0.03em]">Fourteen formats.<br /><span className="text-white/55">One sentence each.</span></div>
      </div>
    </div>
  );
}

export default function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="auth-light min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="flex flex-col px-6 sm:px-10">
        <div className="pt-8"><Logo size={22} color="#0a0a0a" /></div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-[360px]">{children}</div>
        </div>
        {footer && <div className="pb-8 text-[12px] text-[var(--fg-4)]">{footer}</div>}
      </div>
      <div className="hidden lg:block p-4 h-screen sticky top-0"><ReelWall /></div>
    </div>
  );
}
