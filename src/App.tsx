import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { AdminDashboardPage, DashboardView } from './components/dashboard/DashboardView';
import { FormBuilderView } from './components/builder/FormBuilderView';
import { FormResponderView } from './components/responder/FormResponderView';
import { ResponsesView } from './components/responses/ResponsesView';
import { AuthPage } from './components/auth/AuthPage';
import { NewFormModal } from './components/dashboard/NewFormModal';
import { Form } from './types';
import { formService } from './services/formService';
import { getErrorMessage } from './utils/errors';

type ViewMode = 'dashboard' | 'builder' | 'responder' | 'responses';

const getRouteState = () => {
  const currentUrl = new URL(window.location.href);
  const isSignInPage = currentUrl.pathname.endsWith('/signin');
  const routeUrl = isSignInPage
    ? new URL(currentUrl.searchParams.get('next') || '/', window.location.origin)
    : currentUrl;
  const formId = routeUrl.searchParams.get('form');

  return {
    isSignInPage,
    currentView: (formId ? 'responder' : 'dashboard') as ViewMode,
    selectedFormId: formId
  };
};

const AuraFormApp: React.FC = () => {
  const { user, authError, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [initialRoute] = useState(() => getRouteState());
  const [isSignInPage, setIsSignInPage] = useState(initialRoute.isSignInPage);
  const [currentView, setCurrentView] = useState<ViewMode>(initialRoute.currentView);
  const [adminDashboardPage, setAdminDashboardPage] = useState<AdminDashboardPage>('home');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(initialRoute.selectedFormId);
  const [activeForm, setActiveForm] = useState<Form | null>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [formsError, setFormsError] = useState<string | null>(null);

  const [isNewFormModalOpen, setIsNewFormModalOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteState();
      setIsSignInPage(route.isSignInPage);
      setCurrentView(route.currentView);
      setSelectedFormId(route.selectedFormId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openSignInPage = () => {
    const returnTo = isSignInPage
      ? new URLSearchParams(window.location.search).get('next') || '/'
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.pushState({}, '', `/signin?next=${encodeURIComponent(returnTo)}`);
    setIsSignInPage(true);
  };

  const returnFromSignInPage = () => {
    const returnTo = new URLSearchParams(window.location.search).get('next') || '/';
    const requested = new URL(returnTo, window.location.origin);
    const destination =
      requested.origin === window.location.origin ? requested : new URL('/', window.location.origin);
    const routePath = `${destination.pathname}${destination.search}${destination.hash}`;
    window.history.replaceState({}, '', routePath);
    setIsSignInPage(false);
    const formId = destination.searchParams.get('form');
    setSelectedFormId(formId);
    setCurrentView(formId ? 'responder' : 'dashboard');
  };

  useEffect(() => {
    if (user && isSignInPage) returnFromSignInPage();
  }, [user, isSignInPage]);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await formService.getForms(user);
      setForms(data);
      setFormsError(null);
    } catch (error) {
      console.error('Failed to load forms:', error);
      setForms([]);
      setFormsError(getErrorMessage(error, 'Failed to load forms from the database.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const handleNavigate = (view: string, formId?: string) => {
    setIsSignInPage(false);
    if (formId) setSelectedFormId(formId);
    setCurrentView(view as ViewMode);
    if (view === 'dashboard') {
      // Clear URL query param if returning to dashboard
      window.history.replaceState({}, '', window.location.pathname);
      loadForms();
    }
  };

  const handleOpenBuilder = async (formId: string) => {
    try {
      const found = await formService.getFormById(formId);
      if (!found) {
        showToast('This form could not be opened. It may have been deleted.', 'error');
        return;
      }
      setSelectedFormId(formId);
      setActiveForm(found);
      setCurrentView('builder');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to open the form.'), 'error');
    }
  };

  const handleOpenResponder = (formId: string) => {
    setIsSignInPage(false);
    setSelectedFormId(formId);
    setCurrentView('responder');
    window.history.replaceState({}, '', `${window.location.pathname}?form=${encodeURIComponent(formId)}`);
  };

  const handleOpenResponses = (formId: string) => {
    setIsSignInPage(false);
    setSelectedFormId(formId);
    setCurrentView('responses');
  };

  const handleFormCreated = (created: Form) => {
    setIsSignInPage(false);
    setActiveForm(created);
    setSelectedFormId(created.id);
    setCurrentView('builder');
    loadForms();
  };

  if (isSignInPage) {
    return <AuthPage onBack={returnFromSignInPage} />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="text-xs text-slate-500">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSignInPage={openSignInPage}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {authError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {authError}
          </div>
        )}

        {loading && currentView === 'dashboard' ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading forms and registrations...</p>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <DashboardView
                forms={forms}
                loadError={formsError}
                currentUser={user}
                adminPage={adminDashboardPage}
                onAdminPageChange={setAdminDashboardPage}
                onOpenFormBuilder={handleOpenBuilder}
                onOpenFormResponder={handleOpenResponder}
                onOpenResponses={handleOpenResponses}
                onOpenNewFormModal={() => setIsNewFormModalOpen(true)}
                onRefreshForms={loadForms}
              />
            )}

            {currentView === 'builder' && activeForm && (
              <FormBuilderView
                form={activeForm}
                currentUser={user}
                onBack={() => handleNavigate('dashboard')}
                onPreview={handleOpenResponder}
                onViewResponses={handleOpenResponses}
                onUpdated={updated => {
                  setActiveForm(updated);
                  loadForms();
                }}
              />
            )}

            {currentView === 'responder' && selectedFormId && (
              <FormResponderView
                formId={selectedFormId}
                onBack={() => handleNavigate('dashboard')}
                onRequestSignIn={openSignInPage}
              />
            )}

            {currentView === 'responses' && selectedFormId && (
              <ResponsesView
                formId={selectedFormId}
                onBack={() => handleNavigate('dashboard')}
                onOpenForm={handleOpenResponder}
                onEditForm={handleOpenBuilder}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="AuraForm" className="h-5 w-5 object-contain" />
            <p>© 2026 AuraForm. Enterprise Forms & Event Management.</p>
          </div>
          <p className="flex items-center gap-2">
            <span>React + TypeScript + Vite</span>
            <span>•</span>
            <span>Supabase Cloud / Local Store</span>
          </p>
        </div>
      </footer>

      <NewFormModal
        isOpen={isNewFormModalOpen}
        onClose={() => setIsNewFormModalOpen(false)}
        onFormCreated={handleFormCreated}
      />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuraFormApp />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
