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

export function Spinner({ size = 14, className = '' }: { size?: number; className?: string }) {
  return <span className={`inline-block rounded-full border-[1.5px] border-white/15 border-t-white animate-spin ${className}`} style={{ width: size, height: size }} />;
}

/* ─────────────────────────── Shell ─────────────────────────── */

export function Stepper({ steps, current, onStep }: { steps: string[]; current: number; onStep?: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = !!onStep && i < current;
        return (
          <li key={label} className="flex items-center gap-1">
            <button type="button" disabled={!clickable} onClick={() => onStep?.(i)}
              className={`flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] transition-colors ${clickable ? 'hover:bg-white/[0.05] cursor-pointer' : 'cursor-default'} ${active ? 'text-white' : done ? 'text-[var(--fg-2)]' : 'text-[var(--fg-4)]'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium ${active ? 'bg-[#ededed] text-black' : done ? 'bg-white/[0.15] text-white' : 'border border-[var(--line-2)]'}`}>
                {done ? Ico.check : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 && <span className="w-4 h-px bg-[var(--line-2)]" />}
          </li>
        );
      })}
    </ol>
  );
}

export function EditorHeader({ format, onBack, steps, current, onStep, right, meta }: {
  format: string; onBack: () => void; steps?: string[]; current?: number; onStep?: (i: number) => void; right?: ReactNode; meta?: ReactNode;
}) {
  return (
    <header className="flex-shrink-0 sticky top-0 z-30 h-12 bg-black border-b border-[var(--line)]">
      <div className="h-full px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} aria-label="Back"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--fg-3)] hover:text-white hover:bg-white/[0.05] transition-colors flex-shrink-0">
            {Ico.back}
          </button>
          <span className="text-[13px] text-[var(--fg-4)]">Create</span>
          <span className="text-[13px] text-[var(--fg-4)]">/</span>
          <span className="text-[13px] font-medium truncate">{format}</span>
          {meta && <div className="hidden lg:flex items-center gap-1.5 ml-2">{meta}</div>}
        </div>
        <div className="justify-self-center">
          {steps && steps.length > 1 && <Stepper steps={steps} current={current ?? 0} onStep={onStep} />}
        </div>
        <div className="justify-self-end flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}

export function EditorPage({ children, width = 720 }: { children: ReactNode; width?: number }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto px-5 md:px-8 pt-8 pb-24" style={{ maxWidth: width }}>{children}</div>
    </div>
  );
}

export function Intro({ eyebrow, title, desc, right }: { eyebrow?: string; title: string; desc?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        {eyebrow && <div className="text-[12px] text-[var(--fg-4)] mb-1">{eyebrow}</div>}
        <h1 className="text-[20px] font-semibold tracking-[-0.02em]">{title}</h1>
        {desc && <p className="text-[13px] text-[var(--fg-3)] mt-1 max-w-[560px]">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export function Section({ title, hint, right, children, className = '' }: {
  n?: number; title: string; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`mb-8 ${className}`}>
      <div className="flex items-center gap-2 mb-2.5 min-h-[20px]">
        <h2 className="text-[13px] font-medium">{title}</h2>
        {hint && <span className="text-[12px] text-[var(--fg-4)] hidden sm:inline">{hint}</span>}
        <div className="flex-1" />
        {right}
      </div>
      {children}
    </section>
  );
}

export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[12px] text-[var(--fg-3)]">{children}</span>
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
    <div className={`${full ? 'flex w-full' : 'inline-flex'} p-0.5 gap-0.5 rounded-lg bg-[var(--surface)] border border-[var(--line)]`}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)} disabled={o.disabled} title={o.title}
            className={`${full ? 'flex-1' : ''} ${size === 'sm' ? 'h-6 px-2 text-[12px]' : o.sub !== undefined ? 'h-10 px-3 text-[12.5px]' : 'h-7 px-3 text-[12.5px]'} rounded-md flex flex-col items-center justify-center leading-tight transition-colors disabled:opacity-30 disabled:cursor-not-allowed
              ${on ? 'bg-white/[0.1] text-white' : 'text-[var(--fg-3)] hover:text-[var(--fg)]'}`}>
            <span className="flex items-center gap-1.5 whitespace-nowrap">{o.icon}{o.label}</span>
            {o.sub !== undefined && <span className="text-[11px] text-[var(--fg-4)] mt-0.5">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-7 h-4 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-[#ededed]' : 'bg-white/[0.15]'}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-[left] ${on ? 'left-[14px] bg-black' : 'left-0.5 bg-white/70'}`} />
    </button>
  );
}

export function ToggleRow({ on, onChange, label, desc, icon }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string; icon?: ReactNode }) {
  return (
    <div onClick={() => onChange(!on)} className="flex items-center gap-3 px-3 h-11 cursor-pointer hover:bg-white/[0.02] transition-colors">
      {icon && <span className="text-[var(--fg-3)] flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-[13px]">{label}</span>
        {desc && <span className="text-[12px] text-[var(--fg-4)] truncate">{desc}</span>}
      </div>
      <span onClick={e => e.stopPropagation()}><Toggle on={on} onChange={onChange} label={label} /></span>
    </div>
  );
}

export function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${on ? 'border-[var(--line-3)] bg-white/[0.08] text-white' : 'border-[var(--line)] text-[var(--fg-3)] hover:text-white hover:border-[var(--line-2)]'}`}>
      {children}
    </button>
  );
}

export function TextArea({ className = '', big = false, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { big?: boolean }) {
  return (
    <textarea {...props}
      className={`w-full rounded-lg bg-[var(--surface)] border border-[var(--line-2)] px-3 py-2.5 ${big ? 'text-[14px] min-h-[104px]' : 'text-[13px]'} text-[var(--fg)] leading-relaxed outline-none resize-none placeholder:text-[var(--fg-4)] hover:border-[var(--line-3)] focus:border-white/40 transition-colors disabled:opacity-50 ${className}`} />
  );
}

export function StyleCard({ label, desc, active, onClick, badge }: {
  label: string; desc?: string; active: boolean; onClick: () => void; index?: number; badge?: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors ${active ? 'border-[var(--line-3)] bg-white/[0.06]' : 'border-[var(--line)] hover:border-[var(--line-2)] hover:bg-white/[0.02]'}`}>
      <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${active ? 'border-white' : 'border-[var(--line-3)]'}`}>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium">{label}</span>
          {badge && <span className="text-[11px] text-[var(--fg-4)]">· {badge}</span>}
        </span>
        {desc && <span className="block text-[12px] text-[var(--fg-3)] leading-snug mt-0.5">{desc}</span>}
      </span>
    </button>
  );
}

export function Credits({ n, suffix = 'credits' }: { n: number; suffix?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-3)]">
      <span className="text-[var(--fg)] tabular-nums">{n.toLocaleString()}</span>{suffix ? ` ${suffix.trim()}` : ' credits'}
    </span>
  );
}

/* Footer bar pinned to the bottom of the editor viewport. */
export function ActionBar({ left, children }: { left?: ReactNode; children: ReactNode }) {
  return (
    <div className="fixed bottom-14 md:bottom-0 left-0 md:left-[220px] right-0 z-30 h-14 bg-black border-t border-[var(--line)]">
      <div className="h-full px-5 md:px-8 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-2 text-[12.5px] text-[var(--fg-3)]">{left}</div>
        <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ children, onClose, width = 420 }: { children: ReactNode; onClose?: () => void; width?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full rounded-xl bg-[var(--surface)] border border-[var(--line-2)] p-5" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] text-[#ff8a8a] bg-[rgba(255,90,90,0.06)] border border-[rgba(255,90,90,0.15)] px-3 py-2 rounded-lg">{children}</p>;
}

/* ─────────────────────────── Narrator voices ─────────────────────────── */

export interface KitVoice {
  voice_id: string; name: string; preview_url?: string;
  labels?: { gender?: string; accent?: string; age?: string; use_case?: string; descriptive?: string };
}

export function VoiceAvatar({ name, size = 26 }: { name: string; gender?: string; size?: number }) {
  return (
    <span className="rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-medium text-[var(--fg-2)] bg-[var(--surface-3)] border border-[var(--line-2)]"
      style={{ width: size, height: size }}>
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

export function VoiceGrid({ voices, value, onChange, previewing, onPreview, maxHeight = 264, columns = 3 }: {
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
      <div className="flex items-center gap-1 flex-wrap mb-2">
        {FILTER_DIMS.map(d => {
          const opts = options(d.key);
          if (opts.length < 2) return null;
          const sel = filters[d.key];
          const isOpen = open === d.key;
          return (
            <div key={d.key} className="relative">
              <button type="button" onClick={() => setOpen(isOpen ? null : d.key)}
                className={`inline-flex items-center gap-1 h-6 px-2 rounded-md border text-[12px] transition-colors ${sel ? 'border-[var(--line-3)] bg-white/[0.08] text-white' : 'border-[var(--line)] text-[var(--fg-3)] hover:text-white'}`}>
                {sel ? pretty(sel) : d.label}{Ico.chevron}
              </button>
              {isOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} />
                  <div className="absolute z-20 mt-1 left-0 min-w-[150px] max-h-[220px] overflow-y-auto rounded-lg p-1 bg-[var(--surface-2)] border border-[var(--line-2)]">
                    {['', ...opts].map(o => (
                      <button key={o || 'all'} type="button" onClick={() => { setFilter(d.key, o); setOpen(null); }}
                        className={`w-full flex items-center justify-between text-left px-2 h-7 rounded-md text-[12px] ${(sel || '') === o ? 'bg-white/[0.08] text-white' : 'text-[var(--fg-2)] hover:bg-white/[0.05]'}`}>
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
          <button type="button" onClick={() => setFilters({})} className="text-[12px] text-[var(--fg-4)] hover:text-white px-1.5">Clear</button>
        )}
        <span className="ml-auto text-[12px] text-[var(--fg-4)]">{filtered.length} voices</span>
      </div>

      {voices.length === 0 ? (
        <div className={`grid grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-1.5`}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-lg ui-shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-[12px] text-[var(--fg-4)] py-5 text-center rounded-lg border border-dashed border-[var(--line-2)]">No voices match these filters.</div>
      ) : (
        <div className={`grid grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-1.5 overflow-y-auto`} style={{ maxHeight }}>
          {filtered.map(v => {
            const on = v.voice_id === value;
            const playing = previewing === v.voice_id;
            return (
              <div key={v.voice_id} onClick={() => onChange(on ? null : v.voice_id)}
                className={`flex items-center gap-2.5 pl-2 pr-1.5 h-11 rounded-lg border cursor-pointer transition-colors ${on ? 'border-[var(--line-3)] bg-white/[0.06]' : 'border-[var(--line)] hover:border-[var(--line-2)]'}`}>
                <VoiceAvatar name={v.name} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium truncate">{v.name}</div>
                  <div className="text-[11px] text-[var(--fg-4)] truncate capitalize">{[v.labels?.accent, v.labels?.descriptive].filter(Boolean).join(' · ') || v.labels?.gender}</div>
                </div>
                {onPreview && (
                  <button type="button" title={playing ? 'Stop' : 'Preview voice'} onClick={e => { e.stopPropagation(); onPreview(v); }}
                    className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${playing ? 'bg-[#ededed] text-black' : 'text-[var(--fg-3)] hover:text-white hover:bg-white/[0.08]'}`}>
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
    <div className={`rounded-[10px] bg-[var(--surface)] border border-[var(--line)] overflow-hidden flex flex-col ${className}`}>
      {title !== undefined && (
        <div className="flex items-center justify-between gap-3 px-3.5 h-10 border-b border-[var(--line)] flex-shrink-0">
          <div className="text-[12.5px] font-medium truncate min-w-0">{title}</div>
          {sub && <div className="text-[12px] text-[var(--fg-4)] truncate">{sub}</div>}
          {right}
        </div>
      )}
      <div className={`flex-1 min-h-0 ${bodyClass}`}>{children}</div>
    </div>
  );
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: 'Queued', processing: 'Working', rendering_image: 'Image', animating: 'Animating',
    regenerating: 'Redoing', completed: 'Done', failed: 'Failed',
  };
  return map[status] || status || 'Queued';
}

