'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 relative">
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none" />

      <div className="flex items-center gap-2.5 mb-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
          <polygon points="12,2 22,20 2,20" /><line x1="12" y1="8" x2="12" y2="15" /><circle cx="12" cy="17" r="0.5" fill="white" />
        </svg>
        <span className="text-lg font-semibold tracking-tight">AnimAI</span>
      </div>
      <p className="text-[rgba(255,255,255,0.4)] text-[15px] mb-8">Turn your ideas into animations</p>

      <div className="w-full max-w-[380px] bg-[#0a0a0a] border border-[rgba(255,255,255,0.07)] rounded-xl p-7">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[rgba(74,222,128,0.08)] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.7)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="text-[17px] font-semibold mb-2">Check your email</h2>
            <p className="text-[14px] text-[rgba(255,255,255,0.4)]">We sent a confirmation link to <strong className="text-white">{email}</strong></p>
          </div>
        ) : (
          <>
            <h2 className="text-[17px] font-semibold tracking-[-0.3px] mb-6">Create account</h2>

            <button onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-2.5 border border-[rgba(255,255,255,0.1)] rounded-lg text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.02)] transition-all mb-5">
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" /><span className="text-[12px] text-[rgba(255,255,255,0.2)]">or</span><div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            </div>

            <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[12px] text-[rgba(255,255,255,0.35)] block mb-1.5">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full px-3.5 py-2.5 bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-lg text-[14px] text-white placeholder:text-[rgba(255,255,255,0.2)] outline-none focus:border-[rgba(255,255,255,0.15)] transition-colors" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-[12px] text-[rgba(255,255,255,0.35)] block mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-lg text-[14px] text-white placeholder:text-[rgba(255,255,255,0.2)] outline-none focus:border-[rgba(255,255,255,0.15)] transition-colors" placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-[12px] text-[rgba(255,255,255,0.35)] block mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full px-3.5 py-2.5 bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-lg text-[14px] text-white placeholder:text-[rgba(255,255,255,0.2)] outline-none focus:border-[rgba(255,255,255,0.15)] transition-colors" placeholder="Min. 6 characters" />
              </div>
              {error && <p className="text-[13px] text-[rgba(248,113,113,0.8)] bg-[rgba(248,113,113,0.06)] px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-white text-black text-[14px] font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all mt-1">
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="text-[13px] text-[rgba(255,255,255,0.3)] mt-5 text-center">
              Already have an account? <Link href="/login" className="text-white hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </div>

      <a href="https://animai.com" className="mt-8 text-[13px] text-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.45)] transition-colors">← Back to animai.com</a>
    </div>
  );
}
