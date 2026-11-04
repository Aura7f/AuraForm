import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { FormBuilderView } from './components/builder/FormBuilderView';
import { FormResponderView } from './components/responder/FormResponderView';
import { ResponsesView } from './components/responses/ResponsesView';
import { AuthPage } from './components/auth/AuthPage';
import { NewFormModal } from './components/dashboard/NewFormModal';
import { Form } from './types';
import { formService } from './services/formService';

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

const FormFlowApp: React.FC = () => {
  const { user, authError } = useAuth();
  const [initialRoute] = useState(getRouteState);
  const [isSignInPage, setIsSignInPage] = useState(initialRoute.isSignInPage);
  const [currentView, setCurrentView] = useState<ViewMode>(initialRoute.currentView);
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
    const destination = new URL(returnTo, window.location.origin);
    if (destination.origin !== window.location.origin) {
      destination.href = window.location.origin;
    }
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

  // Fetch forms whenever user or currentView changes
  useEffect(() => {
    let isMounted = true;
    const fetchForms = async () => {
      setLoading(true);
      try {
        const data = await formService.getForms(user);
        if (isMounted) {
          setForms(data);
          setFormsError(null);
        }
      } catch (err) {
        console.error('Failed to load forms:', err);
        if (isMounted) {
          setForms([]);
          setFormsError(err instanceof Error ? err.message : 'Failed to load forms from the database.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchForms();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const loadForms = async () => {
    setLoading(true);
    try {
      const data = await formService.getForms(user);
      setForms(data);
      setFormsError(null);
    } catch (err) {
      console.error('Failed to load forms:', err);
      setForms([]);
      setFormsError(err instanceof Error ? err.message : 'Failed to load forms from the database.');
    } finally {
      setLoading(false);
    }
  };

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
    setSelectedFormId(formId);
    const found = await formService.getFormById(formId);
    if (found) {
      setActiveForm(found);
      setCurrentView('builder');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Inter',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenSignInPage={openSignInPage}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 AuraForm. Enterprise Forms & Event Management.</p>
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
        <FormFlowApp />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