export function StatusDot({ status }: { status: string }) {
  const busy = ['processing', 'rendering_image', 'animating', 'regenerating'].includes(status);
  const cls = status === 'completed' ? 'bg-[#ededed]' : status === 'failed' ? 'bg-[#ff6b6b]' : busy ? 'bg-white/60' : 'bg-white/20';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cls}`} />;
}

export interface ChatMsg { role: 'user' | 'assistant'; text: string }

export function ChatPanel({ messages, value, onChange, onSubmit, disabled, placeholder = 'Describe an edit…' }: {
  messages: ChatMsg[]; value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean; placeholder?: string;
}) {
  return (
    <StudioPanel title="AI editor" className="h-full">
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {messages.map((m, i) => (
            <div key={i}>
              <div className="text-[11px] text-[var(--fg-4)] mb-0.5">{m.role === 'user' ? 'You' : 'Mave'}</div>
              <div className={`text-[12.5px] leading-relaxed ${m.role === 'user' ? 'text-[var(--fg)]' : 'text-[var(--fg-2)]'}`}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="p-2.5 border-t border-[var(--line)]">
          <div className="flex items-center gap-1.5 h-8 pl-2.5 pr-1 rounded-lg bg-black border border-[var(--line-2)] focus-within:border-white/35 transition-colors">
            <input value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
              placeholder={placeholder} className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[var(--fg-4)] min-w-0" />
            <button onClick={onSubmit} disabled={disabled || !value.trim()} aria-label="Send"
              className="w-6 h-6 rounded-md bg-[#ededed] text-black flex items-center justify-center disabled:opacity-20">{Ico.send}</button>
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
  const trackW = totalDuration * pxPerSecond;
  return (
    <section className="rounded-[10px] bg-[var(--surface)] border border-[var(--line)] overflow-hidden flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between h-9 px-3.5 border-b border-[var(--line)]">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="font-medium">Timeline</span>
          <span className="text-[var(--fg-4)]">{clips.length} clips · {formatTime(totalDuration)}</span>
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="grid grid-cols-[72px_minmax(0,1fr)]">
        <div className="border-r border-[var(--line)] text-[12px] text-[var(--fg-3)]">
          <div className="h-6 border-b border-[var(--line)]" />
          <div className="h-12 border-b border-[var(--line)] flex items-center px-3">Video</div>
          <div className="h-9 flex items-center px-3 text-[var(--fg-4)]">Audio</div>
        </div>
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="relative" style={{ width }}>
            <div className="h-6 border-b border-[var(--line)] relative">
              {ticks.map(t => (
                <div key={t} className="absolute top-0 h-full" style={{ left: t * pxPerSecond }}>
                  <div className="text-[10px] text-[var(--fg-4)] tabular-nums mt-1 ml-1">{formatTime(t)}</div>
                  <div className="absolute bottom-0 left-0 h-1.5 w-px bg-white/15" />
                </div>
              ))}
            </div>
            <div className="h-12 border-b border-[var(--line)] relative">
              <div className="absolute left-0 top-1.5 flex">
                {clips.map(c => {
                  const on = selected === c.n;
                  return (
                    <div key={c.n} onClick={() => onSelect(c.n)} style={{ width: c.duration * pxPerSecond }}
                      className={`relative h-9 rounded-md border flex items-center gap-2 pl-1 pr-3 mr-px cursor-pointer overflow-hidden transition-colors ${on ? 'border-white/70 bg-white/[0.1]' : 'border-[var(--line-2)] bg-[var(--surface-3)] hover:border-[var(--line-3)]'}`}>
                      {c.image
                        ? <img src={c.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        : <span className="w-7 h-7 rounded bg-white/[0.04] flex-shrink-0" />}
                      <span className="text-[11px] tabular-nums truncate">Scene {c.n} · {c.duration}s</span>
                      <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--fg-4)]">
                        <StatusDot status={c.status} />{statusLabel(c.status)}
                      </span>
                      {onResizeStart && (
                        <div onMouseDown={e => { e.stopPropagation(); onResizeStart(c.n, e); }}
                          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-white/15" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-9 relative">
              {trackW > 0 && <div className="absolute left-0 top-2 h-5 rounded bg-white/[0.05] border border-[var(--line)]" style={{ width: trackW }} />}
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
    <div className={`relative ${box} rounded-lg overflow-hidden bg-black border border-[var(--line)] flex items-center justify-center`}>
      {children}
      {processing && (
        <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-white/10">
          <div className="h-full bg-white/80 transition-[width] duration-500" style={{ width: `${Math.max(3, progress || 0)}%` }} />
        </div>
      )}
    </div>
  );
}

export function StageEmpty({ label, busy = true }: { label: string; busy?: boolean }) {
  return (
    <div className="text-center px-6 flex flex-col items-center gap-3">
      {busy ? <Spinner size={18} /> : <span className="text-white/20">{Ico.film}</span>}
      <div className="text-[12.5px] text-[var(--fg-3)] max-w-[260px]">{label}</div>
    </div>
  );
}
