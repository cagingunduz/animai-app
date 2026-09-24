'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell, { GoogleIcon, OrDivider, Field } from '@/components/AuthShell';

export default function LoginPage() {
  const router = useRouter();

  // Client-side mobile fallback (in case middleware is bypassed)
  useEffect(() => {
    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) &&
        !/iPad/i.test(navigator.userAgent)) {
      router.replace('/mobile');
    }
  }, []);
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
    router.refresh();
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <AuthShell footer={<a href="https://animai.com" className="hover:text-white transition-colors">← Back to animai.com</a>}>
      <h1 className="text-[30px] font-semibold tracking-[-0.045em] leading-tight mb-2">Welcome back</h1>
      <p className="text-[14px] text-[var(--fg-3)] mb-8">Sign in to keep creating.</p>

      <button onClick={handleGoogle} className="ui-btn ui-btn-secondary ui-btn-lg w-full">
        <GoogleIcon />Continue with Google
      </button>

      <OrDivider />

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="ui-input" placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="ui-input" placeholder="••••••••" autoComplete="current-password" />
        </Field>

        {error && (
          <p className="text-[12.5px] text-[#ff8a8a] bg-[rgba(255,90,90,0.06)] border border-[rgba(255,90,90,0.15)] px-3 py-2.5 rounded-lg">{error}</p>
        )}

        <button type="submit" disabled={loading} className="ui-btn ui-btn-primary ui-btn-lg w-full mt-2">
          {loading ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-black/20 border-t-black animate-spin" />Signing in…</> : 'Sign in'}
        </button>
      </form>

      <p className="text-[13px] text-[var(--fg-3)] mt-8">
        New to Animave?{' '}
        <Link href="/signup" className="text-white font-medium underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors">Create an account</Link>
      </p>
    </AuthShell>
  );
}
