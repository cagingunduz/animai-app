'use client';

// Shared building blocks for every format editor (Storytelling, 2D, Animated Story,
// Whiteboard, Fruit Drama). Pure presentation — editors keep their own state and logic.

import { type MouseEvent as ReactMouseEvent, type ReactNode, useState } from 'react';

/* ─────────────────────────── Icons ─────────────────────────── */

export const Ico = {
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  check: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>,
  bolt: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>,
  play: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>,
  pause: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>,
  stop: <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>,
  rewind: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11 6v12l-8.5-6zM21 6v12l-8.5-6z" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  x: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  chevron: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>,
  clock: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  sparkle: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" /></svg>,
  image: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m21 16-5-5-9 9" /></svg>,
  user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" /></svg>,
  film: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></svg>,
  send: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
  grip: <svg width="8" height="14" viewBox="0 0 10 16" fill="currentColor"><circle cx="3" cy="3" r="1.3" /><circle cx="7" cy="3" r="1.3" /><circle cx="3" cy="8" r="1.3" /><circle cx="7" cy="8" r="1.3" /><circle cx="3" cy="13" r="1.3" /><circle cx="7" cy="13" r="1.3" /></svg>,
  camera: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 10 5-3v10l-5-3" /><rect x="3" y="6" width="12" height="12" rx="2" /></svg>,
  mic: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>,
  captions: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M7 15h4M13 15h4M7 11h2M11 11h6" /></svg>,
};

export function AspectGlyph({ a }: { a: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      {a === '9:16' ? <rect x="6.5" y="2.5" width="7" height="15" rx="1.5" />
        : a === '16:9' ? <rect x="2.5" y="6.5" width="15" height="7" rx="1.5" />
        : <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" />}
    </svg>
  );
}

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <span className={`inline-block rounded-full border-2 border-white/10 border-t-white animate-spin ${className}`} style={{ width: size, height: size }} />;
}

/* ─────────────────────────── Shell ─────────────────────────── */

