import { LogoMark } from '@/components/Logo';

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
      <div className="flex-1 h-px bg-black/10" />
      <span className="text-[12px] text-black/40">or</span>
      <div className="flex-1 h-px bg-black/10" />
    </div>
  );
}

// a bold label over a white rounded field with an icon on the left
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-2.5">
        <span className="text-[15px] font-semibold text-black">{label}</span>
        {hint}
      </span>
      {children}
    </label>
  );
}

const ICONS = {
  mail: <path d="M4 6.5h16v11H4zM4.5 7l7.5 6 7.5-6" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 7.6-1.7" /><path d="M12 15v2" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5" /></>,
};
export function AuthInput({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: keyof typeof ICONS }) {
  return (
    <span className="flex items-center gap-3 h-[56px] px-4 rounded-[14px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-transparent focus-within:border-black/25 transition-colors">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">{ICONS[icon]}</svg>
      <input {...props} className="flex-1 min-w-0 h-full bg-transparent outline-none text-[15px] text-black placeholder:text-black/35" />
    </span>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
      <span className="w-[18px] h-[18px] rounded-[3px] border-[1.5px] border-black/80 flex items-center justify-center peer-checked:bg-black peer-focus-visible:ring-2 peer-focus-visible:ring-black/30">
        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
      </span>
      <span className="text-[15px] font-semibold text-black">{label}</span>
    </label>
  );
}

export function AuthButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="w-full h-[56px] rounded-[12px] bg-[#1b1b1b] hover:bg-black text-white text-[16px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
      {children}
    </button>
  );
}

// the round social sign-in buttons (Google is the provider we have)
export function SocialRow({ onGoogle }: { onGoogle: () => void }) {
  return (
    <div className="flex gap-6 mt-12">
      <button type="button" onClick={onGoogle} aria-label="Continue with Google" title="Continue with Google"
        className="w-[88px] h-[88px] rounded-full bg-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,.04)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,.18)] transition-shadow">
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </button>
    </div>
  );
}

export function AuthNote({ tone = 'error', children }: { tone?: 'error' | 'ok'; children: React.ReactNode }) {
  return <p className={`text-[13.5px] px-4 py-3 rounded-[12px] ${tone === 'error' ? 'text-[#b42318] bg-[#fef3f2]' : 'text-[#05603a] bg-[#ecfdf3]'}`}>{children}</p>;
}

// The reel wall on the right: three columns of the formats' preview loops drifting up and down at different speeds.
const COLS = [
  { dir: 'reelUp', dur: 46, clips: ['premium', 'scifi_toon', 'caption_news'] },
  { dir: 'reelDown', dur: 58, clips: ['paper_lantern', 'survival', 'whiteboard'] },
  { dir: 'reelUp', dur: 52, clips: ['teardown', 'explainer', 'telestrator'] },
];

function ReelWall() {
  return (
    <div className="relative h-full overflow-hidden rounded-[36px] bg-[#0b0b10]">
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.35)_0%,rgba(0,0,0,.45)_35%,rgba(0,0,0,.86)_55%,rgba(0,0,0,.94)_100%)] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14 text-white">
        <div className="text-[17px] font-semibold tracking-[-0.02em] mb-6">Animave</div>
        <h2 className="text-[40px] leading-[1.05] font-bold tracking-[-0.03em]">Welcome to Animave</h2>
        <p className="text-[14.5px] text-white/75 leading-relaxed mt-4 max-w-[520px]">Animave turns one sentence into a finished vertical reel: written, voiced, animated frame by frame and mixed, ready for Shorts, Reels and TikTok.</p>
        <div className="mt-10 rounded-[28px] bg-white/[0.12] backdrop-blur-xl border border-white/15 p-8 max-w-[560px]">
          <div className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em]">Make your first reel<br />in a few minutes</div>
          <div className="mt-5 flex items-end justify-between gap-6">
            <p className="text-[15px] text-white/75 leading-relaxed max-w-[300px]">Start with 500 free credits. Fourteen formats, one sentence each.</p>
            <div className="flex -space-x-3 flex-shrink-0">
              {['premium', 'scifi_toon', 'paper_lantern'].map(k => (
                <img key={k} src={`/create/formats/${k}.jpg`} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-[#2a2a2e]" />
              ))}
              <span className="w-11 h-11 rounded-full bg-[#2a2a2e] ring-2 ring-[#2a2a2e] text-[12px] flex items-center justify-center">+11</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthShell({ children, title, footer }: { children: React.ReactNode; title?: string; footer?: React.ReactNode }) {
  return (
    <div className="auth-light min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] !bg-[#f3f3f3]">
      <div className="flex flex-col px-6 sm:px-14">
        <div className="flex-1 flex items-center justify-center py-14">
          <div className="w-full max-w-[480px]">
            <div className="inline-flex flex-col items-start gap-1.5 mb-12">
              <LogoMark size={52} color="#0a0a0a" />
              <span className="text-[24px] font-semibold tracking-[-0.03em] text-black">Animave</span>
            </div>
            {title && <h1 className="text-[42px] font-bold tracking-[-0.03em] text-black mb-10 leading-none">{title}</h1>}
            {children}
          </div>
        </div>
        {footer && <div className="pb-8 text-[12px] text-black/40">{footer}</div>}
      </div>
      <div className="hidden lg:block p-4 h-screen sticky top-0"><ReelWall /></div>
    </div>
  );
}
