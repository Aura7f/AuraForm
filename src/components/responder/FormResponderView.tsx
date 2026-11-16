import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock, MapPin, RotateCcw, Send } from 'lucide-react';
import { Form } from '../../types';
import { formService } from '../../services/formService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isValidEmail, validateFormSubmission } from '../../utils/validation';
import { getErrorMessage } from '../../utils/errors';

type AnswerValue = string | string[] | number;

interface FormResponderViewProps {
  formId: string;
  onBack: () => void;
  onRequestSignIn: () => void;
}

export const FormResponderView: React.FC<FormResponderViewProps> = ({
  formId,
  onBack,
  onRequestSignIn
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`auraform-response-draft-${formId}`) || '{}');
    } catch (error) {
      console.error('Failed to restore response draft:', error);
      return {};
    }
  });
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForm();
  }, [formId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`auraform-response-draft-${formId}`, JSON.stringify(answers));
    } catch (error) {
      console.error('Failed to save response draft:', error);
    }
  }, [answers, formId]);

  useEffect(() => {
    if (!user) return;
    setParticipantName(current => current || user.fullName);
    setParticipantEmail(user.email);
  }, [user]);

  const loadForm = async () => {
    setLoading(true);
    try {
      const data = await formService.getFormById(formId);
      setForm(data);
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to load form.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTextAnswer = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    if (errors[qId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  const handleCheckboxAnswer = (qId: string, option: string, checked: boolean) => {
    const current: string[] = Array.isArray(answers[qId]) ? answers[qId] : [];
    let updated: string[];
    if (checked) {
      updated = [...current, option];
    } else {
      updated = current.filter(item => item !== option);
    }
    setAnswers(prev => ({ ...prev, [qId]: updated }));
    if (errors[qId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (!user) {
      showToast('Sign in before submitting a response.', 'error');
      return;
    }

    const newErrors: Record<string, string> = {};

    if (form.settings.isEvent) {
      if (!participantName.trim()) {
        newErrors.participant_name = 'Full name is required for event registration.';
      }
      if (!isValidEmail(user.email)) {
        newErrors.participant_email = 'Your account needs a valid email address for event confirmation.';
      }
    }

    // Validate question answers
    const validation = validateFormSubmission(form.questions || [], answers);
    if (!validation.isValid) {
      validation.errors.forEach(err => {
        newErrors[err.questionId] = err.message;
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix the highlighted errors before submitting.', 'error');
      const firstErrorField = Object.keys(newErrors)[0];
      document
        .getElementById(`field-${firstErrorField}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await formService.submitResponse(
        form.id,
        answers,
        {
          name: participantName.trim(),
          email: user.email
        },
        user
      );

      if (result.success) {
        sessionStorage.removeItem(`auraform-response-draft-${formId}`);
        setSubmitted(true);
        showToast('Response recorded successfully.', 'success');
      } else {
        showToast(result.error || 'Submission failed.', 'error');
      }
    } catch (error) {
      showToast(getErrorMessage(error, 'Error submitting response.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setErrors({});
    setSubmitted(false);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Form Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          This form may have been removed or the link is incorrect.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isExpired = Boolean(
    form.settings.deadline && new Date() > new Date(form.settings.deadline)
  );
  const isClosed = form.status === 'closed' || isExpired;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition duration-150 hover:border-teal-700 hover:bg-teal-700 hover:text-white hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          aria-label="Back to forms"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Forms</span>
        </button>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          Powered by
          <img src="/logo.png" alt="AuraForm" className="h-4 w-4 object-contain" />
          <strong className="text-slate-700">AuraForm</strong>
        </span>
      </div>

      {/* Closed Banner if applicable */}
      {isClosed && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Form Closed</p>
            <p className="mt-0.5">
              {isExpired
                ? 'The registration deadline has passed. This form is no longer accepting submissions.'
                : 'The organizers have closed submissions for this form.'}
            </p>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION SCREEN */}
      {submitted ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center space-y-4 animate-in fade-in zoom-in-95 border-t-8 border-t-teal-600">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {form.settings.isEvent ? 'Registration Confirmed!' : 'Response Recorded'}
          </h2>

          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Thank you for completing <strong>{form.title}</strong>. Your submission has been securely stored in the system.
          </p>

          {form.settings.isEvent && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-left text-xs max-w-sm mx-auto space-y-1.5 text-teal-950">
              <p className="font-bold text-teal-900">Event Details:</p>
              {form.settings.eventDate && (
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>{new Date(form.settings.eventDate).toLocaleString()}</span>
                </p>
              )}
              {form.settings.eventVenue && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span>{form.settings.eventVenue}</span>
                </p>
              )}
            </div>
          )}

          <div className="pt-4 flex items-center justify-center gap-3">
            {form.settings.allowMultipleResponses && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
              >
                Submit another response
              </button>
            )}
            <button
              onClick={onBack}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
            >
              Back to Forms
            </button>
          </div>
        </div>
      ) : (
        /* FORM RESPONDER VIEW */
        <form onSubmit={handleSubmit} className="space-y-4">
          {!user && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-amber-900">
                Sign in to submit your response. Your answers are saved as a draft and restored after
                sign-in.
              </p>
              <button
                type="button"
                onClick={onRequestSignIn}
                className="shrink-0 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                Sign in
              </button>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 border-t-8 border-t-teal-600 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {form.title}
            </h1>

            {form.description && (
              <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {form.description}
              </p>
            )}

            {/* Event Specific Banner */}
            {form.settings.isEvent && (
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {form.settings.eventDate && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>{new Date(form.settings.eventDate).toLocaleString()}</span>
                  </div>
                )}
                {form.settings.eventVenue && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>{form.settings.eventVenue}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 text-[11px] text-rose-500 font-medium">
              * Indicates required question
            </div>
          </div>

          {/* Event Participant Contact Fields */}
          {form.settings.isEvent && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Participant Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div id="field-participant_name">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={participantName}
                    onChange={event => setParticipantName(event.target.value)}
                    placeholder="Your legal or preferred name"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {errors.participant_name && (
                    <p className="mt-1 text-[11px] text-rose-500">{errors.participant_name}</p>
                  )}
                </div>

                <div id="field-participant_email">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    readOnly={Boolean(user)}
                    value={user?.email || participantEmail}
                    onChange={event => setParticipantEmail(event.target.value)}
                    placeholder="your.email@college.edu"
                    className={`w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      user ? 'bg-slate-50 text-slate-500' : ''
                    }`}
                  />
                  {errors.participant_email && (
                    <p className="mt-1 text-[11px] text-rose-500">{errors.participant_email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Questions Renderers */}
          {(form.questions || []).map((q, idx) => {
            const hasError = Boolean(errors[q.id]);

            return (
              <div
                key={q.id}
                id={`field-${q.id}`}
                className={`space-y-3 rounded-xl border bg-white p-6 shadow-sm transition ${
                  hasError ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-start gap-1">
                    <span>{idx + 1}. {q.title}</span>
                    {q.required && <span className="text-rose-500">*</span>}
                  </h3>
                  {q.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{q.description}</p>
                  )}
                </div>

                {/* 1. Short answer */}
                {q.type === 'short_answer' && (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    placeholder="Your answer"
                    className="w-full sm:w-2/3 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                )}

                {/* 2. Paragraph */}
                {q.type === 'paragraph' && (
                  <textarea
                    rows={3}
                    value={answers[q.id] || ''}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    placeholder="Your answer"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                  />
                )}

                {/* 3. Multiple Choice */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none"
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={e => handleTextAnswer(q.id, e.target.value)}
                          className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* 4. Checkboxes */}
                {q.type === 'checkboxes' && (
                  <div className="space-y-2 pt-1">
                    {(q.options || []).map((opt, optIdx) => {
                      const answer = answers[q.id];
                      const selected = Array.isArray(answer) && answer.includes(opt);
                      return (
                        <label
                          key={optIdx}
                          className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={e => handleCheckboxAnswer(q.id, opt, e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* 5. Dropdown */}
                {q.type === 'dropdown' && (
                  <select
                    value={answers[q.id] || ''}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    className="w-full sm:w-2/3 px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">Choose an option...</option>
                    {(q.options || []).map((opt, optIdx) => (
                      <option key={optIdx} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* 6. Date */}
                {q.type === 'date' && (
                  <input
                    type="date"
                    value={answers[q.id] || ''}
                    onChange={e => handleTextAnswer(q.id, e.target.value)}
                    className="px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                )}

                {/* 7. Linear Scale */}
                {q.type === 'linear_scale' && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                      <span>{q.scaleMinLabel || String(q.scaleMin ?? 1)}</span>
                      <span>{q.scaleMaxLabel || String(q.scaleMax ?? 5)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 sm:gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {Array.from(
                        { length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 },
                        (_, i) => (q.scaleMin ?? 1) + i
                      ).map(num => (
                        <label
                          key={num}
                          className="flex flex-col items-center gap-1.5 cursor-pointer flex-1"
                        >
                          <span className="text-xs font-semibold text-slate-700">{num}</span>
                          <input
                            type="radio"
                            name={`scale-${q.id}`}
                            value={num}
                            checked={Number(answers[q.id]) === num}
                            onChange={() => handleTextAnswer(q.id, String(num))}
                            className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {hasError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500 pt-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors[q.id]}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSubmitting || Boolean(isClosed)}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Response'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear form</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
