import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, ChevronRight, Clock3, FileText, RefreshCw, Search, ShieldCheck, UserMinus, Users } from 'lucide-react';
import { Form, OrganizerAccessRequest, UserProfile } from '../../types';
import { formService } from '../../services/formService';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errors';

type MemberManagementView = 'organizers' | 'requests';

interface MemberManagementProps {
  view: MemberManagementView;
  forms: Form[];
  onOpenResponses: (formId: string) => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({ view, forms, onOpenResponses }) => {
  const [organizers, setOrganizers] = useState<UserProfile[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<OrganizerAccessRequest[]>([]);
  const [organizerSearch, setOrganizerSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadAccessData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [members, accessRequests] = await Promise.all([
        formService.listMembers(),
        view === 'requests' ? formService.getOrganizerAccessRequests() : Promise.resolve([])
      ]);
      setOrganizers(members.filter(member => member.role === 'organizer'));
      if (view === 'requests') setRequests(accessRequests);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load organizer access.');
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedOrganizer(null);
    void loadAccessData();
  }, [view]);

  const handleRemoveOrganizer = async (organizer: UserProfile) => {
    setWorkingId(organizer.id);
    try {
      await formService.setMemberRole(organizer.id, 'user');
      setOrganizers(current => current.filter(member => member.id !== organizer.id));
      setSelectedOrganizer(null);
      showToast(`${organizer.fullName} no longer has organizer access.`, 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to remove organizer access.'), 'error');
    } finally {
      setWorkingId(null);
    }
  };

  const handleReviewRequest = async (request: OrganizerAccessRequest, approve: boolean) => {
    setWorkingId(request.id);
    try {
      await formService.reviewOrganizerAccessRequest(request.id, approve);
      setRequests(current => current.map(item => item.id === request.id
        ? { ...item, status: approve ? 'approved' : 'rejected', reviewedAt: new Date().toISOString() }
        : item
      ));
      showToast(approve ? 'Organizer access approved.' : 'Organizer access request rejected.', 'success');
      if (approve) {
        try {
          const members = await formService.listMembers();
          setOrganizers(members.filter(member => member.role === 'organizer'));
        } catch (error) {
          showToast(getErrorMessage(error, 'Access was approved, but the organizer list could not be refreshed.'), 'error');
        }
      }
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to review organizer access request.'), 'error');
    } finally {
      setWorkingId(null);
    }
  };

  const isRequestsView = view === 'requests';
  const organizerQuery = organizerSearch.trim().toLowerCase();
  const filteredOrganizers = organizers.filter(organizer => (
    !organizerQuery ||
    organizer.fullName.toLowerCase().includes(organizerQuery) ||
    organizer.email.toLowerCase().includes(organizerQuery)
  ));
  const selectedOrganizerForms = selectedOrganizer
    ? forms
      .filter(form => form.createdBy === selectedOrganizer.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    : [];
  const requestQuery = requestSearch.trim().toLowerCase();
  const filteredRequests = requests.filter(request => (
    !requestQuery || [
      request.requesterName,
      request.requesterEmail,
      request.status
    ].some(value => value?.toLowerCase().includes(requestQuery))
  ));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        {selectedOrganizer && !isRequestsView ? (
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setSelectedOrganizer(null)}
              className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All organizers
            </button>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Users className="h-4 w-4 text-teal-600" />
              {selectedOrganizer.fullName}
            </h2>
            <p className="mt-1 truncate text-xs text-slate-500">{selectedOrganizer.email}</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                {isRequestsView
                  ? <Clock3 className="h-4 w-4 text-teal-600" />
                  : <Users className="h-4 w-4 text-teal-600" />}
                {isRequestsView ? 'Organizer Requests' : 'Organizers'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {isRequestsView
                  ? 'Review requests from users who want organizer access.'
                  : 'View and manage users with organizer access.'}
              </p>
            </div>
          </>
        )}
        {selectedOrganizer && !isRequestsView ? (
          <button
            type="button"
            onClick={() => void handleRemoveOrganizer(selectedOrganizer)}
            disabled={workingId === selectedOrganizer.id}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:self-auto"
          >
            <UserMinus className="h-3.5 w-3.5" />
            {workingId === selectedOrganizer.id ? 'Removing...' : 'Remove organizer'}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <label className="relative w-44">
              <span className="sr-only">Search {isRequestsView ? 'organizer requests' : 'organizers'}</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={isRequestsView ? requestSearch : organizerSearch}
                onChange={event => {
                  if (isRequestsView) setRequestSearch(event.target.value);
                  else setOrganizerSearch(event.target.value);
                }}
                placeholder={isRequestsView ? 'Search requests...' : 'Search organizers...'}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadAccessData()}
              disabled={loading}
              aria-label={`Refresh ${isRequestsView ? 'organizer requests' : 'organizers'}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        )}
      </header>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
            <p className="text-sm text-slate-500">Loading {isRequestsView ? 'requests' : 'organizers'}...</p>
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-semibold">Could not load {isRequestsView ? 'requests' : 'organizers'}</p>
            <p className="mt-1 break-words">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadAccessData()}
              className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        ) : !isRequestsView && selectedOrganizer ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Forms created</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Forms created by {selectedOrganizer.fullName}.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {selectedOrganizerForms.length} form{selectedOrganizerForms.length === 1 ? '' : 's'}
              </span>
            </div>
            {selectedOrganizerForms.length > 0 ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {selectedOrganizerForms.map(form => (
                  <article key={form.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-teal-600" />
                        <button
                          type="button"
                          onClick={() => onOpenResponses(form.id)}
                          aria-label={`View details for ${form.title}`}
                          className="inline-flex max-w-full items-center gap-1 text-left text-sm font-semibold text-slate-900 transition hover:text-teal-700"
                        >
                          <span className="break-words">{form.title}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        </button>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          form.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : form.status === 'draft'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {form.status}
                        </span>
                      </div>
                      {form.description && (
                        <p className="mt-2 text-xs leading-5 text-slate-500">{form.description}</p>
                      )}
                      {form.settings.isEvent && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          {form.settings.eventDate && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5 text-teal-600" />
                              {new Date(form.settings.eventDate).toLocaleDateString('en-GB')}
                            </span>
                          )}
                          {form.settings.eventVenue && <span>{form.settings.eventVenue}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-4 text-xs text-slate-500 sm:pt-0.5">
                      <span>Created {new Date(form.createdAt).toLocaleDateString('en-GB')}</span>
                      <span>{form.responseCount || 0} responses</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
                <p className="text-sm font-semibold text-slate-800">No forms created</p>
                <p className="mt-1 text-xs text-slate-500">This organizer has not created any forms yet.</p>
              </div>
            )}
          </div>
        ) : isRequestsView ? (
          <>
            <div className="divide-y divide-slate-100">
              {filteredRequests.map(request => (
                <div key={request.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {request.requesterName || request.requesterEmail || 'AuraForm user'}
                    </p>
                    <p className="truncate text-xs text-slate-500">{request.requesterEmail}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Requested {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {request.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleReviewRequest(request, true)}
                          disabled={workingId === request.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReviewRequest(request, false)}
                          disabled={workingId === request.id}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        request.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {request.status === 'approved' ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {request.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-800">No requests yet</p>
                  <p className="mt-1 text-xs text-slate-500">New organizer access requests will appear here.</p>
                </div>
              )}
              {requests.length > 0 && filteredRequests.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold text-slate-800">No matching requests</p>
                  <p className="mt-1 text-xs text-slate-500">Try another name, email, or status.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrganizers.map(organizer => (
              <div key={organizer.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedOrganizer(organizer)}
                    aria-label={`View ${organizer.fullName}'s profile`}
                    className="inline-flex max-w-full items-center gap-1 text-left text-sm font-semibold text-slate-800 transition hover:text-teal-700"
                  >
                    <span className="truncate">{organizer.fullName}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                  <p className="truncate text-xs text-slate-500">{organizer.email}</p>
                </div>
              </div>
            ))}
            {organizers.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-800">No organizers yet</p>
                <p className="mt-1 text-xs text-slate-500">Approving a request will add an organizer to this list.</p>
              </div>
            )}
            {organizers.length > 0 && filteredOrganizers.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-slate-800">No matching organizers</p>
                <p className="mt-1 text-xs text-slate-500">Try another name or email.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
