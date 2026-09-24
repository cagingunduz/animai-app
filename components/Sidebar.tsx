'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { FORMATS } from '@/components/FormatArt';

const Icon = {
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9v11.5h13V9" /><path d="M10 20.5v-6h4v6" /></svg>,
  create: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" /></svg>,
  billing: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19M6.5 15h3" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  logout: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></svg>,
  bolt: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>,
};

const navItems = [
  { label: 'Home', href: '/dashboard', icon: Icon.home },
  { label: 'Create', href: '/create', icon: Icon.create },
  { label: 'Billing', href: '/billing', icon: Icon.billing },
];

function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState('free');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');
      const { data } = await supabase.from('users').select('credits, plan').eq('id', user.id).single();
      if (data) { setCredits(data.credits); if (data.plan) setPlan(data.plan); }
    })();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const activeMode = pathname === '/create' ? searchParams.get('mode') : null;
  const isActive = (href: string) =>
    href === '/create' ? pathname === '/create' && !activeMode : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* ── Desktop ── */}
      <aside className="hidden md:flex flex-col w-[240px] h-screen fixed left-0 top-0 z-40 bg-black border-r border-[var(--line)]">
        <div className="h-[60px] flex items-center px-5">
          <Link href="/dashboard" className="rounded-md"><Logo size={22} /></Link>
        </div>

        <div className="px-3 pt-1 pb-4">
          <Link href="/create" className="ui-btn ui-btn-primary w-full">
            {Icon.plus}New video
          </Link>
        </div>

        <nav className="px-3 flex flex-col gap-px">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`relative flex items-center gap-3 h-9 px-3 rounded-[10px] text-[13px] transition-colors ${active ? 'bg-white/[0.07] text-white' : 'text-[var(--fg-3)] hover:text-white hover:bg-white/[0.035]'}`}>
                {active && <span className="absolute -left-3 top-2 bottom-2 w-[2px] rounded-r bg-white" />}
                {item.icon}{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 pt-7 pb-2 ui-eyebrow">Formats</div>
        <nav className="px-3 flex flex-col gap-px">
          {FORMATS.map(f => {
            const active = activeMode === f.key;
            return (
              <Link key={f.key} href={`/create?mode=${f.key}`}
                className={`group flex items-center gap-3 h-8 px-3 rounded-[10px] text-[12.5px] transition-colors ${active ? 'bg-white/[0.07] text-white' : 'text-[var(--fg-3)] hover:text-white hover:bg-white/[0.035]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${active ? 'bg-white' : 'bg-white/20 group-hover:bg-white/60'}`} />
                <span className="flex-1 truncate">{f.title}</span>
                {f.badge === 'New' && <span className="text-[9.5px] font-mono uppercase tracking-wider text-white/35">new</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-3 flex flex-col gap-2">
          {/* Credits */}
          <div className="ui-card !rounded-[14px] p-3.5 relative overflow-hidden">
            <div className="absolute inset-0 ui-dots-bg opacity-40 ui-fade-mask pointer-events-none" />
            <div className="relative flex items-center justify-between mb-2">
              <span className="ui-eyebrow">Credits</span>
              <span className="ui-chip ui-chip-muted !h-[18px] !text-[9.5px] capitalize">{plan}</span>
            </div>
            <div className="relative flex items-end justify-between">
              <span className="text-[22px] font-semibold tracking-[-0.04em] tabular-nums leading-none">
                {credits === null ? <span className="inline-block w-16 h-5 rounded ui-shimmer" /> : credits.toLocaleString()}
              </span>
              <Link href="/billing" className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--fg-2)] hover:text-white transition-colors">
                {Icon.bolt}Top up
              </Link>
            </div>
          </div>

          {/* Account */}
          <div className="flex items-center gap-2.5 h-11 px-2 rounded-[12px] hover:bg-white/[0.035] transition-colors group">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white to-[#8a8a8a] text-black flex items-center justify-center text-[11.5px] font-semibold uppercase flex-shrink-0">
              {email ? email[0] : ''}
            </div>
            <div className="flex-1 min-w-0 text-[12px] text-[var(--fg-2)] truncate">{email || <span className="inline-block w-24 h-3 rounded ui-shimmer" />}</div>
            <button onClick={handleSignOut} title="Sign out" aria-label="Sign out"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--fg-4)] hover:text-white hover:bg-white/[0.06] transition-colors">
              {Icon.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 h-14 bg-[#0a0a0a]/85 backdrop-blur-xl border border-[var(--line-2)] rounded-2xl z-40 flex items-center justify-around px-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-colors ${active ? 'text-white' : 'text-[var(--fg-4)]'}`}>
              {item.icon}<span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default function Sidebar() {
  return <Suspense><SidebarInner /></Suspense>;
}
