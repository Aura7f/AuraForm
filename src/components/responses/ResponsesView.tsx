import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Pencil,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { Form, FormResponse, RegistrationStatus } from '../../types';
import { formService } from '../../services/formService';
import { exportResponsesToCsv, getResponseCsvData } from '../../utils/exportCsv';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errors';

interface ResponsesViewProps {
  formId: string;
  onBack: () => void;
  onOpenForm: (formId: string) => void;
  onEditForm: (formId: string) => void;
}

export const ResponsesView: React.FC<ResponsesViewProps> = ({
  formId,
  onBack,
  onOpenForm,
  onEditForm
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'individual' | 'csv' | 'attendance'>('summary');
  const [individualIndex, setIndividualIndex] = useState(0);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | RegistrationStatus>('all');
  const [csvSearch, setCsvSearch] = useState('');
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [savingResponseId, setSavingResponseId] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, [formId]);

  useEffect(() => {
    setIndividualIndex(index => Math.min(index, Math.max(0, responses.length - 1)));
  }, [responses.length]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [formData, responseData] = await Promise.all([
        formService.getFormById(formId),
        formService.getFormResponses(formId)
      ]);
      setForm(formData);
      setResponses(responseData);
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to load responses.'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = async (responseId: string, newStatus: RegistrationStatus) => {
    try {
      await formService.updateAttendance(formId, responseId, newStatus);
      showToast(`Participant marked as ${newStatus}.`, 'success');
      setResponses(await formService.getFormResponses(formId));
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to update attendance.'), 'error');
    }
  };

  const handleExportCsv = () => {
    if (!form) return;
    exportResponsesToCsv(form, form.questions || [], responses);
    showToast('CSV exported.', 'success');
  };

  const startEditingResponse = (response: FormResponse) => {
    const answers: Record<string, string> = {};
    (form?.questions || []).forEach(question => {
      const value = response.answers[question.id];
      answers[question.id] = Array.isArray(value) ? value.join('; ') : value == null ? '' : String(value);
    });
    setDraftAnswers(answers);
    setEditingResponseId(response.id);
  };

  const saveResponseAnswers = async (response: FormResponse) => {
    if (!form) return;

    const answers: FormResponse['answers'] = {};
    for (const question of form.questions || []) {
      const value = (draftAnswers[question.id] || '').trim();
      if (question.required && !value) {
        showToast(`"${question.title}" is required.`, 'error');
        return;
      }
      if (question.type === 'linear_scale' && value) {
        const numericValue = Number(value);
        if (
          !Number.isFinite(numericValue) ||
          numericValue < (question.scaleMin ?? 1) ||
          numericValue > (question.scaleMax ?? 5)
        ) {
          showToast(`Enter a value between ${question.scaleMin ?? 1} and ${question.scaleMax ?? 5} for "${question.title}".`, 'error');
          return;
        }
        answers[question.id] = numericValue;
      } else if (question.type === 'checkboxes') {
        answers[question.id] = value ? value.split(';').map(item => item.trim()).filter(Boolean) : [];
      } else {
        answers[question.id] = value;
      }
    }

    setSavingResponseId(response.id);
    try {
      await formService.updateResponseAnswers(response.id, answers);
      setResponses(current =>
        current.map(item => item.id === response.id ? { ...item, answers } : item)
      );
      setEditingResponseId(null);
      showToast('Response changes saved.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to save response changes.'), 'error');
    } finally {
      setSavingResponseId(null);
    }
  };

  // Filtered participants for attendance table
  const filteredAttendance = useMemo(() => {
    return responses.filter(r => {
      const matchesSearch =
        (r.participantName || '').toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        (r.respondentEmail || '').toLowerCase().includes(attendanceSearch.toLowerCase());

      if (!matchesSearch) return false;
      if (attendanceFilter !== 'all' && (r.registrationStatus || 'registered') !== attendanceFilter) {
        return false;
      }
      return true;
    });
  }, [responses, attendanceSearch, attendanceFilter]);

  const attendanceStats = useMemo(() => {
    const total = responses.length;
    const registered = responses.filter(
      response => (response.registrationStatus || 'registered') === 'registered'
    ).length;
    const attended = responses.filter(response => response.registrationStatus === 'attended').length;
    const confirmed = responses.filter(response => response.registrationStatus === 'confirmed').length;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, registered, attended, confirmed, rate };
  }, [responses]);

  const csvData = useMemo(
    () => form
      ? getResponseCsvData(form, form.questions || [], responses)
      : { headers: [], rows: [] },
    [form, responses]
  );

  const filteredCsvRows = useMemo(() => {
    const query = csvSearch.trim().toLowerCase();
    return csvData.rows
      .map((values, responseIndex) => ({ values, responseIndex }))
      .filter(({ values }) =>
        !query || values.some(value => value.toLowerCase().includes(query))
      );
  }, [csvData, csvSearch]);
  const canEditResponses = user?.role === 'admin' || (
    user?.role === 'organizer' &&
    (form?.createdBy === user.id ||
      form?.collaborators?.some(collaborator => collaborator.userId === user.id && collaborator.role === 'editor'))
  );
  const canEditForm = Boolean(
    user?.role === 'admin' ||
      (user?.role === 'organizer' &&
        form &&
        (form.createdBy === user.id ||
          form.collaborators?.some(
            collaborator =>
              collaborator.role === 'editor' &&
              (collaborator.userId === user.id || collaborator.userEmail === user.email)
          )))
  );

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading response analytics...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-md mx-auto my-12">
        <h3 className="text-base font-bold text-slate-900">Form Not Found</h3>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentIndividualResponse = responses[individualIndex];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition duration-150 hover:border-teal-700 hover:bg-teal-700 hover:text-white hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            aria-label="Back to forms"
            title="Return to the dashboard"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Forms</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 truncate max-w-md">{form.title}</h1>
            <p className="text-xs text-slate-500">
              {responses.length} total response{responses.length === 1 ? '' : 's'} recorded
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end">
          <button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            aria-label="Refresh responses"
            title="Refresh responses"
            className="p-2 text-slate-500 hover:text-teal-700 hover:bg-white rounded-lg border border-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {canEditForm && (
            <button
              type="button"
              onClick={() => onEditForm(form.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-100"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Form</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenForm(form.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <Eye className="w-3.5 h-3.5 text-teal-600" />
            <span>Open Form</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={responses.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-nowrap overflow-x-auto border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('summary')}
          className={`min-w-max flex-1 whitespace-nowrap px-3 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'summary'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Summary Analytics
        </button>

        <button
          onClick={() => setActiveTab('individual')}
          className={`min-w-max flex-1 whitespace-nowrap px-3 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'individual'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Individual ({responses.length})
        </button>

        <button
          onClick={() => setActiveTab('csv')}
          className={`min-w-max flex-1 whitespace-nowrap px-3 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'csv'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          CSV Preview
        </button>

        {form.settings.isEvent && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`min-w-max flex-1 whitespace-nowrap px-3 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Event Attendance</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {responses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Waiting for responses</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No one has submitted a response yet. Share your form link with participants to collect answers.
          </p>
          <button
            onClick={() => onOpenForm(form.id)}
            className="px-4 py-2 bg-teal-600 text-white font-semibold text-xs rounded-lg transition"
          >
            Submit a test response
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: SUMMARY ANALYTICS */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              {/* Event Attendance Quick Card (if event) */}
              {form.settings.isEvent && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Registered</span>
                    <p className="mt-0.5 text-xl font-bold text-slate-900">{attendanceStats.registered}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Confirmed</span>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">{attendanceStats.confirmed}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Attended</span>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">{attendanceStats.attended}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Turnout Rate</span>
                    <p className="text-xl font-bold text-teal-600 mt-0.5">{attendanceStats.rate}%</p>
                  </div>
                </div>
              )}

              {/* Questions Breakdown */}
              {(form.questions || []).map((q, idx) => {
                // Calculate answer distribution
                const answerValues = responses
                  .map(r => r.answers[q.id])
                  .filter(v => v !== undefined && v !== null && v !== '');

                const countMap: Record<string, number> = {};
                let numericSum = 0;
                let numericCount = 0;

                answerValues.forEach(val => {
                  if (Array.isArray(val)) {
                    val.forEach(item => {
                      countMap[item] = (countMap[item] || 0) + 1;
                    });
                  } else {
                    const str = String(val);
                    countMap[str] = (countMap[str] || 0) + 1;
                    if (q.type === 'linear_scale') {
                      const n = Number(val);
                      if (!isNaN(n)) {
                        numericSum += n;
                        numericCount++;
                      }
                    }
                  }
                });

                const averageScale = numericCount > 0 ? (numericSum / numericCount).toFixed(1) : null;

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {idx + 1}. {q.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {answerValues.length} response{answerValues.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-slate-100 rounded">
                        {q.type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Chart / Visual for Choice & Dropdown questions */}
                    {['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && (
                      <div className="space-y-2.5 pt-2">
                        {(q.options || []).map((opt, optIdx) => {
                          const count = countMap[opt] || 0;
                          const total = answerValues.length || 1;
                          const percentage = Math.round((count / total) * 100);

                          return (
                            <div key={optIdx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-slate-700">
                                <span className="font-medium truncate max-w-sm">{opt}</span>
                                <span className="font-semibold text-slate-500 ml-2">
                                  {count} ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-teal-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Linear Scale Breakdown */}
                    {q.type === 'linear_scale' && (
                      <div className="space-y-3 pt-2">
                        {averageScale && (
                          <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg text-teal-900">
                            <span className="text-xs font-semibold">Average rating:</span>
                            <span className="text-base font-bold">{averageScale} / {q.scaleMax ?? 5}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center">
                          {Array.from(
                            { length: (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 },
                            (_, i) => (q.scaleMin ?? 1) + i
                          ).map(num => {
                            const count = countMap[String(num)] || 0;
                            return (
                              <div key={num} className="p-2 rounded bg-slate-50 border border-slate-200">
                                <span className="block text-xs font-bold text-slate-800">{num}</span>
                                <span className="text-[10px] text-teal-700 font-semibold">{count} votes</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Text Responses List */}
                    {['short_answer', 'paragraph', 'date'].includes(q.type) && (
                      <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                        {answerValues.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No answers submitted.</p>
                        ) : (
                          answerValues.map((val, valIdx) => (
                            <div
                              key={valIdx}
                              className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-100"
                            >
                              {String(val)}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: INDIVIDUAL RESPONSES */}
          {activeTab === 'individual' && currentIndividualResponse && (
            <div className="space-y-4">
              {/* Stepper bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    disabled={individualIndex === 0}
                    onClick={() => setIndividualIndex(prev => prev - 1)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-semibold text-slate-800">
                    Response {individualIndex + 1} of {responses.length}
                  </span>
                  <button
                    disabled={individualIndex === responses.length - 1}
                    onClick={() => setIndividualIndex(prev => prev + 1)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-100 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <span>Submitted {new Date(currentIndividualResponse.submittedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Individual Respondent Details */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {currentIndividualResponse.participantName || 'Anonymous Respondent'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {currentIndividualResponse.respondentEmail || 'No email associated'}
                    </p>
                  </div>

                  {form.settings.isEvent && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        currentIndividualResponse.registrationStatus === 'attended'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-teal-50 text-teal-800 border-teal-300'
                      }`}
                    >
                      {currentIndividualResponse.registrationStatus}
                    </span>
                  )}
                </div>

                {/* Answers List */}
                <div className="space-y-4 pt-2">
                  {(form.questions || []).map((q, qIdx) => {
                    const ans = currentIndividualResponse.answers[q.id];
                    let displayAns = 'No answer provided';
                    if (ans !== undefined && ans !== null && ans !== '') {
                      displayAns = Array.isArray(ans) ? ans.join(', ') : String(ans);
                    }

                    return (
                      <div key={q.id} className="space-y-1">
                        <p className="text-xs font-semibold text-slate-700">
                          {qIdx + 1}. {q.title}
                        </p>
                        <p className="text-xs text-slate-900 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          {displayAns}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Response CSV preview</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Showing {filteredCsvRows.length} of {csvData.rows.length} responses. Edit question answers here; refresh to load the latest data.
                  </p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={csvSearch}
                    onChange={event => setCsvSearch(event.target.value)}
                    placeholder="Search responses..."
                    aria-label="Search CSV preview"
                    className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="max-h-[65vh] overflow-auto">
                  <table className="w-full min-w-max border-collapse text-left text-xs text-slate-700">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        {csvData.headers.map((header, index) => (
                          <th key={`${header}-${index}`} className="whitespace-nowrap border border-slate-200 px-3 py-3">
                            {header}
                          </th>
                        ))}
                        {canEditResponses && (
                          <th className="sticky right-0 border border-slate-200 bg-slate-50 px-3 py-3 text-right">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCsvRows.length === 0 ? (
                        <tr>
                          <td colSpan={csvData.headers.length + (canEditResponses ? 1 : 0)} className="px-4 py-8 text-center text-slate-400">
                            No responses match the search.
                          </td>
                        </tr>
                      ) : (
                        filteredCsvRows.map(({ values, responseIndex }) => {
                          const response = responses[responseIndex];
                          const isEditing = response?.id === editingResponseId;
                          const answerStartColumn = 4 + (form.settings.isEvent ? 2 : 0);
                          return (
                            <tr key={response?.id || responseIndex} className="hover:bg-slate-50/80">
                              {values.map((value, columnIndex) => {
                                const question = form.questions?.[columnIndex - answerStartColumn];
                                return (
                                  <td
                                    key={`${responseIndex}-${columnIndex}`}
                                    title={!isEditing || !question ? value : undefined}
                                    className={`max-w-xs border border-slate-200 px-2 py-2 ${question && isEditing ? 'bg-white' : ''}`}
                                  >
                                    {question && isEditing ? (
                                      <input
                                        type="text"
                                        value={draftAnswers[question.id] ?? ''}
                                        onChange={event => setDraftAnswers(current => ({
                                          ...current,
                                          [question.id]: event.target.value
                                        }))}
                                        aria-label={`Answer for ${question.title}`}
                                        className="w-full min-w-36 rounded border border-teal-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                                      />
                                    ) : (
                                      <span className="block max-w-xs truncate whitespace-nowrap px-1 py-1.5">
                                        {value || '—'}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              {canEditResponses && (
                                <td className="sticky right-0 whitespace-nowrap border border-slate-200 bg-white px-2 py-2 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => void saveResponseAnswers(response)}
                                        disabled={savingResponseId === response.id}
                                        className="inline-flex items-center gap-1 rounded bg-teal-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                                      >
                                        <Save className="h-3 w-3" />
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingResponseId(null)}
                                        disabled={savingResponseId === response.id}
                                        className="rounded border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => startEditingResponse(response)}
                                      disabled={editingResponseId !== null}
                                      className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Edit
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVENT ATTENDANCE & CHECK-IN (Event mode) */}
          {activeTab === 'attendance' && form.settings.isEvent && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={attendanceSearch}
                    onChange={e => setAttendanceSearch(e.target.value)}
                    placeholder="Search by participant name or email..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:w-auto">
                  {(['all', 'registered', 'confirmed', 'attended', 'cancelled'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setAttendanceFilter(st)}
                      className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition ${
                        attendanceFilter === st
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Participant</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Registered At</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                            No participants match the search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {p.participantName || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                              {p.respondentEmail || 'Anonymous'}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {new Date(p.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  p.registrationStatus === 'attended'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : p.registrationStatus === 'confirmed'
                                    ? 'bg-teal-50 text-teal-800 border-teal-300'
                                    : p.registrationStatus === 'cancelled'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {p.registrationStatus === 'attended' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {p.registrationStatus || 'registered'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1">
                              {p.registrationStatus !== 'attended' ? (
                                <button
                                  onClick={() => handleStatusChange(p.id, 'attended')}
                                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                                >
                                  Check In
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(p.id, 'confirmed')}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                                >
                                  Undo Check-in
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
