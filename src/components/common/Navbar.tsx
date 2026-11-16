import React, { useEffect, useRef, useState } from 'react';
import { LogOut, LogIn, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth, DESIGNATED_ADMIN_EMAIL } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errors';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenSignInPage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenSignInPage }) => {
  const { user, signOut, isRealSession, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowUserMenu(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      showToast('Profile refreshed from the database.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to refresh your profile.'), 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    try {
      await signOut();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to sign out.'), 'error');
    }
  };

  const isDesignatedAdmin = user?.email.toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase();
  const isAdminDashboard = user?.role === 'admin' && currentView === 'dashboard';
  const userInitials = user?.fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(namePart => namePart.charAt(0).toUpperCase())
    .join('') || user?.email.charAt(0).toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className={`w-full px-4 ${isAdminDashboard ? '' : 'mx-auto max-w-7xl sm:px-6 lg:px-8'}`}>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="group flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm transition group-hover:border-teal-300">
                <img src="/logo.png" alt="" className="h-full w-full rounded-lg object-contain" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900">AuraForm</span>
                <p className="hidden text-xs text-slate-500 sm:block">Forms & Event Registrations</p>
              </div>
            </button>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                aria-current={currentView === 'dashboard' ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  currentView === 'dashboard'
                    ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                Dashboard
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setShowUserMenu(open => !open)}
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                  className="flex items-center justify-center rounded-full border border-teal-200 bg-teal-50 p-1.5 transition hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold tracking-wide text-white">
                    {userInitials}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSignInPage}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-50"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              )}

              {showUserMenu && user && (
                <div
                  role="menu"
                  aria-label="Profile options"
                  className="animate-in fade-in slide-in-from-top-1 absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-700 text-sm font-bold tracking-wide text-white">
                        {userInitials}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="break-words text-sm font-bold leading-5 text-slate-900">{user.fullName}</p>
                      </div>
                      {isRealSession && (
                        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                          Live Auth
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-nowrap text-[11px] leading-4 text-slate-500">{user.email}</p>

                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Account role</p>
                          <p className="mt-0.5 truncate text-xs font-bold capitalize text-slate-800">{user.role}</p>
                        </div>
                      </div>
                      {isRealSession && (
                        <button
                          type="button"
                          onClick={handleRefreshProfile}
                          disabled={refreshing}
                          title="Refresh role from the database"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-teal-300 hover:text-teal-800 disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                          <span>Sync</span>
                        </button>
                      )}
                    </div>

                    {isDesignatedAdmin && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2.5 text-xs font-medium leading-4 text-teal-800">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Designated primary administrator
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50/70 p-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
