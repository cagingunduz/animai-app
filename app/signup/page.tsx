'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell, { Field, AuthInput, AuthButton, SocialRow, AuthNote } from '@/components/AuthShell';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  // Google's own button on our page: its ID token signs in to Supabase directly
  const handleCredential = async (token: string, nonce: string) => {
    setError('');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce });
    if (error) { setError(error.message); return; }
    try { localStorage.setItem('animave-remember', '1'); sessionStorage.setItem('animave-alive', '1'); } catch { /* storage blocked */ }
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
    <AuthShell title={sent ? 'Check your inbox' : 'Sign up'} footer={<a href="https://animave.com" className="hover:text-black transition-colors">← Back to animave.com</a>}>
      {sent ? (
        <div>
          <p className="text-[15px] text-black/60 leading-relaxed">We sent a confirmation link to <span className="text-black font-semibold">{email}</span>. Open it to activate your account.</p>
          <div className="mt-5"><Link href="/login"><AuthButton type="button">Back to sign in</AuthButton></Link></div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSignup} className="flex flex-col">
            <Field label="Full Name">
              <AuthInput icon="user" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" autoComplete="name" />
            </Field>
            <div className="h-4" />
            <Field label="Email Address">
              <AuthInput icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" />
            </Field>
            <div className="h-4" />
            <Field label="Password" hint={<span className="text-[13px] text-black/40">Min. 6 characters</span>}>
              <AuthInput icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" autoComplete="new-password" />
            </Field>
            {error && <div className="mt-4"><AuthNote>{error}</AuthNote></div>}
            <div className="mt-5">
              <AuthButton type="submit" disabled={loading}>
                {loading ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating account…</> : 'Create account'}
              </AuthButton>
            </div>
          </form>
          <p className="text-[14px] text-black/40 mt-5">Start with 500 free credits.</p>
          <p className="text-[14px] text-black/40 mt-1.5">
            Already have an account?{' '}
            <Link href="/login" className="text-black hover:underline underline-offset-4">Sign in</Link>
          </p>
          <SocialRow onGoogle={handleGoogle} onCredential={handleCredential} />
        </>
      )}
    </AuthShell>
  );
}
