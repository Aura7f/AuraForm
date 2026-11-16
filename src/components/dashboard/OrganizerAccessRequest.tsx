import React, { useEffect, useState } from 'react';
import { Clock3, RefreshCw, UserRoundPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formService } from '../../services/formService';
import { OrganizerAccessRequest as OrganizerAccessRequestData } from '../../types';
import { getErrorMessage } from '../../utils/errors';

export const OrganizerAccessRequest: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [accessRequest, setAccessRequest] = useState<OrganizerAccessRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refreshRequest = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const request = await formService.getMyOrganizerAccessRequest(user.id);
      setAccessRequest(request);
      if (request?.status === 'approved') await refreshUser();
    } catch (error) {
      showToast(getErrorMessage(error, 'Could not load your organizer access request.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshRequest();
  }, [user?.id]);

  const handleRequestAccess = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const requestId = await formService.requestOrganizerAccess();
      setAccessRequest({
        id: requestId,
        userId: user.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewedAt: null
      });
      showToast('Your organizer access request was sent to the admin.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to request organizer access.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = accessRequest?.status === 'pending';
  const isRejected = accessRequest?.status === 'rejected';

  return (
    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
      {accessRequest && (
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${
          isPending
            ? 'bg-amber-50 text-amber-800'
            : isRejected
              ? 'bg-slate-100 text-slate-600'
              : 'bg-emerald-50 text-emerald-700'
        }`}>
          {isPending ? <Clock3 className="h-3.5 w-3.5" /> : null}
          {isPending ? 'Request pending' : isRejected ? 'Request declined' : 'Request approved'}
        </span>
      )}

      {accessRequest?.status === 'approved' ? (
        <button
          type="button"
          onClick={() => void refreshRequest()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh access
        </button>
      ) : (
        <>
          {accessRequest && (
            <button
              type="button"
              onClick={() => void refreshRequest()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh status
            </button>
          )}
          {!isPending && (
            <button
              type="button"
              onClick={() => void handleRequestAccess()}
              disabled={loading || submitting}
              className="inline-flex items-center gap-2 rounded-lg border border-teal-700 bg-white px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserRoundPlus className="h-3.5 w-3.5" />
              {submitting ? 'Sending...' : isRejected ? 'Request again' : 'Request organizer access'}
            </button>
          )}
        </>
      )}
    </div>
  );
};
