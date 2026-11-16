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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                  className="flex items-center justify-center rounded-full border border-slate-200 p-1.5 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-teal-300 bg-teal-100 text-xs font-semibold text-teal-800">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      user.fullName.charAt(0).toUpperCase()
                    )}
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
                  className="animate-in fade-in slide-in-from-top-1 absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white py-2 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-slate-900">{user.fullName}</p>
                      {isRealSession && (
                        <span className="rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          Live Auth
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <div className="mt-1 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                          Role: {user.role}
                        </span>
                      </div>
                      {isRealSession && (
                        <button
                          type="button"
                          onClick={handleRefreshProfile}
                          disabled={refreshing}
                          title="Refresh role from the database"
                          className="flex items-center gap-0.5 text-[10px] text-slate-400 transition hover:text-teal-700 disabled:opacity-50"
                        >
                          <RefreshCw className={`h-2.5 w-2.5 ${refreshing ? 'animate-spin' : ''}`} />
                          <span>Sync</span>
                        </button>
                      )}
                    </div>

                    {isDesignatedAdmin && (
                      <div className="mt-1.5 flex items-center gap-1.5 rounded border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-medium text-teal-800">
                        <ShieldCheck className="h-3 w-3" />
                        Designated primary administrator
                      </div>
                    )}
                  </div>

                  <div className="px-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
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
