'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { longTemplate, sectionSeconds, fmtTime, type LongProject, type LongSection, type LongShot } from '@/lib/long';

// The long-video workspace: a CapCut-style production room. Top: the steps and the one action that matters now.
// Left: script (editable before approval), shots, assets. Centre: the 16:9 preview (the video, a part, or the
// storyboard frame of the selected shot). Right: production status and the selected part / shot. Bottom: the timeline.

type Tab = 'script' | 'shots' | 'assets';
const STEPS = ['Plan', 'Review', 'Art', 'Parts', 'Export'] as const;

const ic = {
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  dl: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></svg>,
};

function stepIndex(p: LongProject | null) {
  if (!p) return 0;
  if (p.status === 'planning') return 0;
  if (p.status === 'awaiting_approval') return 1;
  if (p.status === 'completed') return 5;
  if (p.stage === 'art') return 2;
  if (p.stage === 'final') return 4;
  return 3;
}

export default function Workspace({ params }: { params: { id: string } }) {
  const [p, setP] = useState<LongProject | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState<Tab>('script');
  const [sel, setSel] = useState({ part: 0, shot: 0 });
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState('');
  const [actErr, setActErr] = useState('');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const vid = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/long/projects/${params.id}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setLoadErr(d.error || 'Could not load the project'); return; }
      setP(d); setLoadErr('');
    } catch { setLoadErr('Could not reach the server'); }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);
  const live = !!p && (p.running || p.status === 'planning');
  useEffect(() => {
    const iv = setInterval(load, live ? 4000 : 20000);
    return () => clearInterval(iv);
  }, [load, live]);
  useEffect(() => { if (p?.title && !title) setTitle(p.title); }, [p?.title]);   // eslint-disable-line react-hooks/exhaustive-deps

  const tpl = p ? longTemplate(p.template) : undefined;
  const sections = p?.plan?.sections || [];
  const cost = tpl && p ? tpl.perMinute * p.minutes : 0;
  const editable = p?.status === 'awaiting_approval';
  const paused = !!p && !p.running && (p.status === 'producing' || (p.status === 'planning' && !!p.error));

  // the timeline: part spans (seconds), each shot's start inside its part
  const spans = useMemo(() => {
    let t = 0;
    return sections.map((s, i) => { const d = sectionSeconds(s, p?.parts[i]); const o = { start: t, dur: d }; t += d; return o; });
  }, [sections, p?.parts]);
  const total = spans.length ? spans[spans.length - 1].start + spans[spans.length - 1].dur : (p?.minutes || 5) * 60;
  const shotStart = (k: number, sh: LongShot) => {
    const sec = sections[k]; const part = p?.parts[k];
    if (part?.lines?.[sh.line]) return spans[k].start + part.lines[sh.line].start;
    const words = sec.lines.map(l => l.text.split(/\s+/).length), before = words.slice(0, sh.line).reduce((a, b) => a + b, 0), all = words.reduce((a, b) => a + b, 0) || 1;
    return spans[k].start + spans[k].dur * before / all;
  };

  const hasFinal = !!p?.final_video_url;
  const partVideo = p?.parts[sel.part]?.video_url;
  const src = hasFinal ? p!.final_video_url! : partVideo || '';
  const srcOffset = hasFinal ? 0 : spans[sel.part]?.start || 0;

  // follow the playhead: which part / shot is under it
  useEffect(() => {
    if (!playing || !sections.length) return;
    const k = Math.max(0, spans.findIndex((s, i) => time >= s.start && (i === spans.length - 1 || time < spans[i + 1].start)));
    const shots = sections[k]?.shots || [];
    let j = 0; shots.forEach((sh, n) => { if (shotStart(k, sh) <= time) j = n; });
    if (k !== sel.part || j !== sel.shot) setSel({ part: k, shot: j });
  }, [time, playing]);   // eslint-disable-line react-hooks/exhaustive-deps

  const seek = (t: number) => {
    setTime(t);
    const k = Math.max(0, spans.findIndex((s, i) => t >= s.start && (i === spans.length - 1 || t < spans[i + 1].start)));
    let j = 0; (sections[k]?.shots || []).forEach((sh, n) => { if (shotStart(k, sh) <= t) j = n; });
    setSel({ part: k, shot: j });
    if (vid.current) { const local = hasFinal ? t : t - (spans[k]?.start || 0); if (hasFinal || k === sel.part) vid.current.currentTime = Math.max(0, local); }
  };

  const act = async (kind: 'approve' | 'resume' | 'save') => {
    setBusy(kind); setActErr('');
    try {
      const url = kind === 'save' ? `/api/long/projects/${params.id}/plan` : `/api/long/projects/${params.id}/${kind}`;
      const body = kind === 'save' ? JSON.stringify({ title, sections: Object.entries(draft).map(([id, lines]) => ({ id, lines })) }) : undefined;
      const r = await fetch(url, { method: kind === 'save' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Something went wrong');
      if (kind === 'save') setDraft({});
      await load();
    } catch (e: any) { setActErr(e.message); } finally { setBusy(''); }
  };
  const approve = async () => { if (Object.keys(draft).length || (p && title && title !== p.title)) await act('save'); await act('approve'); };

  if (loadErr && !p) return <div className="h-screen grid place-items-center text-[var(--fg-3)]"><div className="text-center"><div>{loadErr}</div><Link href="/youtube" className="ui-btn ui-btn-secondary ui-btn-sm mt-4">Back to long videos</Link></div></div>;

  const step = stepIndex(p);
  const curShot: LongShot | undefined = sections[sel.part]?.shots?.[sel.shot];

  return (
    <div className="h-screen flex flex-col bg-[#060607] overflow-hidden">
      {/* top bar */}
      <div className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-[var(--line)] bg-[#0a0a0b]">
        <Link href="/youtube" className="w-8 h-8 grid place-items-center rounded-md text-[var(--fg-3)] hover:text-white hover:bg-white/[0.05]" aria-label="Back">{ic.back}</Link>
        <div className="min-w-0">
          <div className="text-[13px] font-medium truncate max-w-[280px]">{p?.title || p?.topic || 'New video'}</div>
          <div className="text-[10.5px] text-[var(--fg-4)]">{p?.template_name || 'Flat Explainer'} · {p?.minutes || '–'} min</div>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="hidden lg:flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] ${i < step ? 'text-[var(--fg-2)]' : i === step ? 'bg-white/[0.08] text-white' : 'text-[var(--fg-4)]'}`}>
                  <span className={`w-4 h-4 rounded-full grid place-items-center text-[9px] ${i < step ? 'bg-emerald-400/90 text-black' : i === step ? 'bg-white text-black' : 'border border-[var(--line-2)]'}`}>{i < step ? ic.check : i + 1}</span>{s}
                </div>
                {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? 'bg-emerald-400/50' : 'bg-[var(--line-2)]'}`} />}
              </div>
            ))}
          </div>
        </div>
        <Primary p={p} cost={cost} busy={busy} paused={paused} onApprove={approve} onResume={() => act('resume')} />
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* left: script / shots / assets */}
        <div className="w-[320px] shrink-0 border-r border-[var(--line)] bg-[#0a0a0b] flex flex-col min-h-0">
          <div className="h-10 shrink-0 flex items-center gap-1 px-2 border-b border-[var(--line)]">
            {(['script', 'shots', 'assets'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`h-7 px-3 rounded-md text-[12px] capitalize ${tab === t ? 'bg-white/[0.08] text-white' : 'text-[var(--fg-3)] hover:text-white'}`}>{t}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!p?.plan ? <PlanSkeleton msg={p?.message} /> : tab === 'script' ? (
              <div className="p-3 space-y-4">
                {editable && (
                  <div>
                    <div className="ui-eyebrow mb-1">Title</div>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="ui-input" maxLength={100} />
                  </div>
                )}
                {sections.map((s, k) => (
                  <div key={s.id} className={`rounded-lg border ${sel.part === k ? 'border-white/25 bg-white/[0.03]' : 'border-[var(--line)]'}`}>
                    <button onClick={() => setSel({ part: k, shot: 0 })} className="w-full flex items-center justify-between px-3 h-9 text-left">
                      <span className="text-[12px] font-medium truncate"><span className="text-[var(--fg-4)] mr-1.5">{k + 1}</span>{s.title}</span>
                      <span className="text-[10.5px] text-[var(--fg-4)]">{fmtTime(spans[k]?.dur || 0)}</span>
                    </button>
                    {sel.part === k && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {s.lines.map((l, i) => editable ? (
                          <textarea key={i} rows={2} value={(draft[s.id] || s.lines.map(x => x.text))[i]}
                            onChange={e => { const arr = [...(draft[s.id] || s.lines.map(x => x.text))]; arr[i] = e.target.value; setDraft({ ...draft, [s.id]: arr }); }}
                            className="w-full text-[12.5px] leading-snug bg-transparent border border-transparent hover:border-[var(--line-2)] focus:border-[var(--line-3)] rounded-md px-2 py-1.5 outline-none resize-none" />
                        ) : (
                          <p key={i} className="text-[12.5px] leading-snug text-[var(--fg-2)] px-2 py-1">{l.text}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {editable && Object.keys(draft).length > 0 && (
                  <button onClick={() => act('save')} disabled={!!busy} className="ui-btn ui-btn-secondary ui-btn-sm w-full">{busy === 'save' ? 'Saving…' : 'Save script changes'}</button>
                )}
              </div>
            ) : tab === 'shots' ? (
              <div className="p-3 space-y-1.5">
                <div className="ui-eyebrow px-1 mb-1">Part {sel.part + 1} · {sections[sel.part]?.title}</div>
                {(sections[sel.part]?.shots || []).map((sh, j) => (
                  <button key={j} onClick={() => { setSel({ part: sel.part, shot: j }); }} className={`w-full text-left rounded-lg border p-2.5 flex gap-2.5 ${sel.shot === j ? 'border-white/30 bg-white/[0.04]' : 'border-[var(--line)] hover:border-[var(--line-2)]'}`}>
                    <Thumb url={p.assets[sh.place]?.url} className="w-[72px] shrink-0 aspect-video rounded" label={sh.place === 'headline' ? 'TITLE' : undefined} />
                    <div className="min-w-0">
                      <div className="text-[10.5px] text-[var(--fg-4)]">{fmtTime(shotStart(sel.part, sh))} · {sh.place}</div>
                      <div className="text-[12px] leading-snug line-clamp-2">{sh.action}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Assets p={p} />
            )}
          </div>
        </div>

        {/* centre: preview */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 grid place-items-center p-6">
            <div className="w-full max-w-[1100px]">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[var(--line)] shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)]">
                {src ? (
                  <video ref={vid} key={src} src={src} className="w-full h-full" playsInline
                    onTimeUpdate={e => setTime(srcOffset + (e.target as HTMLVideoElement).currentTime)}
                    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
                ) : p?.plan ? (
                  <Storyboard p={p} shot={curShot} line={sections[sel.part]?.lines[curShot?.line ?? 0]?.text} />
                ) : (
                  <div className="absolute inset-0 grid place-items-center"><div className="text-center"><div className="w-6 h-6 mx-auto rounded-full border-2 border-white/20 border-t-white animate-spin" /><div className="text-[13px] text-[var(--fg-3)] mt-3">{p?.message || 'Loading…'}</div></div></div>
                )}
                {!src && p?.plan && <span className="absolute top-3 left-3 ui-chip">Storyboard · part {sel.part + 1}, shot {sel.shot + 1}</span>}
              </div>
              <div className="flex items-center gap-3 mt-3 text-[12px] text-[var(--fg-3)]">
                <button disabled={!src} onClick={() => { const v = vid.current; if (!v) return; v.paused ? v.play() : v.pause(); }} className="w-8 h-8 grid place-items-center rounded-full bg-white text-black disabled:opacity-30">{playing ? ic.pause : ic.play}</button>
                <span className="tabular-nums">{fmtTime(time)} / {fmtTime(total)}</span>
                <span className="truncate">{sections[sel.part] ? `Part ${sel.part + 1}: ${sections[sel.part].title}` : ''}</span>
                <span className="flex-1" />
                {!hasFinal && partVideo && <span className="text-[var(--fg-4)]">Previewing part {sel.part + 1}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* right: inspector */}
        <div className="w-[300px] shrink-0 border-l border-[var(--line)] bg-[#0a0a0b] overflow-y-auto">
          <Production p={p} paused={paused} err={actErr} />
          {p?.plan && sections[sel.part] && <PartCard p={p} k={sel.part} sec={sections[sel.part]} dur={spans[sel.part]?.dur || 0} />}
          {p?.plan && curShot && <ShotCard p={p} sh={curShot} />}
          {p && (
            <div className="p-4 border-t border-[var(--line)] text-[12px] space-y-1.5">
              <div className="ui-eyebrow mb-2">Project</div>
              <Row k="Template" v={p.template_name} /><Row k="Length" v={`${p.minutes} min`} /><Row k="Narrator" v={tpl?.voices.find(v => v.id === p.voice)?.label || p.voice} />
              <Row k="Credits" v={cost ? `${cost.toLocaleString()}${p.status === 'awaiting_approval' || p.status === 'planning' ? ' on approval' : ''}` : '–'} />
              {p.plan?.description && <div className="pt-2 text-[var(--fg-3)] leading-snug">{p.plan.description}</div>}
            </div>
          )}
        </div>
      </div>

      {/* bottom: timeline */}
      <Timeline sections={sections} spans={spans} total={total} p={p} time={time} sel={sel} shotStart={shotStart}
        onSeek={seek} onPick={(k, j) => { setSel({ part: k, shot: j }); setTab('shots'); if (sections[k]?.shots[j]) seek(shotStart(k, sections[k].shots[j])); }} />
    </div>
  );
}

function Primary({ p, cost, busy, paused, onApprove, onResume }: { p: LongProject | null; cost: number; busy: string; paused: boolean; onApprove: () => void; onResume: () => void }) {
  if (!p) return null;
  if (p.status === 'completed' && p.final_video_url)
    return <a href={p.final_video_url} download className="ui-btn ui-btn-primary ui-btn-sm">{ic.dl}Download MP4</a>;
  if (p.status === 'awaiting_approval')
    return <button onClick={onApprove} disabled={!!busy} className="ui-btn ui-btn-primary ui-btn-sm">{busy ? 'Starting…' : `Approve & produce · ${cost.toLocaleString()} cr`}</button>;
  if (paused) return <button onClick={onResume} disabled={!!busy} className="ui-btn ui-btn-primary ui-btn-sm">{busy === 'resume' ? 'Resuming…' : 'Resume'}</button>;
  return <div className="flex items-center gap-2 text-[12px] text-[var(--fg-3)] pr-1"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />{Math.round((p.progress || 0) * 100)}%</div>;
}

function Production({ p, paused, err }: { p: LongProject | null; paused: boolean; err: string }) {
  if (!p) return <div className="p-4"><div className="h-20 rounded-lg bg-white/[0.04] animate-pulse" /></div>;
  const pct = Math.round((p.progress || 0) * 100);
  return (
    <div className="p-4 border-b border-[var(--line)]">
      <div className="flex items-center justify-between mb-2"><div className="ui-eyebrow">Production</div><div className="text-[11px] text-[var(--fg-4)] tabular-nums">{pct}%</div></div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden"><div className={`h-full rounded-full ${p.status === 'completed' ? 'bg-emerald-400' : 'bg-white'} transition-all duration-700`} style={{ width: `${pct}%` }} /></div>
      <div className="text-[12.5px] mt-2.5 leading-snug">{p.status === 'awaiting_approval' ? 'The plan is ready. Read the script, look at the shots, then approve to start production.' : p.message}</div>
      {paused && !p.error && <div className="text-[11.5px] text-amber-200/90 mt-2">Paused (the server restarted). Resume continues from the last finished step.</div>}
      {p.error && <div className="text-[11.5px] text-rose-300/90 mt-2 leading-snug">Stopped: {p.error}. Resume continues from the last finished step.</div>}
      {err && <div className="text-[11.5px] text-rose-300 mt-2">{err}</div>}
    </div>
  );
}

function PartCard({ p, k, sec, dur }: { p: LongProject; k: number; sec: LongSection; dur: number }) {
  const part = p.parts[k];
  const steps = [['Voice', !!part?.voice_url], ['Animation', part?.status === 'done' || !!part?.video_url], ['Render & sound', !!part?.video_url]] as const;
  const working = part?.status === 'working';
  return (
    <div className="p-4 border-b border-[var(--line)]">
      <div className="ui-eyebrow mb-1.5">Part {k + 1}</div>
      <div className="text-[13.5px] font-medium">{sec.title}</div>
      <div className="text-[11.5px] text-[var(--fg-4)] mt-0.5">{sec.lines.length} lines · {sec.shots.length} shots · {fmtTime(dur)}</div>
      {p.status !== 'planning' && p.status !== 'awaiting_approval' && (
        <div className="mt-3 space-y-1.5">
          {steps.map(([label, done], i) => {
            const active = working && !done && steps.slice(0, i).every(s => s[1]);
            return (
              <div key={label} className="flex items-center gap-2 text-[12px]">
                <span className={`w-4 h-4 rounded-full grid place-items-center ${done ? 'bg-emerald-400 text-black' : active ? 'border-2 border-white/25 border-t-white animate-spin' : 'border border-[var(--line-2)]'}`}>{done ? ic.check : null}</span>
                <span className={done ? 'text-[var(--fg-2)]' : active ? 'text-white' : 'text-[var(--fg-4)]'}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShotCard({ p, sh }: { p: LongProject; sh: LongShot }) {
  const cast = (sh.cast || []).map(c => String(c).replace(':', '_'));
  return (
    <div className="p-4 border-b border-[var(--line)] text-[12px]">
      <div className="ui-eyebrow mb-2">Shot</div>
      <Thumb url={p.assets[sh.place]?.url} className="w-full aspect-video rounded-md mb-2.5" label={sh.place === 'headline' ? 'HEADLINE CARD' : sh.place} />
      <div className="leading-snug">{sh.action}</div>
      {sh.text && <div className="mt-2"><span className="text-[var(--fg-4)]">On a sign: </span>{sh.text}</div>}
      {sh.marks && <div className="mt-1.5"><span className="text-[var(--fg-4)]">Marks: </span>{sh.marks}</div>}
      {cast.length > 0 && (
        <div className="flex gap-1.5 mt-3">{cast.map(c => <Thumb key={c} url={p.assets[c]?.url} className="w-12 h-16 rounded bg-white/[0.04]" contain title={c} />)}</div>
      )}
    </div>
  );
}

function Storyboard({ p, shot, line }: { p: LongProject; shot?: LongShot; line?: string }) {
  if (!shot) return <div className="absolute inset-0 bg-[#111]" />;
  if (shot.place === 'headline') return (
    <div className="absolute inset-0 grid place-items-center bg-[#5b3fa6]"><div className="text-white font-extrabold text-[3.2vw] tracking-tight uppercase text-center px-[8%]">{shot.text || line}</div></div>
  );
  const plate = p.assets[shot.place]?.url, cast = (shot.cast || []).map(c => String(c).replace(':', '_')).filter(c => p.assets[c]);
  return (
    <div className="absolute inset-0 bg-[#1a1b22]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {plate ? <img src={plate} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 grid place-items-center text-[12px] text-[var(--fg-4)]">The art for “{shot.place}” is drawn after you approve</div>}
      {cast.map((c, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={c} src={p.assets[c].url} alt="" className="absolute bottom-[4%] h-[62%] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.25)]" style={{ left: `${(i + 1) * 100 / (cast.length + 1)}%`, transform: 'translateX(-50%)' }} />
      ))}
      {line && <div className="absolute left-1/2 -translate-x-1/2 bottom-3 max-w-[80%] text-center text-[12.5px] text-white/90 bg-black/55 backdrop-blur px-3 py-1.5 rounded-md">“{line}”</div>}
    </div>
  );
}

function Assets({ p }: { p: LongProject }) {
  const plan = p.plan!;
  const groups: [string, { id: string; label: string }[], string][] = [
    ['Places', plan.places.map(x => ({ id: x.id, label: x.id })), 'aspect-video'],
    ['Cast', plan.cast.flatMap(c => c.poses.map((pose, n) => ({ id: `${c.id}_${n + 1}`, label: `${c.id} · ${pose}` }))), 'aspect-[3/4]'],
    ['Props', plan.props.map(x => ({ id: `prop_${x.id}`, label: x.id })), 'aspect-square'],
  ];
  return (
    <div className="p-3 space-y-5">
      {p.status === 'awaiting_approval' && <div className="text-[11.5px] text-[var(--fg-4)] px-1">The art is drawn after you approve: places first (the first one sets the style for all), then every pose and prop.</div>}
      {groups.map(([title, items, shape]) => items.length > 0 && (
        <div key={title}>
          <div className="ui-eyebrow mb-2 px-1">{title} <span className="text-[var(--fg-4)]">{items.filter(i => p.assets[i.id]).length}/{items.length}</span></div>
          <div className={`grid ${title === 'Places' ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
            {items.map(i => (
              <div key={i.id}>
                <Thumb url={p.assets[i.id]?.url} className={`w-full ${shape} rounded-md`} contain={title !== 'Places'} pending={p.status === 'producing' && !p.assets[i.id]} failed={!!p.art_errors?.[i.id]} />
                <div className="text-[10.5px] text-[var(--fg-4)] mt-1 truncate" title={i.label}>{i.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Thumb({ url, className, contain, label, pending, failed, title }: { url?: string; className: string; contain?: boolean; label?: string; pending?: boolean; failed?: boolean; title?: string }) {
  return (
    <div className={`relative overflow-hidden bg-white/[0.04] ${className}`} title={title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className={`absolute inset-0 w-full h-full ${contain ? 'object-contain p-1' : 'object-cover'}`} />
        : <div className={`absolute inset-0 grid place-items-center text-[9.5px] text-[var(--fg-4)] text-center px-1 ${pending ? 'animate-pulse' : ''}`}>{failed ? 'retry on resume' : label || ''}</div>}
    </div>
  );
}

function PlanSkeleton({ msg }: { msg?: string }) {
  return (
    <div className="p-4 space-y-3">
      <div className="text-[12px] text-[var(--fg-3)]">{msg || 'Writing the script and the shot plan'}…</div>
      {[0, 1, 2, 3].map(i => <div key={i} className="space-y-1.5"><div className="h-3 w-1/2 rounded bg-white/[0.06] animate-pulse" /><div className="h-2.5 w-full rounded bg-white/[0.04] animate-pulse" /><div className="h-2.5 w-4/5 rounded bg-white/[0.04] animate-pulse" /></div>)}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-3"><span className="text-[var(--fg-4)]">{k}</span><span className="text-right">{v}</span></div>;

function Timeline({ sections, spans, total, p, time, sel, shotStart, onSeek, onPick }: {
  sections: LongSection[]; spans: { start: number; dur: number }[]; total: number; p: LongProject | null; time: number; sel: { part: number; shot: number };
  shotStart: (k: number, sh: LongShot) => number; onSeek: (t: number) => void; onPick: (k: number, j: number) => void;
}) {
  const [zoom, setZoom] = useState(6);          // px per second
  const box = useRef<HTMLDivElement>(null);
  const fitted = useRef(0);
  useEffect(() => {                              // fit the whole video in view when its length changes
    if (!box.current || Math.abs(fitted.current - total) < 1) return;
    fitted.current = total; setZoom(Math.max(1.2, Math.min(24, (box.current.clientWidth - 24) / Math.max(10, total))));
  }, [total]);
  const W = Math.max(total * zoom, 600);
  const tick = total > 600 ? 60 : total > 240 ? 30 : 10;
  const click = (e: React.MouseEvent) => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); onSeek(Math.max(0, Math.min(total, (e.clientX - r.left) / zoom))); };
  const bars = (seed: number, n: number) => Array.from({ length: n }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453 % 1));
  return (
    <div className="h-[210px] shrink-0 border-t border-[var(--line)] bg-[#0a0a0b] flex flex-col">
      <div className="h-8 shrink-0 flex items-center gap-3 px-3 border-b border-[var(--line)] text-[11px] text-[var(--fg-4)]">
        <span>Timeline</span><span className="tabular-nums">{fmtTime(total)}</span><span className="flex-1" />
        <span>Zoom</span><input type="range" min={1.2} max={24} step={0.2} value={zoom} onChange={e => setZoom(+e.target.value)} className="w-28 accent-white" />
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="w-[88px] shrink-0 border-r border-[var(--line)] text-[11px] text-[var(--fg-3)]">
          <div className="h-5" />
          {['Parts', 'Shots', 'Voice', 'Music'].map(l => <div key={l} className="h-[38px] flex items-center px-3">{l}</div>)}
        </div>
        <div ref={box} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="relative" style={{ width: W }}>
            <div className="h-5 relative cursor-pointer" onClick={click}>
              {Array.from({ length: Math.floor(total / tick) + 1 }, (_, i) => (
                <div key={i} className="absolute top-0 h-full border-l border-[var(--line-2)] text-[9.5px] text-[var(--fg-4)] pl-1" style={{ left: i * tick * zoom }}>{fmtTime(i * tick)}</div>
              ))}
            </div>
            {/* parts */}
            <div className="h-[38px] relative">
              {sections.map((s, k) => {
                const part = p?.parts[k], st = part?.status || (p?.status === 'producing' ? 'waiting' : 'plan');
                return (
                  <button key={s.id} onClick={() => onPick(k, 0)} className={`absolute top-1 bottom-1 rounded-md px-2 text-left text-[11px] truncate border transition
                    ${st === 'done' ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-100' : st === 'working' ? 'bg-violet-400/15 border-violet-300/50 text-violet-100 tl-stripes' : 'bg-white/[0.05] border-[var(--line-2)] text-[var(--fg-2)]'}
                    ${sel.part === k ? 'ring-1 ring-white/60' : ''}`} style={{ left: spans[k].start * zoom + 1, width: Math.max(8, spans[k].dur * zoom - 2) }}>
                    {k + 1}. {s.title}
                  </button>
                );
              })}
            </div>
            {/* shots */}
            <div className="h-[38px] relative">
              {sections.map((s, k) => s.shots.map((sh, j) => {
                const a = shotStart(k, sh), b = j + 1 < s.shots.length ? shotStart(k, s.shots[j + 1]) : spans[k].start + spans[k].dur;
                const url = p?.assets[sh.place]?.url;
                return (
                  <button key={`${k}-${j}`} onClick={() => onPick(k, j)} title={sh.action}
                    className={`absolute top-1 bottom-1 rounded overflow-hidden border ${sel.part === k && sel.shot === j ? 'border-white' : 'border-black/60'} ${sh.place === 'headline' ? 'bg-[#5b3fa6]' : 'bg-[#23252e]'}`}
                    style={{ left: a * zoom, width: Math.max(4, (b - a) * zoom - 1), backgroundImage: url ? `url(${url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                );
              }))}
            </div>
            {/* voice */}
            <div className="h-[38px] relative">
              {sections.map((s, k) => {
                const has = !!p?.parts[k]?.voice_url, n = Math.max(4, Math.floor(spans[k].dur * zoom / 4));
                return (
                  <div key={s.id} className={`absolute top-1.5 bottom-1.5 rounded flex items-center gap-[2px] px-1 overflow-hidden ${has ? 'bg-sky-400/10' : 'border border-dashed border-[var(--line-2)]'}`} style={{ left: spans[k].start * zoom + 1, width: Math.max(8, spans[k].dur * zoom - 2) }}>
                    {has && bars(k + 1, n).map((h, i) => <span key={i} className="w-[2px] shrink-0 rounded bg-sky-300/70" style={{ height: `${h * 100}%` }} />)}
                  </div>
                );
              })}
            </div>
            {/* music */}
            <div className="h-[38px] relative"><div className="absolute top-2 bottom-2 left-0 rounded bg-amber-300/10 border border-amber-300/20 text-[10px] text-amber-200/70 px-2 flex items-center" style={{ width: total * zoom }}>Documentary bed · 10 dB under the voice</div></div>
            {/* playhead */}
            <div className="absolute top-0 bottom-0 w-px bg-white pointer-events-none" style={{ left: time * zoom }}><div className="w-2.5 h-2.5 -ml-[5px] rotate-45 bg-white" /></div>
          </div>
        </div>
      </div>
      <style jsx>{`.tl-stripes{background-image:repeating-linear-gradient(-45deg,rgba(167,139,250,.18) 0 8px,transparent 8px 16px);background-size:22px 22px;animation:tl 1s linear infinite}@keyframes tl{to{background-position:22px 0}}`}</style>
    </div>
  );
}
