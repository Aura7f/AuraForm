import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  List,
  Star,
  Users,
  Search,
  Plus,
  Share2,
  Eye,
  BarChart2,
  Copy,
  Trash2,
  Clock,
  MapPin,
  Lock,
  Globe,
  MoreVertical,
  CheckCircle2,
  UploadCloud,
  RefreshCw
} from 'lucide-react';
import { Form, UserProfile } from '../../types';
import { formService } from '../../services/formService';
import { useToast } from '../../context/ToastContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getErrorMessage } from '../../utils/errors';
import { buildFormUrl } from '../../utils/links';
import { MemberManagement } from './MemberManagement';
import { OrganizerAccessRequest } from './OrganizerAccessRequest';

type FormFilter = 'all' | 'published' | 'draft' | 'closed' | 'events';
export type AdminDashboardPage = 'home' | 'forms' | 'favorites' | 'organizers' | 'requests';

const ADMIN_NAVIGATION = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'forms', label: 'Forms List', icon: List },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'organizers', label: 'Organizers', icon: Users },
  { id: 'requests', label: 'Requests', icon: Clock }
] as const;

const FILTER_TABS: { id: FormFilter; label: string }[] = [
  { id: 'all', label: 'All Forms' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'closed', label: 'Closed' },
  { id: 'events', label: 'Events' }
];

const formatCardDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface DashboardViewProps {
  forms: Form[];
  loadError: string | null;
  currentUser: UserProfile | null;
  adminPage: AdminDashboardPage;
  onAdminPageChange: (page: AdminDashboardPage) => void;
  onOpenFormBuilder: (formId: string) => void;
  onOpenFormResponder: (formId: string) => void;
  onOpenResponses: (formId: string) => void;
  onOpenNewFormModal: () => void;
  onRefreshForms: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  forms,
  loadError,
  currentUser,
  adminPage,
  onAdminPageChange,
  onOpenFormBuilder,
  onOpenFormResponder,
  onOpenResponses,
  onOpenNewFormModal,
  onRefreshForms
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FormFilter>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [adminMenuExpanded, setAdminMenuExpanded] = useState(true);
  const [favoriteFormIds, setFavoriteFormIds] = useState<string[]>([]);
  const [adminFormSearch, setAdminFormSearch] = useState('');
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const canManageForms = currentUser?.role === 'admin' || currentUser?.role === 'organizer';
  const visibleForms = useMemo(
    () => canManageForms ? forms : forms.filter(form => form.status === 'published'),
    [canManageForms, forms]
  );
  const favoritesStorageKey = currentUser?.id ? `auraform:${currentUser.id}:favorite-forms` : null;

  useEffect(() => {
    if (!activeMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveMenuId(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId]);

  useEffect(() => {
    if (!favoritesStorageKey) {
      setFavoriteFormIds([]);
      return;
    }

    try {
      const savedFavorites = window.localStorage.getItem(favoritesStorageKey);
      if (!savedFavorites) {
        setFavoriteFormIds([]);
        return;
      }

      const parsed: unknown = JSON.parse(savedFavorites);
      if (!Array.isArray(parsed) || parsed.some(id => typeof id !== 'string')) {
        throw new Error('Saved favorites have an invalid format.');
      }
      setFavoriteFormIds(parsed);
    } catch (error) {
      setFavoriteFormIds([]);
      showToast(getErrorMessage(error, 'Could not load your favorite forms.'), 'error');
    }
  }, [favoritesStorageKey]);

  const handleSeedStarterForms = async () => {
    if (!currentUser) return;
    setSeeding(true);
    try {
      const result = await formService.seedStarterFormsToSupabase(currentUser);
      showToast(result.message, result.success ? 'success' : 'error');
      if (result.success) onRefreshForms();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to seed starter forms.'), 'error');
    } finally {
      setSeeding(false);
    }
  };

  // Stats calculation
  const totalSubmissions = useMemo(() => {
    return visibleForms.reduce((acc, form) => acc + (form.responseCount || 0), 0);
  }, [visibleForms]);

  const activeEventsCount = useMemo(() => {
    return visibleForms.filter(form => form.settings.isEvent).length;
  }, [visibleForms]);

  const filteredForms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return visibleForms.filter(form => {
      const matchesSearch =
        !query ||
        form.title.toLowerCase().includes(query) ||
        form.description.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (filterType === 'events') return form.settings.isEvent;
      if (filterType !== 'all') return form.status === filterType;
      return true;
    });
  }, [visibleForms, searchQuery, filterType]);

  const recentAdminForms = useMemo(
    () => forms
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 5),
    [forms]
  );

  const sortedAdminForms = useMemo(
    () => forms
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [forms]
  );

  const toggleFavorite = (formId: string) => {
    if (!favoritesStorageKey) return;
    const nextFavorites = favoriteFormIds.includes(formId)
      ? favoriteFormIds.filter(id => id !== formId)
      : [...favoriteFormIds, formId];

    try {
      window.localStorage.setItem(favoritesStorageKey, JSON.stringify(nextFavorites));
      setFavoriteFormIds(nextFavorites);
    } catch (error) {
      showToast(getErrorMessage(error, 'Could not save this favorite form.'), 'error');
    }
  };

  const handleDuplicate = async (formId: string) => {
    if (!currentUser) return;
    try {
      const duplicated = await formService.duplicateForm(formId, currentUser);
      showToast(`Duplicated as "${duplicated.title}".`, 'success');
      onRefreshForms();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to duplicate form.'), 'error');
    }
  };

  const handleDelete = async (formId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await formService.deleteForm(formId);
      showToast('Form deleted successfully.', 'success');
      onRefreshForms();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to delete form.'), 'error');
    }
  };

  const handleCopyShareLink = async (formId: string) => {
    const url = buildFormUrl(formId);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Shareable form link copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy the link. Copy it from the address bar instead.', 'error');
    }
  };

  if (currentUser?.role === 'admin') {
    const adminForms = adminPage === 'home'
      ? recentAdminForms
      : adminPage === 'favorites'
        ? sortedAdminForms.filter(form => favoriteFormIds.includes(form.id))
        : sortedAdminForms;
    const isAccessPage = adminPage === 'organizers' || adminPage === 'requests';
    const visibleAdminForms = adminPage === 'forms'
      ? adminForms.filter(form => {
        const query = adminFormSearch.trim().toLowerCase();
        return !query || form.title.toLowerCase().includes(query);
      })
      : adminForms;
    const pageTitle = {
      home: 'Home',
      forms: 'Forms List',
      favorites: 'Favorites',
      organizers: 'Organizers',
      requests: 'Organizer Requests'
    }[adminPage];
    const pageDescription = {
      home: 'Your 5 most recently created forms.',
      forms: 'All forms in your workspace.',
      favorites: 'Forms you have saved for quick access.',
      organizers: 'Manage users with organizer access.',
      requests: 'Review organizer access requests.'
    }[adminPage];

    return (
      <div className={`min-h-full pb-24 lg:pb-0 ${
        adminMenuExpanded ? 'lg:pl-60' : 'lg:pl-20'
      }`}>
        <aside className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white text-slate-700 shadow-lg transition-[width] duration-200 lg:inset-x-auto lg:bottom-12 lg:left-0 lg:top-16 lg:z-30 lg:flex lg:flex-col lg:rounded-none lg:rounded-r-2xl lg:border-l-0 lg:border-t-0 ${
          adminMenuExpanded ? 'lg:w-60' : 'lg:w-20'
        }`}>
          <div className={`hidden h-[68px] items-center border-b border-slate-100 lg:flex ${
            adminMenuExpanded ? 'justify-start px-4' : 'justify-center px-2'
          }`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <img src="/logo.png" alt="" className="h-full w-full object-contain" />
              </span>
              {adminMenuExpanded && <span className="truncate text-sm font-bold text-slate-800">AuraForm</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdminMenuExpanded(expanded => !expanded)}
            aria-label={adminMenuExpanded ? 'Collapse navigation menu' : 'Expand navigation menu'}
            aria-expanded={adminMenuExpanded}
            className="absolute right-0 top-5 z-10 hidden h-8 w-8 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 lg:flex"
          >
            {adminMenuExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <nav
            aria-label="Admin dashboard"
            className="grid grid-cols-5 gap-1 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:flex lg:flex-1 lg:flex-col lg:p-3"
          >
            {ADMIN_NAVIGATION.map(item => {
              const Icon = item.icon;
              const isActive = adminPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAdminPageChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition lg:flex-row lg:py-3 lg:text-sm ${
                    adminMenuExpanded ? 'lg:justify-start lg:gap-3 lg:px-3 lg:text-left' : 'lg:justify-center lg:px-2'
                  } ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 lg:h-5 lg:w-5 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span className={`max-w-full truncate lg:text-sm ${adminMenuExpanded ? 'lg:inline' : 'lg:hidden'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          {!isAccessPage && (
            <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
                <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {adminPage === 'forms' && (
                  <>
                    <label className="relative w-full sm:w-44">
                      <span className="sr-only">Search forms</span>
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={adminFormSearch}
                        onChange={event => setAdminFormSearch(event.target.value)}
                        placeholder="Search forms..."
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      />
                    </label>
                    <span className="self-center text-xs text-slate-400" aria-live="polite">
                      {visibleAdminForms.length}/{adminForms.length}
                    </span>
                  </>
                )}
                {isSupabaseConfigured() && (
                  <button
                    type="button"
                    onClick={handleSeedStarterForms}
                    disabled={seeding}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    title="Adds starter forms only when the database has no forms yet"
                  >
                    <UploadCloud className={`h-3.5 w-3.5 text-teal-600 ${seeding ? 'animate-pulse' : ''}`} />
                    {seeding ? 'Syncing...' : 'Add Starter Forms'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenNewFormModal}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-95 sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  Create New Form
                </button>
              </div>
            </header>
          )}

          {adminPage === 'home' && (
            <section aria-label="Dashboard overview">
              <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:grid-cols-4">
                {[
                  {
                    label: 'Total Forms',
                    value: forms.length,
                    detail: 'Across your workspace',
                    icon: FileText,
                    iconClass: 'bg-teal-100 text-teal-700'
                  },
                  {
                    label: 'Published Forms',
                    value: forms.filter(form => form.status === 'published').length,
                    detail: 'Available to respondents',
                    icon: Globe,
                    iconClass: 'bg-emerald-100 text-emerald-700'
                  },
                  {
                    label: 'Submissions',
                    value: totalSubmissions,
                    detail: 'Responses collected',
                    icon: BarChart2,
                    iconClass: 'bg-sky-100 text-sky-700'
                  },
                  {
                    label: 'Draft Forms',
                    value: forms.filter(form => form.status === 'draft').length,
                    detail: 'Not published yet',
                    icon: Clock,
                    iconClass: 'bg-amber-100 text-amber-700'
                  }
                ].map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      key={metric.label}
                      className={`min-w-0 px-3 py-4 sm:px-5 ${
                        index % 2 === 1 ? 'border-l border-slate-200' : ''
                      } ${
                        index > 1 ? 'border-t border-slate-200 lg:border-t-0' : ''
                      } ${
                        index > 0 ? 'lg:border-l lg:border-slate-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">{metric.label}</h2>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.iconClass}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <div>
                        <p className="text-3xl font-bold tracking-tight text-slate-900">{metric.value}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{metric.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {loadError && (
            <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Could not load forms from the database</p>
                <p className="mt-0.5">{loadError}</p>
              </div>
              <button
                type="button"
                onClick={onRefreshForms}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {adminPage === 'organizers' || adminPage === 'requests' ? (
            <MemberManagement view={adminPage} forms={forms} onOpenResponses={onOpenResponses} />
          ) : (
            <section aria-label={adminPage === 'home' ? 'Recent forms' : adminPage === 'favorites' ? 'Favorite forms' : 'All forms'}>
              {visibleAdminForms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center shadow-sm">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    {adminPage === 'favorites'
                      ? <Star className="h-5 w-5" />
                      : <FileText className="h-5 w-5" />}
                  </span>
                  <h2 className="mt-4 text-base font-semibold text-slate-900">
                    {adminPage === 'favorites'
                      ? 'No favorite forms yet'
                      : adminPage === 'forms' && adminForms.length > 0
                        ? 'No forms match this search'
                        : 'No forms to display'}
                  </h2>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    {adminPage === 'favorites'
                      ? 'Save a form with its star button and it will be easy to find here.'
                      : adminPage === 'forms' && adminForms.length > 0
                        ? 'Try another form name or clear the search.'
                        : 'Create your first form to start collecting responses and registrations.'}
                  </p>
                  {adminPage === 'favorites' ? (
                    <button
                      type="button"
                      onClick={() => onAdminPageChange('forms')}
                      className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Browse forms
                    </button>
                  ) : adminPage === 'forms' && adminForms.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setAdminFormSearch('')}
                      className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Clear search
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenNewFormModal}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Form
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {visibleAdminForms.map(form => {
                    const isFavorite = favoriteFormIds.includes(form.id);
                    return (
                      <article key={form.id} className="relative rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-teal-300 hover:shadow-md">
                        <button
                          type="button"
                          onClick={() => onOpenResponses(form.id)}
                          aria-label={`Open responses for ${form.title}`}
                          className="w-full cursor-pointer rounded-xl p-4 pr-14 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 sm:p-5"
                        >
                          <h2 className="break-words text-base font-semibold text-slate-900">{form.title}</h2>
                          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Created</p>
                              <p className="mt-1 text-sm text-slate-700">{formatCardDate(form.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Expires</p>
                              <p className="mt-1 text-sm text-slate-700">
                                {form.settings.deadline ? formatCardDate(form.settings.deadline) : 'No expiry'}
                              </p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(form.id)}
                          aria-label={`${isFavorite ? 'Remove' : 'Add'} ${form.title} ${isFavorite ? 'from' : 'to'} favorites`}
                          aria-pressed={isFavorite}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          <Star className={`h-4 w-4 ${isFavorite ? 'fill-teal-500 text-teal-600' : ''}`} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-900">Form & Event Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {currentUser
              ? `Signed in as ${currentUser.fullName} (${currentUser.role})`
              : 'Viewing publicly available published forms'}
          </p>
        </div>

        {canManageForms && (
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={onOpenNewFormModal}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Form</span>
            </button>
          </div>
        )}
        {currentUser?.role === 'user' && <OrganizerAccessRequest />}
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <p className="font-semibold">Could not load forms from the database</p>
            <p className="mt-0.5">{loadError}</p>
            <p className="mt-1 text-xs text-rose-600">
              Check that the Supabase project is running and that the URL and API key configured in Vercel are correct.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshForms}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Forms</span>
            <FileText className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{visibleForms.length}</p>
          <span className="mt-1 block text-xs text-slate-400">Active across all categories</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Responses</span>
            <Users className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalSubmissions}</p>
          <span className="mt-1 block text-xs text-slate-400">Submissions & registrations</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Events</span>
            <Calendar className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeEventsCount}</p>
          <span className="mt-1 block text-xs text-slate-400">Open event registrations</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Role Access</span>
            <CheckCircle2 className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-lg font-bold capitalize text-slate-900">{currentUser?.role || 'Guest'}</p>
          <span className="mt-1 block text-xs text-slate-400">
            {currentUser?.role === 'organizer' ? 'Can create & manage own forms' : 'Public respondent view'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-stretch justify-between gap-3 pt-2 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative w-full flex-1 md:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search forms by title, keyword, or description..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {FILTER_TABS.filter(tab => canManageForms || (tab.id !== 'draft' && tab.id !== 'closed')).map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === tab.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No forms found</h3>
          <p className="mx-auto mb-4 mt-1 max-w-sm text-xs text-slate-500">
            {searchQuery
              ? `No forms match your search query "${searchQuery}". Try clearing the search filter.`
              : 'No forms are currently available under this category.'}
          </p>
          {canManageForms && (
            <button
              onClick={onOpenNewFormModal}
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              Create your first form
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map(form => {
            const isOwnerOrEditor = Boolean(
              canManageForms &&
                (currentUser?.role === 'admin' ||
                  form.createdBy === currentUser?.id ||
                  form.collaborators?.some(
                    collaborator =>
                      collaborator.role === 'editor' &&
                      (collaborator.userEmail === currentUser?.email ||
                        collaborator.userId === currentUser?.id)
                  ))
            );
            const canDeleteForm = form.createdBy === currentUser?.id;

            return (
              <div
                key={form.id}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Form Card Top Content */}
                <div className="p-5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Status Pill */}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          form.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : form.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {form.status}
                      </span>

                      {/* Event Badge */}
                      {form.settings.isEvent && (
                        <span className="flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                          <Calendar className="w-2.5 h-2.5" />
                          Event
                        </span>
                      )}

                      {/* Public / Private Pill */}
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        {form.settings.isPublic ? (
                          <Globe className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Lock className="w-3 h-3 text-slate-400" />
                        )}
                      </span>
                    </div>

                    {/* Action Dropdown Toggle */}
                    {isOwnerOrEditor && (
                      <div className="relative" ref={activeMenuId === form.id ? actionMenuRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === form.id ? null : form.id)}
                          aria-label={`Open actions for ${form.title}`}
                          aria-expanded={activeMenuId === form.id}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuId === form.id && (
                          <div className="animate-in fade-in absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                            <button
                              onClick={() => {
                                handleDuplicate(form.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Duplicate Form</span>
                            </button>
                            <button
                              onClick={() => {
                                handleCopyShareLink(form.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Copy Share Link</span>
                            </button>
                            {canDeleteForm && (
                              <>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDelete(form.id, form.title);
                                    setActiveMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete Form</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Form Title & Description */}
                  <button
                    type="button"
                    onClick={() => (isOwnerOrEditor ? onOpenFormBuilder(form.id) : onOpenFormResponder(form.id))}
                    className="line-clamp-1 block w-full text-left text-base font-bold text-slate-900 transition group-hover:text-teal-700"
                  >
                    {form.title}
                  </button>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {form.description || 'No description provided.'}
                  </p>

                  {/* Event Metadata (Date, Venue) */}
                  {form.settings.isEvent && (
                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      {form.settings.eventDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{formatCardDate(form.settings.eventDate)}</span>
                        </div>
                      )}
                      {form.settings.eventVenue && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{form.settings.eventVenue}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer with Response Count & Quick Buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {form.responseCount || 0} response{(form.responseCount || 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Share Button */}
                    <button
                      onClick={() => handleCopyShareLink(form.id)}
                      title="Copy Public Link"
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {/* View Respondent Form */}
                    <button
                      onClick={() => onOpenFormResponder(form.id)}
                      title="Open Public Form"
                      className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Analytics / Responses */}
                    {isOwnerOrEditor && (
                      <button
                        onClick={() => onOpenResponses(form.id)}
                        title="View Responses & Analytics"
                        className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Open Builder */}
                    {isOwnerOrEditor && (
                      <button
                        onClick={() => onOpenFormBuilder(form.id)}
                        className="ml-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