export function Stepper({ steps, current, onStep }: { steps: string[]; current: number; onStep?: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = !!onStep && i < current;
        return (
          <div key={label} className="flex items-center gap-1.5">
            <button type="button" disabled={!clickable} onClick={() => onStep?.(i)}
              className={`flex items-center gap-2 h-8 pl-1 pr-3 rounded-full transition-colors ${active ? 'bg-white/[0.07]' : ''} ${clickable ? 'hover:bg-white/[0.05] cursor-pointer' : 'cursor-default'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-semibold ui-mono transition-all duration-300
                ${active ? 'bg-white text-black shadow-[0_0_0_4px_rgba(255,255,255,0.08)]' : done ? 'bg-white/90 text-black' : 'border border-[var(--line-2)] text-[var(--fg-4)]'}`}>
                {done ? Ico.check : i + 1}
              </span>
              <span className={`text-[12.5px] hidden sm:inline ${active ? 'text-white font-medium' : done ? 'text-[var(--fg-2)]' : 'text-[var(--fg-4)]'}`}>{label}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="relative w-6 lg:w-10 h-px bg-[var(--line-2)] overflow-hidden">
                <span className={`absolute inset-y-0 left-0 bg-white/70 transition-all duration-500 ${done ? 'w-full' : 'w-0'}`} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EditorHeader({ format, onBack, steps, current, onStep, right, meta }: {
  format: string; onBack: () => void; steps?: string[]; current?: number; onStep?: (i: number) => void; right?: ReactNode; meta?: ReactNode;
}) {
  return (
    <header className="flex-shrink-0 sticky top-0 z-30 h-[60px] bg-black/80 backdrop-blur-xl border-b border-[var(--line)]">
      <div className="h-full px-4 md:px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} aria-label="Back"
            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[var(--fg-3)] hover:text-white hover:bg-white/[0.06] border border-[var(--line)] transition-colors flex-shrink-0">
            {Ico.back}
          </button>
          <div className="min-w-0">
            <div className="ui-eyebrow !text-[9.5px] leading-none mb-1">Create</div>
            <div className="text-[13.5px] font-semibold tracking-[-0.02em] truncate leading-none">{format}</div>
          </div>
          {meta && <div className="hidden lg:flex items-center gap-2 ml-2">{meta}</div>}
        </div>
        <div className="justify-self-center">
          {steps && steps.length > 1 && <Stepper steps={steps} current={current ?? 0} onStep={onStep} />}
        </div>
        <div className="justify-self-end flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

export function EditorPage({ children, width = 820 }: { children: ReactNode; width?: number }) {
  return (
    <div className="relative flex-1 overflow-y-auto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] ui-grid-bg [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-70" />
      <div className="relative mx-auto px-5 md:px-8 pt-10 pb-36 ui-rise" style={{ maxWidth: width }}>{children}</div>
    </div>
  );
}

export function Intro({ eyebrow, title, desc, right }: { eyebrow?: string; title: string; desc?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-10">
      <div>
        {eyebrow && <div className="ui-eyebrow mb-3">{eyebrow}</div>}
        <h1 className="text-[30px] md:text-[34px] font-semibold tracking-[-0.045em] leading-[1.05]">{title}</h1>
        {desc && <p className="text-[14px] text-[var(--fg-3)] mt-2 max-w-[560px] leading-relaxed">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function Section({ n, title, hint, right, children, className = '' }: {
  n?: number; title: string; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`mb-10 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        {n !== undefined && <span className="ui-mono text-[11px] text-[var(--fg-4)]">{String(n).padStart(2, '0')}</span>}
        <h2 className="text-[14px] font-medium">{title}</h2>
        {hint && <span className="text-[12px] text-[var(--fg-4)] hidden sm:inline">{hint}</span>}
        <div className="flex-1 h-px bg-[var(--line)]" />
        {right}
      </div>
      {children}
    </section>
  );
}

export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span className="text-[12px] font-medium text-[var(--fg-2)]">{children}</span>
      {right}
    </div>
  );
}

/* ─────────────────────────── Controls ─────────────────────────── */

export interface SegOption<T> { value: T; label: ReactNode; sub?: ReactNode; icon?: ReactNode; disabled?: boolean; title?: string }

export function Segmented<T extends string | number>({ options, value, onChange, full = false, size = 'md' }: {
  options: SegOption<T>[]; value: T; onChange: (v: T) => void; full?: boolean; size?: 'sm' | 'md';
}) {
  return (
    <div className={`${full ? 'flex w-full' : 'inline-flex'} p-[3px] gap-[2px] rounded-[12px] bg-white/[0.03] border border-[var(--line)]`}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)} disabled={o.disabled} title={o.title}
            className={`${full ? 'flex-1' : ''} ${size === 'sm' ? 'min-h-[28px] px-2.5 text-[11.5px]' : 'min-h-[34px] px-3.5 text-[12.5px]'} rounded-[9px] font-medium flex flex-col items-center justify-center leading-tight transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed
              ${on ? 'bg-white text-black shadow-[0_1px_10px_rgba(255,255,255,0.14)]' : 'text-[var(--fg-3)] hover:text-white hover:bg-white/[0.04]'}`}>
            <span className="flex items-center gap-1.5 whitespace-nowrap">{o.icon}{o.label}</span>
            {o.sub !== undefined && <span className={`ui-mono text-[9.5px] mt-0.5 ${on ? 'text-black/45' : 'text-[var(--fg-4)]'}`}>{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-9 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${on ? 'bg-white' : 'bg-white/[0.1] border border-[var(--line-2)]'}`}>
      <span className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all duration-200 ${on ? 'left-[18px] bg-black' : 'left-[2px] bg-white/50'}`} />
    </button>
  );
}

export function ToggleRow({ on, onChange, label, desc, icon }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string; icon?: ReactNode }) {
  return (
    <div onClick={() => onChange(!on)}
      className={`flex items-center gap-3 px-4 h-[58px] rounded-[14px] border cursor-pointer transition-all ${on ? 'border-[var(--line-3)] bg-white/[0.04]' : 'border-[var(--line)] hover:border-[var(--line-2)]'}`}>
      {icon && <span className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 ${on ? 'bg-white text-black' : 'bg-white/[0.05] text-[var(--fg-3)]'}`}>{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        {desc && <div className="text-[11.5px] text-[var(--fg-4)] truncate">{desc}</div>}
      </div>
      <span onClick={e => e.stopPropagation()}><Toggle on={on} onChange={onChange} label={label} /></span>
    </div>
  );
}

export function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12px] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${on ? 'border-white bg-white text-black font-medium' : 'border-[var(--line-2)] text-[var(--fg-3)] hover:text-white hover:border-[var(--line-3)]'}`}>
      {children}
    </button>
  );
}

export function TextArea({ className = '', big = false, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { big?: boolean }) {
  return (
    <textarea {...props}
      className={`w-full rounded-[14px] bg-white/[0.025] border border-[var(--line)] px-4 py-3.5 ${big ? 'text-[16px] min-h-[132px]' : 'text-[13.5px]'} text-white leading-relaxed outline-none resize-none placeholder:text-[var(--fg-4)] hover:border-[var(--line-2)] focus:border-white/40 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_rgba(255,255,255,0.05)] transition-all disabled:opacity-50 ${className}`} />
  );
}

const STYLE_TONES = ['from-[#262626] to-[#0c0c0c]', 'from-[#1c1c1c] to-[#2a2a2a]', 'from-[#303030] to-[#101010]', 'from-[#141414] to-[#262626]', 'from-[#2a2a2a] to-[#121212]', 'from-[#1a1a1a] to-[#070707]'];

export function StyleCard({ label, desc, active, onClick, index = 0, badge }: {
  label: string; desc?: string; active: boolean; onClick: () => void; index?: number; badge?: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`group relative rounded-[14px] border overflow-hidden text-left transition-all duration-200 ${active ? 'border-white ring-1 ring-white shadow-[0_10px_30px_-10px_rgba(255,255,255,0.3)]' : 'border-[var(--line)] hover:border-[var(--line-2)]'}`}>
      <div className={`relative h-[84px] bg-gradient-to-br ${STYLE_TONES[index % STYLE_TONES.length]} flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 ui-dots-bg opacity-50" />
        <span className={`relative text-[36px] font-semibold tracking-[-0.06em] select-none transition-all duration-300 ${active ? 'text-white' : 'text-white/15 group-hover:text-white/30'}`}>{label[0]}</span>
        {badge && <span className="absolute top-2 left-2 ui-chip ui-chip-solid !h-[18px] !text-[9.5px]">{badge}</span>}
        {active && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">{Ico.check}</span>}
      </div>
      <div className="px-3.5 py-3 bg-[#0a0a0a]">
        <div className={`text-[13px] font-medium ${active ? 'text-white' : 'text-[var(--fg-2)]'}`}>{label}</div>
        {desc && <div className="text-[11px] text-[var(--fg-4)] leading-relaxed mt-0.5">{desc}</div>}
      </div>
    </button>
  );
}

export function Credits({ n, suffix = 'credits' }: { n: number; suffix?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-3)]">
      <span className="text-white/60">{Ico.bolt}</span>
      <span className="text-white font-medium tabular-nums">{n.toLocaleString()}</span>{suffix}
    </span>
  );
}

/* Floating action bar pinned to the bottom of the editor viewport. */
export function ActionBar({ left, children }: { left?: ReactNode; children: ReactNode }) {
  return (
    <div className="fixed bottom-20 md:bottom-0 left-0 md:left-[240px] right-0 z-30 pointer-events-none">
      <div className="max-w-[860px] mx-auto px-4 md:px-8 pb-4 md:pb-6">
        <div className="pointer-events-auto flex items-center justify-between gap-4 min-h-[56px] p-2 pl-4 rounded-[18px] bg-[#0b0b0b]/85 backdrop-blur-xl border border-[var(--line-2)] shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
          <div className="min-w-0 flex items-center gap-3 text-[12.5px] text-[var(--fg-3)]">{left}</div>
          <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Modal({ children, onClose, width = 420 }: { children: ReactNode; onClose?: () => void; width?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onClick={onClose}>
      <div className="w-full ui-card !bg-[#0c0c0c] !rounded-[22px] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.8)] animate-[ui-rise_.4s_cubic-bezier(.22,1,.36,1)]"
        style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] text-[#ff8a8a] bg-[rgba(255,90,90,0.06)] border border-[rgba(255,90,90,0.15)] px-3 py-2.5 rounded-[10px]">{children}</p>;
}

/* ─────────────────────────── Narrator voices ─────────────────────────── */

export interface KitVoice {
  voice_id: string; name: string; preview_url?: string;
  labels?: { gender?: string; accent?: string; age?: string; use_case?: string; descriptive?: string };
}

export function VoiceAvatar({ name, gender, size = 34 }: { name: string; gender?: string; size?: number }) {
  const female = gender?.toLowerCase() === 'female';
  return (
    <span className="relative rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-semibold text-black/70"
      style={{
        width: size, height: size,
        background: female
          ? 'radial-gradient(circle at 30% 25%, #fff 0%, #e6e6e6 35%, #9a9a9a 100%)'
          : 'radial-gradient(circle at 30% 25%, #d9d9d9 0%, #8a8a8a 45%, #3a3a3a 100%)',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.25)',
      }}>
      {name.charAt(0)}
    </span>
  );
}

const FILTER_DIMS = [
  { key: 'accent', label: 'Accent' },
  { key: 'gender', label: 'Gender' },
  { key: 'age', label: 'Age' },
  { key: 'use_case', label: 'Use case' },
] as const;
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const labelOf = (v: KitVoice, key: string) => (v.labels as Record<string, string | undefined> | undefined)?.[key];

export function VoiceGrid({ voices, value, onChange, previewing, onPreview, maxHeight = 272, columns = 3 }: {
  voices: KitVoice[]; value: string | null; onChange: (id: string | null) => void;
  previewing?: string | null; onPreview?: (v: KitVoice) => void; maxHeight?: number; columns?: 2 | 3;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);

  const options = (key: string) => Array.from(new Set(voices.map(v => labelOf(v, key)).filter(Boolean) as string[])).sort();
  const filtered = voices.filter(v => FILTER_DIMS.every(d => !filters[d.key] || labelOf(v, d.key) === filters[d.key]));
  const setFilter = (key: string, val: string) => setFilters(f => { const n = { ...f }; if (val) n[key] = val; else delete n[key]; return n; });

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {FILTER_DIMS.map(d => {
          const opts = options(d.key);
          if (opts.length < 2) return null;
          const sel = filters[d.key];
          const isOpen = open === d.key;
          return (
            <div key={d.key} className="relative">
              <button type="button" onClick={() => setOpen(isOpen ? null : d.key)}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11.5px] transition-all ${sel ? 'border-white bg-white text-black font-medium' : 'border-[var(--line-2)] text-[var(--fg-3)] hover:text-white hover:border-[var(--line-3)]'}`}>
                {sel ? pretty(sel) : d.label}
                <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>{Ico.chevron}</span>
              </button>
              {isOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} />
                  <div className="absolute z-20 mt-1.5 left-0 min-w-[160px] max-h-[240px] overflow-y-auto rounded-[12px] p-1 bg-[#111] border border-[var(--line-2)] shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
                    {['', ...opts].map(o => (
                      <button key={o || 'all'} type="button" onClick={() => { setFilter(d.key, o); setOpen(null); }}
                        className={`w-full flex items-center justify-between text-left px-2.5 h-8 rounded-[8px] text-[12px] ${(sel || '') === o ? 'bg-white/[0.08] text-white' : 'text-[var(--fg-2)] hover:bg-white/[0.05]'}`}>
                        {o ? pretty(o) : 'All'}
                        {(sel || '') === o && Ico.check}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {Object.keys(filters).length > 0 && (
          <button type="button" onClick={() => setFilters({})} className="text-[11.5px] text-[var(--fg-4)] hover:text-white px-1.5 transition-colors">Clear</button>
        )}
        <span className="ml-auto ui-mono text-[10.5px] text-[var(--fg-4)]">{filtered.length} voices</span>
      </div>

      {voices.length === 0 ? (
        <div className={`grid grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-2`}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[54px] rounded-[12px] ui-shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-[12px] text-[var(--fg-4)] py-6 text-center rounded-[12px] border border-dashed border-[var(--line-2)]">No voices match these filters.</div>
      ) : (
        <div className={`grid grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-2 overflow-y-auto pr-1 -mr-1`} style={{ maxHeight }}>
          {filtered.map(v => {
            const on = v.voice_id === value;
            const playing = previewing === v.voice_id;
            return (
              <div key={v.voice_id} onClick={() => onChange(on ? null : v.voice_id)}
                className={`group flex items-center gap-2.5 pl-2 pr-1.5 h-[54px] rounded-[12px] border cursor-pointer transition-all ${on ? 'border-white bg-white/[0.07]' : 'border-[var(--line)] hover:border-[var(--line-2)] hover:bg-white/[0.02]'}`}>
                <VoiceAvatar name={v.name} gender={v.labels?.gender} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium truncate flex items-center gap-1.5">{v.name}{on && <span className="text-white">{Ico.check}</span>}</div>
                  <div className="text-[10.5px] text-[var(--fg-4)] truncate capitalize">{[v.labels?.accent, v.labels?.descriptive].filter(Boolean).join(' · ') || v.labels?.gender}</div>
                </div>
                {onPreview && (
                  <button type="button" title={playing ? 'Stop' : 'Preview voice'} onClick={e => { e.stopPropagation(); onPreview(v); }}
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${playing ? 'bg-white text-black' : 'bg-white/[0.07] text-white hover:bg-white/[0.16]'}`}>
                    {playing ? Ico.stop : Ico.play}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Studio (render workspace) ─────────────────────────── */

export function StudioPanel({ title, sub, right, children, className = '', bodyClass = '' }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <div className={`rounded-[16px] bg-[#070707] border border-[var(--line)] overflow-hidden flex flex-col ${className}`}>
      {title !== undefined && (
        <div className="flex items-center justify-between gap-3 px-4 h-12 border-b border-[var(--line)] flex-shrink-0">
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold tracking-[-0.01em] truncate">{title}</div>
          </div>
          {sub && <div className="ui-mono text-[10px] text-[var(--fg-4)] truncate">{sub}</div>}
          {right}
        </div>
      )}
      <div className={`flex-1 min-h-0 ${bodyClass}`}>{children}</div>
    </div>
  );
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: 'Queued', processing: 'Working', rendering_image: 'Image', animating: 'Animate',
    regenerating: 'Redo', completed: 'Done', failed: 'Failed',
  };
  return map[status] || status || 'Queued';
}

export function StatusDot({ status }: { status: string }) {
  const busy = ['processing', 'rendering_image', 'animating', 'regenerating'].includes(status);
  const cls = status === 'completed' ? 'bg-white' : status === 'failed' ? 'bg-[#ff6b6b]' : busy ? 'bg-white animate-[ui-blink_1.2s_ease-in-out_infinite]' : 'bg-white/25';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cls}`} />;
}

export interface ChatMsg { role: 'user' | 'assistant'; text: string }

export function ChatPanel({ messages, value, onChange, onSubmit, disabled, placeholder = 'Describe an edit…' }: {
  messages: ChatMsg[]; value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean; placeholder?: string;
}) {
  return (
    <StudioPanel title={<span className="flex items-center gap-2"><span className="w-5 h-5 rounded-md bg-white text-black flex items-center justify-center">{Ico.sparkle}</span>Mave · AI editor</span>} className="h-full">
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] px-3 py-2 text-[12px] leading-relaxed rounded-[14px] ${m.role === 'user' ? 'bg-white text-black rounded-br-[4px]' : 'bg-white/[0.05] border border-[var(--line)] text-[var(--fg-2)] rounded-bl-[4px]'}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[var(--line)]">
          <div className="flex items-center gap-2 h-10 pl-3.5 pr-1 rounded-full bg-white/[0.03] border border-[var(--line-2)] focus-within:border-white/40 transition-colors">
            <input value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
              placeholder={placeholder} className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[var(--fg-4)] min-w-0" />
            <button onClick={onSubmit} disabled={disabled || !value.trim()} aria-label="Send"
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-20 transition-opacity">{Ico.send}</button>
          </div>
        </div>
      </div>
    </StudioPanel>
  );
}

export interface Clip { n: number; duration: number; status: string; image?: string | null }

export function StudioTimeline({ clips, selected, onSelect, onResizeStart, pxPerSecond, totalDuration, formatTime, right }: {
  clips: Clip[]; selected: number; onSelect: (n: number) => void;
  onResizeStart?: (n: number, e: ReactMouseEvent<HTMLDivElement>) => void;
  pxPerSecond: number; totalDuration: number; formatTime: (s: number) => string; right?: ReactNode;
}) {
  const ticks = Array.from({ length: Math.max(8, Math.ceil(totalDuration / 5) + 2) }, (_, i) => i * 5);
  const width = Math.max(980, totalDuration * pxPerSecond + 100);
  return (
    <section className="rounded-[16px] bg-[#060606] border border-[var(--line)] overflow-hidden flex flex-col min-h-[196px]">
      <div className="flex items-center justify-between h-10 px-4 border-b border-[var(--line)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="ui-eyebrow">Timeline</span>
          <span className="ui-mono text-[10.5px] text-[var(--fg-4)]">{clips.length} clips · {formatTime(totalDuration)}</span>
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="flex-1 grid grid-cols-[92px_minmax(0,1fr)] min-h-0">
        <div className="border-r border-[var(--line)] bg-[#080808]">
          <div className="h-8 border-b border-[var(--line)]" />
          <div className="h-[60px] border-b border-[var(--line)] flex items-center gap-2 px-4 text-[11.5px] text-white"><span className="w-[3px] h-4 rounded bg-white" />Video</div>
          <div className="h-[52px] flex items-center gap-2 px-4 text-[11.5px] text-[var(--fg-4)]"><span className="w-[3px] h-4 rounded bg-white/20" />Audio</div>
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="relative h-full" style={{ width }}>
            <div className="h-8 border-b border-[var(--line)] relative">
              {ticks.map(t => (
                <div key={t} className="absolute top-0 h-full" style={{ left: t * pxPerSecond }}>
                  <div className="ui-mono text-[9.5px] text-[var(--fg-4)] mt-2 ml-1.5">{formatTime(t)}</div>
                  <div className="absolute bottom-0 left-0 h-2 w-px bg-white/20" />
                </div>
              ))}
            </div>
            <div className="h-[60px] border-b border-[var(--line)] relative">
              <div className="absolute left-0 top-[10px] flex">
                {clips.map(c => {
                  const on = selected === c.n;
                  return (
                    <div key={c.n} onClick={() => onSelect(c.n)} style={{ width: c.duration * pxPerSecond }}
                      className={`group relative h-10 rounded-[10px] border flex items-center gap-2 pl-1.5 pr-4 mr-1 cursor-pointer overflow-hidden transition-colors ${on ? 'bg-white text-black border-white' : 'bg-[#161616] border-[var(--line-2)] text-white hover:border-[var(--line-3)]'}`}>
                      {c.image
                        ? <img src={c.image} alt="" className="w-7 h-7 rounded-[6px] object-cover flex-shrink-0" />
                        : <span className={`w-7 h-7 rounded-[6px] flex-shrink-0 ${on ? 'bg-black/10' : 'bg-white/[0.05]'}`} />}
                      <span className="ui-mono text-[10px] truncate">S{String(c.n).padStart(2, '0')} · {c.duration}s</span>
                      <span className={`ml-auto flex items-center gap-1.5 text-[9.5px] ${on ? 'text-black/55' : 'text-[var(--fg-4)]'}`}>
                        {!on && <StatusDot status={c.status} />}{statusLabel(c.status)}
                      </span>
                      {onResizeStart && (
                        <div onMouseDown={e => { e.stopPropagation(); onResizeStart(c.n, e); }}
                          className={`absolute right-0 top-0 h-full w-2.5 cursor-ew-resize flex items-center justify-center ${on ? 'bg-black/10' : 'bg-white/[0.06] group-hover:bg-white/20'}`}>
                          <span className={`w-px h-3 ${on ? 'bg-black/40' : 'bg-white/40'}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-[52px] relative">
              <div className="absolute left-0 right-10 top-3 h-7 rounded-[8px] bg-white/[0.03] border border-[var(--line)] overflow-hidden flex items-center gap-[2px] px-1">
                {Array.from({ length: Math.floor(width / 5) }).map((_, i) => (
                  <span key={i} className="w-[2px] rounded-full bg-white/30 flex-shrink-0" style={{ height: `${20 + Math.abs(Math.sin(i * 0.9) * 55 + Math.sin(i * 0.23) * 20)}%` }} />
                ))}
              </div>
            </div>
            <div className="absolute top-0 bottom-0 left-8 w-px bg-white pointer-events-none">
              <div className="absolute -top-px -left-[5px] w-[11px] h-2.5 rounded-b-[3px] bg-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Stage({ aspect, children, progress, processing, maxH = 'max-h-[440px]' }: {
  aspect: string; children: ReactNode; progress?: number; processing?: boolean; maxH?: string;
}) {
  const box = aspect === '9:16' ? `aspect-[9/16] h-full ${maxH}` : aspect === '1:1' ? `aspect-square h-full ${maxH}` : 'aspect-video w-full';
  return (
    <div className={`relative ${box} rounded-[12px] overflow-hidden bg-[#0d0d0d] border border-[var(--line)] flex items-center justify-center`}>
      <div className="absolute inset-0 ui-dots-bg opacity-30 pointer-events-none" />
      <div className="relative w-full h-full flex items-center justify-center">{children}</div>
      {processing && (
        <div className="absolute left-3 right-3 bottom-3 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-white transition-all duration-700" style={{ width: `${Math.max(4, progress || 0)}%` }} />
        </div>
      )}
    </div>
  );
}

export function StageEmpty({ label, busy = true }: { label: string; busy?: boolean }) {
  return (
    <div className="text-center px-6">
      {busy ? <Spinner size={28} className="mb-4" /> : <span className="inline-flex text-white/20 mb-3">{Ico.film}</span>}
      <div className="text-[12px] text-[var(--fg-3)] max-w-[260px]">{label}</div>
    </div>
  );
}
