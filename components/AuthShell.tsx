import Logo from '@/components/Logo';
import FormatArt, { FORMATS } from '@/components/FormatArt';

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-[var(--line)]" />
      <span className="ui-eyebrow !text-[10px]">or</span>
      <div className="flex-1 h-px bg-[var(--line)]" />
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between mb-2">
        <span className="text-[12.5px] font-medium text-[var(--fg-2)]">{label}</span>
        {hint}
      </span>
      {children}
    </label>
  );
}

/* Right-hand showcase: a live "render queue" storyboard in pure monochrome. */
function Showcase() {
  const shots = FORMATS.slice(0, 4);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-[var(--line)] bg-[#050505]">
      <div className="absolute inset-0 ui-grid-bg ui-fade-mask" />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[420px] bg-[radial-gradient(ellipse,rgba(255,255,255,0.1),transparent_65%)]" />

      <div className="relative h-full flex flex-col p-10 xl:p-14">
        <div className="flex items-center justify-between">
          <span className="ui-eyebrow">Animave Studio</span>
          <span className="flex items-center gap-2 ui-eyebrow">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-[ui-blink_1.4s_ease-in-out_infinite]" />Rendering
          </span>
        </div>

        <div className="my-auto py-10">
          <h2 className="text-[44px] xl:text-[56px] font-semibold tracking-[-0.055em] leading-[0.98] mb-5">
            Ideas in.<br /><span className="text-white/30">Animation out.</span>
          </h2>
          <p className="text-[15px] text-[var(--fg-3)] max-w-[400px] leading-relaxed">
            Script, storyboard, voice and edit — generated end to end from a single prompt.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {shots.map((f, i) => (
            <div key={f.key} className="group rounded-2xl border border-[var(--line)] bg-black/60 backdrop-blur overflow-hidden">
              <div className="relative">
                <FormatArt k={f.key} className="aspect-[16/9]" />
                <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/10 overflow-hidden">
                  <div className="h-full w-1/4 bg-white animate-[ui-scan_2.6s_linear_infinite]" style={{ animationDelay: `${i * 0.6}s` }} />
                </div>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-[12px] font-medium">{f.title}</span>
                <span className="ui-mono text-[10px] text-[var(--fg-4)]">SC {String(i + 1).padStart(2, '0')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black grid lg:grid-cols-[minmax(440px,1fr)_1.15fr]">
      <div className="relative flex flex-col px-6 sm:px-12 py-8">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.04),transparent_60%)]" />
        <div className="relative"><Logo size={24} /></div>
        <div className="relative flex-1 flex items-center justify-center py-12">
          <div className="w-full max-w-[380px] ui-rise">{children}</div>
        </div>
        {footer && <div className="relative text-[12px] text-[var(--fg-4)]">{footer}</div>}
      </div>
      <div className="hidden lg:block p-3">
        <Showcase />
      </div>
    </div>
  );
}
