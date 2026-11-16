import { Form, Question, FormResponse } from '../types';

export const getResponseCsvData = (
  form: Form,
  questions: Question[],
  responses: FormResponse[]
): { headers: string[]; rows: string[][] } => {
  const headers = [
    'Submission ID',
    'Submitted At',
    'Respondent Email',
    'Participant Name'
  ];

  if (form.settings.isEvent) {
    headers.push('Registration Status', 'Checked In At');
  }

  // Add question titles as headers
  questions.forEach(q => {
    headers.push(q.title);
  });

  const rows = responses.map(resp => {
    const rowValues: string[] = [
      resp.id,
      new Date(resp.submittedAt).toLocaleString(),
      resp.respondentEmail || 'Anonymous',
      resp.participantName || 'N/A'
    ];

    if (form.settings.isEvent) {
      rowValues.push(resp.registrationStatus || 'registered');
      rowValues.push(resp.checkedInAt ? new Date(resp.checkedInAt).toLocaleString() : 'Not Checked In');
    }

    // Answers for each question
    questions.forEach(q => {
      const val = resp.answers[q.id];
      let formattedVal = '';
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          formattedVal = val.join('; ');
        } else {
          formattedVal = String(val);
        }
      }
      rowValues.push(formattedVal);
    });
    return rowValues;
  });

  return { headers, rows };
};

export const exportResponsesToCsv = (
  form: Form,
  questions: Question[],
  responses: FormResponse[]
) => {
  const { headers, rows } = getResponseCsvData(form, questions, responses);
  if (rows.length === 0) return;

  const csvRows = [headers, ...rows].map(row =>
    row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')
  );
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = form.title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);

  link.href = downloadUrl;
  link.download = `${safeTitle || 'form'}_responses.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
};
