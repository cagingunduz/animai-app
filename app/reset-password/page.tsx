'use client';

// The page the "Forgot Password" email link opens (signed in by the link): set a new password.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthShell, { Field, AuthInput, AuthButton, AuthNote } from '@/components/AuthShell';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (password !== again) { setError('The two passwords don’t match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message.includes('session') ? 'This link has expired. Ask for a new one from the sign-in page.' : error.message); return; }
    router.push('/dashboard'); router.refresh();
  };

  return (
    <AuthShell title="New password">
      <form onSubmit={save} className="flex flex-col">
        <Field label="New Password" hint={<span className="text-[13px] text-black/40">Min. 6 characters</span>}>
          <AuthInput icon="lock" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" autoComplete="new-password" />
        </Field>
        <div className="h-4" />
        <Field label="Repeat Password">
          <AuthInput icon="lock" type="password" value={again} onChange={e => setAgain(e.target.value)} required minLength={6} placeholder="••••••••" autoComplete="new-password" />
        </Field>
        {error && <div className="mt-4"><AuthNote>{error}</AuthNote></div>}
        <div className="mt-5"><AuthButton type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save and continue'}</AuthButton></div>
      </form>
      <p className="text-[14px] text-black/40 mt-5"><Link href="/login" className="text-black hover:underline underline-offset-4">Back to sign in</Link></p>
    </AuthShell>
  );
}
