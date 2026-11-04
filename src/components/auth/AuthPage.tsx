import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  Sparkles,
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
    <main className="min-h-screen bg-white flex flex-col lg:flex-row">
      <section className="relative hidden lg:flex lg:w-[54%] xl:w-[58%] min-h-screen flex-col justify-between overflow-hidden bg-slate-950 px-12 py-10 xl:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_14%,rgba(20,184,166,0.28),transparent_42%),radial-gradient(ellipse_at_90%_88%,rgba(13,148,136,0.22),transparent_38%)]" />
        <div className="absolute -right-36 top-1/4 h-[30rem] w-[30rem] rounded-full border border-white/10" />
        <div className="absolute -right-20 top-[30%] h-[22rem] w-[22rem] rounded-full border border-white/10" />

        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-950 shadow-lg shadow-teal-950/40">
            <img src="/auraform-icon.png" alt="" className="h-full w-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight">AuraForm</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-xs font-medium text-teal-200">
            <Sparkles className="h-3.5 w-3.5" />
            A clearer way to collect responses
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
            Bring every form
            <br />
            and response together.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Create thoughtful forms, manage registrations, and understand every response in one simple workspace.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {['Easy form creation', 'Secure sign-in', 'Live response insights', 'Event registrations'].map(feature => (
              <div key={feature} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-slate-200">
                <Check className="h-4 w-4 shrink-0 text-teal-300" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          Secure access for your forms, teams, and respondents.
        </p>
      </section>

      <section className="flex min-h-screen flex-1 flex-col bg-slate-50 lg:bg-white">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end lg:px-10">
          <div className="flex items-center gap-2 text-slate-900 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-950">
              <img src="/auraform-icon.png" alt="" className="h-full w-full object-cover" />
            </div>
            <span className="font-bold tracking-tight">AuraForm</span>
          </div>
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to app"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8 lg:px-12">
          <div className="relative z-10 w-full max-w-[420px]">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 rounded-2xl border border-[#dcebe5] bg-[#f7fbf9] p-5 shadow-sm sm:p-7">
              <div className="mb-7">
                <div className="mb-5 hidden h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-teal-900/10 lg:flex">
                  <img src="/auraform-icon.png" alt="" className="h-full w-full object-cover" />
                </div>
                <p className="text-sm font-semibold text-teal-700">Welcome to AuraForm</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {isSignUp ? 'Create your account' : 'Sign in to continue'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {isSignUp
                    ? 'Create an account to respond to forms. Organizer access is assigned by the administrator.'
                    : 'Enter your email and password to access AuraForm.'}
                </p>
              </div>

              <div className="mb-6 flex rounded-xl bg-[#eaf3f0] p-1">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); setNotice(null); }}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${!isSignUp ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); setNotice(null); }}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${isSignUp ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Create account
                </button>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading || !isSupabaseLive}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">
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
                        className="box-border h-12 w-full rounded-xl border border-[#d6e5df] bg-[#f7fbf9] py-0 pl-10 pr-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50"
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
                      className="box-border h-12 w-full rounded-xl border border-[#d6e5df] bg-[#f7fbf9] py-0 pl-10 pr-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50"
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
                      className="box-border h-12 w-full rounded-xl border border-[#d6e5df] bg-[#f7fbf9] py-0 pl-10 pr-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50"
                    />
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={loading || !isSupabaseLive}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Your credentials are protected by Supabase authentication.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
