import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  Clock,
  Eye,
  MapPin,
  Save,
  Settings as SettingsIcon,
  Share2,
  Users
} from 'lucide-react';
import { Form, Question, FormStatus, QuestionType, UserProfile } from '../../types';
import { QuestionEditor } from './QuestionEditor';
import { CollaboratorModal } from './CollaboratorModal';
import { formService } from '../../services/formService';
import { useToast } from '../../context/ToastContext';
import { generateUUID } from '../../utils/uuid';
import { getErrorMessage } from '../../utils/errors';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../utils/dateTime';
import { buildFormUrl } from '../../utils/links';

interface FormBuilderViewProps {
  form: Form;
  currentUser: UserProfile | null;
  onBack: () => void;
  onPreview: (formId: string) => void;
  onViewResponses: (formId: string) => void;
  onUpdated: (updated: Form) => void;
}

export const FormBuilderView: React.FC<FormBuilderViewProps> = ({
  form: initialForm,
  currentUser,
  onBack,
  onPreview,
  onViewResponses,
  onUpdated
}) => {
  const { showToast } = useToast();
  const [form, setForm] = useState<Form>(initialForm);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const canManageCollaborators = Boolean(
    currentUser && (currentUser.role === 'admin' || form.createdBy === currentUser.id)
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async (updatedData?: Partial<Form>): Promise<boolean> => {
    if (isSaving) return false;

    setIsSaving(true);
    try {
      const saved = await formService.updateForm(form.id, { ...form, ...(updatedData || {}) });
      setForm(saved);
      onUpdated(saved);
      setHasUnsavedChanges(false);
      showToast('Form saved successfully.', 'success');
      return true;
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to save form.'), 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges && !window.confirm('Discard your unsaved changes?')) return;
    onBack();
  };

  const handlePreview = async () => {
    if (hasUnsavedChanges && !(await handleSave())) return;
    onPreview(form.id);
  };

  const handleViewResponses = async () => {
    if (hasUnsavedChanges && !(await handleSave())) return;
    onViewResponses(form.id);
  };

  const updateFormFields = (updates: Partial<Form>) => {
    setForm(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const updateSettings = (settingUpdates: Partial<Form['settings']>) => {
    setForm(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...settingUpdates
      }
    }));
    setHasUnsavedChanges(true);
  };

  const withQuestionOrder = (questions: Question[]): Question[] =>
    questions.map((question, index) => ({ ...question, formId: form.id, orderIndex: index }));

  // Question operations
  const handleAddQuestion = (type: QuestionType = 'short_answer') => {
    const newQuestion: Question = {
      id: generateUUID(),
      formId: form.id,
      title: 'Untitled Question',
      type,
      required: false,
      orderIndex: form.questions?.length || 0,
      options: ['multiple_choice', 'checkboxes', 'dropdown'].includes(type)
        ? ['Option 1', 'Option 2']
        : []
    };

    updateFormFields({ questions: withQuestionOrder([...(form.questions || []), newQuestion]) });
  };

  const handleUpdateQuestion = (questionId: string, updates: Partial<Question>) => {
    const updated = (form.questions || []).map(question =>
      question.id === questionId ? { ...question, ...updates } : question
    );
    updateFormFields({ questions: updated });
  };

  const handleDuplicateQuestion = (index: number) => {
    const source = (form.questions || [])[index];
    if (!source) return;

    const duplicated: Question = {
      ...source,
      id: generateUUID(),
      title: `${source.title} (Copy)`
    };

    const updated = [...(form.questions || [])];
    updated.splice(index + 1, 0, duplicated);
    updateFormFields({ questions: withQuestionOrder(updated) });
  };

  const handleDeleteQuestion = (questionId: string) => {
    updateFormFields({
      questions: withQuestionOrder((form.questions || []).filter(q => q.id !== questionId))
    });
  };

  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    const questions = [...(form.questions || [])];
    const [moved] = questions.splice(fromIndex, 1);
    if (!moved) return;
    questions.splice(toIndex, 0, moved);
    updateFormFields({ questions: withQuestionOrder(questions) });
  };

  const handleShare = async () => {
    const url = buildFormUrl(form.id);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Shareable form link copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy the link.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top action bar */}
      <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-sm py-3 border-b border-slate-200 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
              {form.title || 'Untitled Form'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  ● Unsaved changes
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> All changes saved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector */}
          <select
            value={form.status}
            onChange={event => {
              const status = event.target.value as FormStatus;
              void handleSave({ status });
            }}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none cursor-pointer ${
              form.status === 'published'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : form.status === 'draft'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            <option value="draft">Status: Draft</option>
            <option value="published">Status: Published (Active)</option>
            <option value="closed">Status: Closed</option>
          </select>

          {/* Collaborators Button */}
          {canManageCollaborators && (
            <button
              type="button"
              onClick={() => setIsCollabOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              title="Share with other organizers"
            >
              <Users className="h-3.5 w-3.5 text-teal-600" />
              <span className="hidden sm:inline">Collaborate</span>
            </button>
          )}

          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            title="Copy share link"
          >
            <Share2 className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Responses button */}
          <button
            type="button"
            onClick={handleViewResponses}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            title="View responses and analytics"
          >
            <BarChart3 className="h-3.5 w-3.5 text-teal-600" />
            <span className="hidden sm:inline">Responses</span>
          </button>

          {/* Preview button */}
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            title="Preview as respondent"
          >
            <Eye className="h-3.5 w-3.5 text-teal-600" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          {/* Save button */}
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Questions vs Settings */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'questions'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Questions ({form.questions?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>Form & Event Settings</span>
        </button>
      </div>

      {/* TAB 1: QUESTIONS */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Form Header Card (Google Forms Style) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 border-t-8 border-t-teal-600 space-y-3">
            <input
              type="text"
              value={form.title}
              onChange={e => updateFormFields({ title: e.target.value })}
              placeholder="Form Title"
              className="w-full text-2xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-teal-600 focus:outline-none pb-1 transition"
            />
            <textarea
              rows={2}
              value={form.description}
              onChange={e => updateFormFields({ description: e.target.value })}
              placeholder="Form description or instructions..."
              className="w-full text-xs text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-teal-600 focus:outline-none pb-1 resize-none transition"
            />

            {form.settings.isEvent && (
              <div className="pt-2 flex items-center gap-4 text-xs text-teal-800 bg-teal-50/70 p-3 rounded-lg border border-teal-200 flex-wrap">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Event Mode Active</span>
                </div>
                {form.settings.eventDate && (
                  <div className="flex items-center gap-1 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>{new Date(form.settings.eventDate).toLocaleString()}</span>
                  </div>
                )}
                {form.settings.eventVenue && (
                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>{form.settings.eventVenue}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {(form.questions || []).map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                totalQuestions={(form.questions || []).length}
                onUpdate={updates => handleUpdateQuestion(question.id, updates)}
                onDuplicate={() => handleDuplicateQuestion(index)}
                onDelete={() => handleDeleteQuestion(question.id)}
                onMoveUp={() => handleMoveQuestion(index, index - 1)}
                onMoveDown={() => handleMoveQuestion(index, index + 1)}
              />
            ))}
          </div>

          {/* Quick Add Question Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700">Add a question:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleAddQuestion('short_answer')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                + Short text
              </button>
              <button
                onClick={() => handleAddQuestion('multiple_choice')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                + Multiple Choice
              </button>
              <button
                onClick={() => handleAddQuestion('checkboxes')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                + Checkboxes
              </button>
              <button
                onClick={() => handleAddQuestion('dropdown')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                + Dropdown
              </button>
              <button
                onClick={() => handleAddQuestion('linear_scale')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                + Linear Scale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Form Configuration & Access</h2>
            <p className="text-xs text-slate-500">Configure response limits, deadlines, and authentication rules</p>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Public vs Private */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-900">Public Access</p>
                <p className="text-[11px] text-slate-500">Allow anyone with the link to view and submit responses</p>
              </div>
              <input
                type="checkbox"
                checked={form.settings.isPublic}
                onChange={e => updateSettings({ isPublic: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
            </div>

            {/* Allow multiple responses */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs font-semibold text-slate-900">Allow Multiple Responses</p>
                <p className="text-[11px] text-slate-500">Allow the same user or email to submit more than once</p>
              </div>
              <input
                type="checkbox"
                checked={form.settings.allowMultipleResponses}
                onChange={e => updateSettings({ allowMultipleResponses: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
            </div>

            {/* Response limit */}
            <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Maximum Submissions Cap</p>
                  <p className="text-[11px] text-slate-500">Automatically close the form once this limit is reached</p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={form.settings.responseLimit || ''}
                  onChange={e => updateSettings({ responseLimit: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Unlimited"
                  className="w-32 px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-right"
                />
              </div>
            </div>

            {/* Submission Deadline */}
            <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Submission Deadline</p>
                  <p className="text-[11px] text-slate-500">Close responses after this date and time</p>
                </div>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(form.settings.deadline)}
                  onChange={event =>
                    updateSettings({ deadline: fromDateTimeLocalValue(event.target.value) })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Event Registration Section */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Event & Activity Registration Mode</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Enable attendance check-in, capacity management, and participant status tracking
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.settings.isEvent}
                onChange={e => updateSettings({ isEvent: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
            </div>

            {form.settings.isEvent && (
              <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocalValue(form.settings.eventDate)}
                    onChange={event =>
                      updateSettings({ eventDate: fromDateTimeLocalValue(event.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Venue or Meeting Link
                  </label>
                  <input
                    type="text"
                    value={form.settings.eventVenue || ''}
                    onChange={e => updateSettings({ eventVenue: e.target.value })}
                    placeholder="e.g. Auditorium Hall 1 / Zoom URL"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Capacity Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.settings.eventCapacity || ''}
                    onChange={e => updateSettings({ eventCapacity: e.target.value ? Number(e.target.value) : null })}
                    placeholder="e.g. 150 participants"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collaborator Modal */}
      <CollaboratorModal
        form={form}
        isOpen={isCollabOpen}
        onClose={() => setIsCollabOpen(false)}
        onUpdated={updated => {
          setForm(updated);
          onUpdated(updated);
        }}
      />
    </div>
  );
};
