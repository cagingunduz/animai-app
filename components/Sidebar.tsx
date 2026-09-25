'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import Logo from '@/components/Logo';
import { FORMATS, FormatIcon } from '@/components/FormatArt';

const s = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const Icon = {
  home: <svg {...s}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9v11.5h13V9" /></svg>,
  create: <svg {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9.5 4.5 2.5-4.5 2.5z" /></svg>,
  editor: <svg {...s}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 14h18M9 14v6M15 14v6" /></svg>,
  billing: <svg {...s}><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  logout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></svg>,
};

const navItems = [
  { label: 'Home', href: '/dashboard', icon: Icon.home },
  { label: 'Create', href: '/create', icon: Icon.create },
  { label: 'Editor', href: '/editor', icon: Icon.editor },
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

  const row = (active: boolean) =>
    `flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] transition-colors ${active ? 'bg-white/[0.07] text-white' : 'text-[var(--fg-3)] hover:text-[var(--fg)] hover:bg-white/[0.04]'}`;

  return (
    <>
      <aside className="hidden md:flex flex-col w-[220px] h-screen fixed left-0 top-0 z-40 bg-black border-r border-[var(--line)]">
        <div className="h-12 flex items-center px-4">
          <Link href="/dashboard"><Logo size={18} /></Link>
        </div>

        <div className="px-3 pb-3">
          <Link href="/create" className="ui-btn ui-btn-secondary w-full !justify-start">{Icon.plus}New video</Link>
        </div>

        <nav className="px-3 flex flex-col gap-px">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className={row(isActive(item.href))}>
              {item.icon}{item.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 pt-6 pb-1.5 text-[11px] font-medium text-[var(--fg-4)]">Formats</div>
        <nav className="px-3 flex flex-col gap-px">
          {FORMATS.map(f => (
            <Link key={f.key} href={`/create?mode=${f.key}`} className={row(activeMode === f.key)}>
              <FormatIcon k={f.key} size={15} />{f.title}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-[var(--line)] p-3 flex flex-col gap-1">
          <Link href="/billing" className="flex items-center justify-between h-8 px-2.5 rounded-md hover:bg-white/[0.04] transition-colors">
            <span className="text-[12px] text-[var(--fg-3)]">Credits</span>
            <span className="text-[12px] tabular-nums text-[var(--fg)]">
              {credits === null ? '—' : credits.toLocaleString()}
              <span className="text-[var(--fg-4)] capitalize"> · {plan}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2.5 h-9 px-2.5 rounded-md">
            <div className="w-5 h-5 rounded-full bg-[var(--surface-3)] border border-[var(--line-2)] text-[10px] font-medium uppercase flex items-center justify-center text-[var(--fg-2)] flex-shrink-0">
              {email ? email[0] : ''}
            </div>
            <div className="flex-1 min-w-0 text-[12px] text-[var(--fg-3)] truncate">{email}</div>
            <button onClick={handleSignOut} title="Sign out" aria-label="Sign out"
              className="w-6 h-6 rounded flex items-center justify-center text-[var(--fg-4)] hover:text-white transition-colors">
              {Icon.logout}
            </button>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-black border-t border-[var(--line)] z-40 flex items-center justify-around">
        {navItems.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-1 px-3 ${isActive(item.href) ? 'text-white' : 'text-[var(--fg-4)]'}`}>
            {item.icon}<span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function Sidebar() {
  return <Suspense><SidebarInner /></Suspense>;
}
