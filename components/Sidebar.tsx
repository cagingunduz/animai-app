'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { label: 'Create', href: '/create', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> },
  { label: 'Billing', href: '/billing', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');
      const { data } = await supabase.from('users').select('credits').eq('id', user.id).single();
      if (data) setCredits(data.credits);
    })();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-[220px] h-screen border-r border-zinc-200 bg-white fixed left-0 top-0 z-40 text-[#151515]">
        <div className="h-14 flex items-center px-5 border-b border-zinc-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#151515] text-white flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polygon points="12,2 22,20 2,20"/><line x1="12" y1="8" x2="12" y2="15"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>
            </span>
            <span className="text-[14px] font-semibold tracking-[-0.3px]">AnimAI</span>
          </Link>
        </div>

        <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all ${active ? 'bg-[#fff0f6] text-[#e91e6f] font-semibold' : 'text-zinc-500 hover:text-[#151515] hover:bg-zinc-50'}`}>
                {item.icon}{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2.5 pb-3 border-t border-zinc-200 pt-3">
          <div className="px-3 py-2 mb-1 rounded-xl bg-[#fafafa] border border-zinc-200">
            <div className="text-[12px] text-zinc-700 truncate">{email || 'Loading...'}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{credits.toLocaleString()} credits</div>
          </div>
          <button onClick={handleSignOut}
            className="w-full text-left px-3 py-1.5 text-[12px] text-zinc-400 hover:text-[#151515] transition-colors rounded-lg hover:bg-zinc-50">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-xl border-t border-zinc-200 z-40 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${active ? 'text-[#e91e6f]' : 'text-zinc-400'}`}>
              {item.icon}<span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
