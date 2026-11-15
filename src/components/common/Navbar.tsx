import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  LogOut,
  LogIn,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth, DESIGNATED_ADMIN_EMAIL } from '../../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, formId?: string) => void;
  onOpenSignInPage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenSignInPage
}) => {
  const {
    user,
    signOut,
    isRealSession,
    refreshUser
  } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm transition group-hover:border-teal-300">
                <img src="/auraform-icon.png" alt="AuraForm" className="w-full h-full rounded-lg object-contain" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                  AuraForm
                </span>
                <p className="text-xs text-slate-500 hidden sm:block">Forms & Event Registrations</p>
              </div>
            </button>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  currentView === 'dashboard'
                    ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </button>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* User Profile / Persona Switcher */}
            <div className="relative">
              {user ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="Open profile menu"
                  aria-expanded={showUserMenu}
                  className="flex items-center justify-center p-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-semibold text-xs border border-teal-300">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                </button>
              ) : (
                <button
                  onClick={onOpenSignInPage}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-teal-800 bg-white border border-slate-300 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {showUserMenu && user && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1"
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.fullName}</p>
                      {isRealSession && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Live Auth
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                          Role: {user.role}
                        </span>
                      </div>
                      {isRealSession && (
                        <button
                          onClick={handleRefreshProfile}
                          disabled={refreshing}
                          className="text-[10px] text-slate-400 hover:text-teal-700 flex items-center gap-0.5 transition"
                          title="Refresh role from Supabase database"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? 'animate-spin' : ''}`} />
                          <span>Sync</span>
                        </button>
                      )}
                    </div>

                    {user.email.toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase() && (
                      <div className="mt-1.5 px-2 py-1 bg-teal-50 border border-teal-200 rounded text-[10px] text-teal-800 font-medium">
                        ⭐ Designated Primary Administrator
                      </div>
                    )}
                  </div>

                  {/* Sign out */}
                  <div className="pt-1 px-1">
                    <button
                      onClick={() => {
                        signOut();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
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
