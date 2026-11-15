import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  UserRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthPageProps {
  onBack: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBack }) => {
  const { signInWithEmailPassword, signUpWithEmailPassword, signInWithGoogle, isSupabaseLive, authError } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const needsConfirmation = await signUpWithEmailPassword(email, password, fullName);
        if (needsConfirmation) {
          setNotice(`Account created. Check ${email} for the confirmation link, then sign in.`);
          setLoading(false);
        }
      } else {
        await signInWithEmailPassword(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setNotice(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f5f0] px-5 py-16 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-brand-100/80 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-sand-200/70 blur-3xl" />
      </div>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to app"
        className="absolute right-5 top-5 z-10 inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-white/80 px-3 text-xs font-medium text-brand-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-[#f3f5f0] sm:right-8 sm:top-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-2xl border border-white bg-white/95 p-6 shadow-[0_24px_70px_rgba(33,61,46,0.14)] ring-1 ring-brand-900/[0.04] transition-shadow duration-300 hover:shadow-[0_28px_80px_rgba(33,61,46,0.18)] sm:p-8">
              <div className="mb-7">
                <div className="mb-5 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-brand-50 shadow-sm ring-1 ring-brand-200/70">
                  <img src="/auraform-icon.png" alt="AuraForm" className="h-full w-full object-contain" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-700">Welcome to AuraForm</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-teal-900 sm:text-4xl">
                  {isSignUp ? 'Create your account' : 'Sign in to continue'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {isSignUp
                    ? 'Create an account to respond to forms. Organizer access is assigned by the administrator.'
                    : 'Enter your email and password to access AuraForm.'}
                </p>
              </div>

              <div className="mb-6 flex rounded-xl bg-sand-100 p-1.5">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); setNotice(null); }}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${!isSignUp ? 'bg-brand-700 text-white shadow-sm' : 'text-sand-600 hover:bg-white/70 hover:text-brand-800'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); setNotice(null); }}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 ${isSignUp ? 'bg-brand-700 text-white shadow-sm' : 'text-sand-600 hover:bg-white/70 hover:text-brand-800'}`}
                >
                  Create account
                </button>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading || !isSupabaseLive}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-sand-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.64 5.93c4.46-4.13 7.14-10.2 7.14-17.58Z" />
                  <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.87l-7.64-5.93c-2.13 1.43-4.86 2.28-8.27 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                </svg>
                {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </button>

              {!isSupabaseLive && (
                <div role="alert" className="mb-4 rounded-xl border border-sand-300 bg-sand-100 px-3.5 py-3 text-xs leading-5 text-sand-700">
                  Sign-in is not configured yet. Add your Supabase credentials and enable email authentication to continue.
                </div>
              )}
              {(error || authError) && (
                <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error || authError}
                </div>
              )}
              {notice && (
                <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-800">
                  {notice}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Full name</span>
                    <span className="relative block">
                      <UserRound aria-hidden="true" className="pointer-events-none absolute left-3.5 top-0 bottom-0 my-auto h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={event => setFullName(event.target.value)}
                        placeholder="Your name"
                        className="box-border h-12 w-full rounded-xl border border-sand-300 bg-white py-0 pl-10 pr-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-50"
                      />
                    </span>
                  </label>
                )}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</span>
                  <span className="relative block">
                    <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-0 bottom-0 my-auto h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="box-border h-12 w-full rounded-xl border border-sand-300 bg-white py-0 pl-10 pr-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-50"
                    />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">Password</span>
                  <span className="relative block">
                    <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-0 bottom-0 my-auto h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      minLength={6}
                      required
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                      className="box-border h-12 w-full rounded-xl border border-sand-300 bg-white py-0 pl-10 pr-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-50"
                    />
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={loading || !isSupabaseLive}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(41,76,58,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-[0_10px_22px_rgba(41,76,58,0.24)] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

            </div>

      </div>
    </main>
  );
};
