import React, { useEffect, useState } from 'react';
import { Mail, Trash2, UserPlus, Users, X } from 'lucide-react';
import { Form, CollaboratorRole } from '../../types';
import { formService } from '../../services/formService';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../utils/errors';
import { isValidEmail } from '../../utils/validation';

interface CollaboratorModalProps {
  form: Form;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedForm: Form) => void;
}

export const CollaboratorModal: React.FC<CollaboratorModalProps> = ({
  form,
  isOpen,
  onClose,
  onUpdated
}) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('editor');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setRole('editor');
    setLoading(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      showToast('Enter a valid email address.', 'error');
      return;
    }

    setLoading(true);
    try {
      const collaborator = await formService.addCollaborator(form.id, cleanEmail, role);
      onUpdated({ ...form, collaborators: [...(form.collaborators || []), collaborator] });
      showToast(`Added ${collaborator.userEmail} as ${role}.`, 'success');
      setEmail('');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to add collaborator.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (collaboratorId: string, collaboratorEmail: string) => {
    try {
      await formService.removeCollaborator(form.id, collaboratorId);
      onUpdated({
        ...form,
        collaborators: (form.collaborators || []).filter(c => c.id !== collaboratorId)
      });
      showToast(`Removed ${collaboratorEmail}.`, 'info');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to remove collaborator.'), 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-3 py-4 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collaborators-title"
        className="animate-in fade-in zoom-in-95 relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id="collaborators-title" className="text-base font-bold text-slate-900">
                Manage Form Collaborators
              </h2>
              <p className="text-xs text-slate-500">Allow other organizers to edit or view this form</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {/* Add form */}
          <form onSubmit={handleAdd} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">Invite Organizer by Email</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="organizer@college.edu"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <select
                value={role}
                onChange={e => setRole(e.target.value as CollaboratorRole)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs focus:outline-none sm:w-auto"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-1 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Current Collaborators List */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Active Collaborators
            </h3>

            {/* Form Creator Row */}
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs mb-2">
              <div>
                <span className="font-semibold text-slate-900 block">
                  {form.creatorProfile?.fullName || 'Form Creator'}
                </span>
                <span className="text-slate-500 text-[11px]">
                  {form.creatorProfile?.email || 'Owner'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold text-[10px] uppercase">
                Owner
              </span>
            </div>

            {/* List */}
            {(!form.collaborators || form.collaborators.length === 0) ? (
              <p className="text-xs text-slate-400 italic text-center py-3">
                No external collaborators invited yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {form.collaborators.map(c => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{c.userEmail}</p>
                      <span className="text-[10px] text-teal-700 font-semibold uppercase">
                        Role: {c.role}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(c.id, c.userEmail)}
                      className="rounded p-1 text-slate-400 transition hover:text-rose-600"
                      title="Remove collaborator"
                      aria-label={`Remove ${c.userEmail}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
