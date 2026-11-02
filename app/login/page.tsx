'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell, { Field, AuthInput, Checkbox, AuthButton, SocialRow, AuthNote } from '@/components/AuthShell';
import { REMEMBER_KEY, ALIVE_KEY } from '@/lib/remember';


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
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setNote('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    try { localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'); sessionStorage.setItem(ALIVE_KEY, '1'); } catch { /* storage blocked */ }
    router.push('/dashboard');
    router.refresh();
  };

  // Google's own button on our page: its ID token signs in to Supabase directly
  const handleCredential = async (token: string, nonce: string) => {
    setError('');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce });
    if (error) { setError(error.message); return; }
    try { localStorage.setItem(REMEMBER_KEY, '1'); sessionStorage.setItem(ALIVE_KEY, '1'); } catch { /* storage blocked */ }
    router.push('/dashboard');
    router.refresh();
  };

  const handleGoogle = async () => {
    try { localStorage.setItem(REMEMBER_KEY, '1'); } catch { /* storage blocked */ }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleForgot = async () => {
    setError(''); setNote('');
    if (!email.trim()) { setError('Enter your email address above, then press Forgot Password.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) { setError(error.message); return; }
    setNote(`We sent a link to ${email.trim()} to set a new password.`);
  };

  return (
    <AuthShell title="Sign in" footer={<a href="https://animave.com" className="hover:text-black transition-colors">← Back to animave.com</a>}>
      <form onSubmit={handleLogin} className="flex flex-col">
        <Field label="Email Address">
          <AuthInput icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            placeholder="you@example.com" autoComplete="email" />
        </Field>
        <div className="h-4" />
        <Field label="Password">
          <AuthInput icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            placeholder="••••••••" autoComplete="current-password" />
        </Field>

        <div className="mt-4"><Checkbox checked={remember} onChange={setRemember} label="Remember me" /></div>

        {error && <div className="mt-4"><AuthNote>{error}</AuthNote></div>}
        {note && <div className="mt-4"><AuthNote tone="ok">{note}</AuthNote></div>}

        <div className="mt-5">
          <AuthButton type="submit" disabled={loading}>
            {loading ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Signing in…</> : 'Sign in'}
          </AuthButton>
        </div>
      </form>

      <p className="text-[14px] text-black/40 mt-5">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-black hover:underline underline-offset-4">Sign up</Link>
      </p>
      <button type="button" onClick={handleForgot} className="block text-[14px] text-black mt-1.5 hover:underline underline-offset-4">Forgot Password</button>

      <SocialRow onGoogle={handleGoogle} onCredential={handleCredential} />
    </AuthShell>
  );
}
