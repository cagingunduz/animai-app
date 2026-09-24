'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell, { GoogleIcon, OrDivider, Field } from '@/components/AuthShell';

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

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <AuthShell footer={<a href="https://animai.com" className="hover:text-white transition-colors">← Back to animai.com</a>}>
      {sent ? (
        <div>
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center mb-6 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
          </div>
          <h1 className="text-[30px] font-semibold tracking-[-0.045em] leading-tight mb-2">Check your inbox</h1>
          <p className="text-[14px] text-[var(--fg-3)] leading-relaxed">We sent a confirmation link to <span className="text-white font-medium">{email}</span>. Open it to activate your account.</p>
          <Link href="/login" className="ui-btn ui-btn-secondary ui-btn-lg w-full mt-8">Back to sign in</Link>
        </div>
      ) : (
        <>
          <h1 className="text-[30px] font-semibold tracking-[-0.045em] leading-tight mb-2">Create your account</h1>
          <p className="text-[14px] text-[var(--fg-3)] mb-8">Start with 500 free credits on signup.</p>

          <button onClick={handleGoogle} className="ui-btn ui-btn-secondary ui-btn-lg w-full">
            <GoogleIcon />Continue with Google
          </button>

          <OrDivider />

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <Field label="Full name">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="ui-input" placeholder="Jane Doe" autoComplete="name" />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="ui-input" placeholder="you@example.com" autoComplete="email" />
            </Field>
            <Field label="Password" hint={<span className="text-[11px] text-[var(--fg-4)]">Min. 6 characters</span>}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="ui-input" placeholder="••••••••" autoComplete="new-password" />
            </Field>
            {error && <p className="text-[12.5px] text-[#ff8a8a] bg-[rgba(255,90,90,0.06)] border border-[rgba(255,90,90,0.15)] px-3 py-2.5 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading} className="ui-btn ui-btn-primary ui-btn-lg w-full mt-2">
              {loading ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-black/20 border-t-black animate-spin" />Creating account…</> : 'Create account'}
            </button>
          </form>

          <p className="text-[13px] text-[var(--fg-3)] mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-white font-medium underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors">Sign in</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
