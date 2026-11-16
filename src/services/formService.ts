import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  CollaboratorRole,
  Form,
  FormCollaborator,
  FormResponse,
  FormSettings,
  FormStatus,
  OrganizerAccessRequest,
  OrganizerAccessRequestStatus,
  Question,
  QuestionType,
  RegistrationStatus,
  UserProfile
} from '../types';
import { STARTER_FORMS } from '../lib/starterForms';
import { generateUUID, isValidUUID } from '../utils/uuid';
import { getErrorMessage } from '../utils/errors';

type SupabaseClient = NonNullable<typeof supabase>;

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserProfile['role'];
}

interface QuestionRow {
  id: string;
  form_id: string;
  title: string;
  description: string | null;
  type: QuestionType;
  required: boolean;
  order_index: number;
  options: string[] | null;
  scale_min: number | null;
  scale_max: number | null;
  scale_min_label: string | null;
  scale_max_label: string | null;
}

interface CollaboratorRow {
  id: string;
  form_id: string;
  user_id: string;
  role: CollaboratorRole;
  profiles?: ProfileRow | null;
}

interface FormRow {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  status: FormStatus;
  is_public: boolean;
  requires_login: boolean;
  allow_multiple_responses: boolean;
  response_limit: number | null;
  deadline: string | null;
  is_event: boolean;
  event_date: string | null;
  event_venue: string | null;
  event_capacity: number | null;
  created_at: string;
  updated_at: string;
  questions?: QuestionRow[] | null;
  form_collaborators?: CollaboratorRow[] | null;
  profiles?: ProfileRow | null;
  responses?: { count: number }[] | null;
}

interface AnswerRow {
  question_id: string;
  value: FormResponse['answers'][string];
}

interface RegistrationRow {
  participant_name: string | null;
  participant_email: string | null;
  status: RegistrationStatus;
  checked_in_at: string | null;
}

interface ResponseRow {
  id: string;
  form_id: string;
  respondent_id: string | null;
  respondent_email: string | null;
  submitted_at: string;
  answers?: AnswerRow[] | null;
  event_registrations?: RegistrationRow[] | null;
}

interface OrganizerAccessRequestRow {
  id: string;
  user_id: string;
  status: OrganizerAccessRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  profiles?: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null;
}

interface QuestionInsert {
  id: string;
  form_id: string;
  title: string;
  description: string;
  type: QuestionType;
  required: boolean;
  order_index: number;
  options: string[];
  scale_min: number | null;
  scale_max: number | null;
  scale_min_label: string | null;
  scale_max_label: string | null;
}

const FORM_SELECT = [
  '*',
  'questions(*)',
  'form_collaborators(*, profiles(id, email, full_name, avatar_url, role))',
  'profiles(id, email, full_name, avatar_url, role)',
  'responses(count)'
].join(', ');

// Supabase queries normally complete in well under a second, but a paused or
// cold project, a slow mobile network, or a large form list can take longer.
const DEFAULT_SUPABASE_TIMEOUT_MS = 15000;

const getSupabaseTimeoutMs = (): number => {
  const configured = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1000
    ? configured
    : DEFAULT_SUPABASE_TIMEOUT_MS;
};

const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';

const toSupabaseError = (error: { message?: string; details?: string; hint?: string }): Error =>
  new Error(
    [error.message, error.details, error.hint].filter(Boolean).join(' — ') || 'Unknown Supabase error'
  );

const requireClient = (): SupabaseClient => {
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
    );
  }
  return supabase;
};

/** Runs a readable Supabase request with a real abortable timeout. */
const withSupabaseTimeout = async <T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  action: string
): Promise<T> => {
  const timeoutMs = getSupabaseTimeoutMs();
  const controller = new AbortController();
  let didTimeout = false;
  const timer = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await request(controller.signal);
  } catch (error) {
    if (didTimeout || isAbortError(error)) {
      throw new Error(
        `${action} timed out after ${Math.round(timeoutMs / 1000)}s. ` +
          'Check that your Supabase project is active and that VITE_SUPABASE_URL is correct.'
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

const toProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name || row.email,
  role: row.role,
  avatarUrl: row.avatar_url || undefined
});

const toQuestion = (row: QuestionRow): Question => ({
  id: row.id,
  formId: row.form_id,
  title: row.title,
  description: row.description || '',
  type: row.type,
  required: row.required,
  orderIndex: row.order_index,
  options: row.options || [],
  scaleMin: row.scale_min ?? undefined,
  scaleMax: row.scale_max ?? undefined,
  scaleMinLabel: row.scale_min_label ?? undefined,
  scaleMaxLabel: row.scale_max_label ?? undefined
});

const toCollaborator = (row: CollaboratorRow): FormCollaborator => ({
  id: row.id,
  formId: row.form_id,
  userId: row.user_id,
  userEmail: row.profiles?.email || 'Unknown account',
  role: row.role
});

const toForm = (row: FormRow): Form => ({
  id: row.id,
  title: row.title,
  description: row.description || '',
  createdBy: row.created_by,
  creatorProfile: row.profiles ? toProfile(row.profiles) : undefined,
  status: row.status,
  settings: {
    isPublic: row.is_public,
    requiresLogin: row.requires_login,
    allowMultipleResponses: row.allow_multiple_responses,
    responseLimit: row.response_limit,
    deadline: row.deadline,
    isEvent: row.is_event,
    eventDate: row.event_date,
    eventVenue: row.event_venue,
    eventCapacity: row.event_capacity
  },
  questions: (row.questions || [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map(toQuestion),
  collaborators: (row.form_collaborators || []).map(toCollaborator),
  responseCount: row.responses?.[0]?.count ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const toQuestionInsert = (
  formId: string,
  question: Question,
  index: number
): QuestionInsert => ({
  id: isValidUUID(question.id) ? question.id : generateUUID(),
  form_id: formId,
  title: question.title || 'Untitled Question',
  description: question.description || '',
  type: question.type,
  required: question.required,
  order_index: index,
  options: question.options || [],
  scale_min: question.type === 'linear_scale' ? question.scaleMin ?? 1 : null,
  scale_max: question.type === 'linear_scale' ? question.scaleMax ?? 5 : null,
  scale_min_label: question.type === 'linear_scale' ? question.scaleMinLabel || 'Poor' : null,
  scale_max_label: question.type === 'linear_scale' ? question.scaleMaxLabel || 'Excellent' : null
});

const toSettingsPayload = (settings: FormSettings) => ({
  is_public: settings.isPublic,
  requires_login: settings.requiresLogin,
  allow_multiple_responses: settings.allowMultipleResponses,
  response_limit: settings.responseLimit,
  deadline: settings.deadline,
  is_event: settings.isEvent,
  event_date: settings.eventDate,
  event_venue: settings.eventVenue,
  event_capacity: settings.eventCapacity
});

const syncQuestions = async (
  client: SupabaseClient,
  formId: string,
  questions: Question[]
): Promise<void> => {
  const rows = questions.map((question, index) => toQuestionInsert(formId, question, index));

  if (rows.length > 0) {
    const { error } = await client.from('questions').upsert(rows, { onConflict: 'id' });
    if (error) throw toSupabaseError(error);
  }

  const { data: existing, error: readError } = await client
    .from('questions')
    .select('id')
    .eq('form_id', formId);
  if (readError) throw toSupabaseError(readError);

  const keptIds = new Set(rows.map(row => row.id));
  const removedIds = (existing || [])
    .map(question => question.id as string)
    .filter(id => !keptIds.has(id));

  if (removedIds.length > 0) {
    const { error } = await client.from('questions').delete().in('id', removedIds);
    if (error) throw toSupabaseError(error);
  }
};

export const formService = {
  async listMembers(): Promise<UserProfile[]> {
    const client = requireClient();
    const { data, error } = await client
      .from('profiles')
      .select('id, email, full_name, avatar_url, role')
      .order('email');
    if (error) throw toSupabaseError(error);
    return (data || []).map(profile => toProfile(profile as ProfileRow));
  },

  async setMemberRole(userId: string, role: 'organizer' | 'user'): Promise<void> {
    const client = requireClient();
    const { error } = await client.rpc('set_member_role', {
      target_user_id: userId,
      target_role: role
    });
    if (error) throw toSupabaseError(error);
  },

  async requestOrganizerAccess(): Promise<string> {
    const client = requireClient();
    const { data, error } = await client.rpc('request_organizer_access');
    if (error) throw toSupabaseError(error);
    if (!data) throw new Error('Organizer access request did not return an ID.');
    return data;
  },

  async getOrganizerAccessRequests(): Promise<OrganizerAccessRequest[]> {
    const client = requireClient();
    const { data, error } = await client
      .from('organizer_access_requests')
      .select('id, user_id, status, created_at, reviewed_at, profiles!organizer_access_requests_user_id_fkey(email, full_name)')
      .order('created_at', { ascending: false });
    if (error) throw toSupabaseError(error);

    return ((data || []) as OrganizerAccessRequestRow[]).map(request => {
      const profile = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
      return {
        id: request.id,
        userId: request.user_id,
        status: request.status,
        createdAt: request.created_at,
        reviewedAt: request.reviewed_at,
        requesterName: profile?.full_name || profile?.email,
        requesterEmail: profile?.email
      };
    });
  },

  async getMyOrganizerAccessRequest(userId: string): Promise<OrganizerAccessRequest | null> {
    if (!isValidUUID(userId)) throw new Error('Invalid user id.');

    const client = requireClient();
    const { data, error } = await client
      .from('organizer_access_requests')
      .select('id, user_id, status, created_at, reviewed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw toSupabaseError(error);
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      createdAt: data.created_at,
      reviewedAt: data.reviewed_at
    };
  },

  async reviewOrganizerAccessRequest(requestId: string, approve: boolean): Promise<void> {
    if (!isValidUUID(requestId)) throw new Error('Invalid access request id.');

    const client = requireClient();
    const { error } = await client.rpc('review_organizer_access_request', {
      target_request_id: requestId,
      should_approve: approve
    });
    if (error) throw toSupabaseError(error);
  },

  async getForms(currentUser?: UserProfile | null): Promise<Form[]> {
    const client = requireClient();
    const canManage = currentUser?.role === 'admin' || currentUser?.role === 'organizer';

    const { data, error } = await withSupabaseTimeout(
      signal => {
        let query = client.from('forms').select(FORM_SELECT).abortSignal(signal);
        if (!canManage) {
          query = query.eq('status', 'published').eq('is_public', true);
        }
        return query.order('created_at', { ascending: false });
      },
      'Loading forms from Supabase'
    );

    if (error) throw toSupabaseError(error);
    return ((data || []) as unknown as FormRow[]).map(toForm);
  },

  async getFormById(id: string): Promise<Form | null> {
    if (!isValidUUID(id)) return null;

    const client = requireClient();
    const { data, error } = await withSupabaseTimeout(
      signal => client.from('forms').select(FORM_SELECT).eq('id', id).abortSignal(signal).maybeSingle(),
      'Loading form details from Supabase'
    );

    if (error) throw toSupabaseError(error);
    return data ? toForm(data as unknown as FormRow) : null;
  },

  async createForm(formData: Partial<Form>, user: UserProfile): Promise<Form> {
    const client = requireClient();
    if (!isValidUUID(user.id)) {
      throw new Error('A valid Supabase account is required to create a form.');
    }

    const formId = generateUUID();
    const now = new Date().toISOString();
    const settings: FormSettings = {
      isPublic: formData.settings?.isPublic ?? true,
      requiresLogin: formData.settings?.requiresLogin ?? false,
      allowMultipleResponses: formData.settings?.allowMultipleResponses ?? false,
      responseLimit: formData.settings?.responseLimit ?? null,
      deadline: formData.settings?.deadline ?? null,
      isEvent: formData.settings?.isEvent ?? false,
      eventDate: formData.settings?.eventDate ?? null,
      eventVenue: formData.settings?.eventVenue ?? '',
      eventCapacity: formData.settings?.eventCapacity ?? null
    };

    const providedQuestions = formData.questions?.length
      ? formData.questions
      : [
          {
            id: generateUUID(),
            formId,
            title: 'Question 1',
            type: 'short_answer' as QuestionType,
            required: false,
            orderIndex: 0,
            options: []
          }
        ];

    const questions: Question[] = providedQuestions.map((question, index) => ({
      ...question,
      id: isValidUUID(question.id) ? question.id : generateUUID(),
      formId,
      orderIndex: index,
      options: question.options || []
    }));

    const newForm: Form = {
      id: formId,
      title: formData.title || 'Untitled Form',
      description: formData.description || '',
      createdBy: user.id,
      creatorProfile: user,
      status: formData.status || 'draft',
      settings,
      questions,
      collaborators: [],
      responseCount: 0,
      createdAt: now,
      updatedAt: now
    };

    const { error: formError } = await client.from('forms').insert({
      id: newForm.id,
      title: newForm.title,
      description: newForm.description,
      created_by: newForm.createdBy,
      status: newForm.status,
      ...toSettingsPayload(settings)
    });
    if (formError) throw toSupabaseError(formError);

    const { error: questionsError } = await client
      .from('questions')
      .insert(questions.map((question, index) => toQuestionInsert(formId, question, index)));

    if (questionsError) {
      // Do not leave a form without its questions behind.
      await client.from('forms').delete().eq('id', formId);
      throw toSupabaseError(questionsError);
    }

    return newForm;
  },

  async updateForm(id: string, updates: Partial<Form>): Promise<Form> {
    if (!isValidUUID(id)) throw new Error('Invalid form id.');

    const client = requireClient();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.settings) {
      Object.assign(payload, toSettingsPayload(updates.settings));
    }

    const { data, error } = await client
      .from('forms')
      .update(payload)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw toSupabaseError(error);
    if (!data) throw new Error('Form not found, or you do not have permission to edit it.');

    if (updates.questions) {
      await syncQuestions(client, id, updates.questions);
    }

    const saved = await this.getFormById(id);
    if (!saved) throw new Error('The form was saved but could not be reloaded.');
    return saved;
  },

  async duplicateForm(id: string, user: UserProfile): Promise<Form> {
    const source = await this.getFormById(id);
    if (!source) throw new Error('Source form not found.');

    return this.createForm(
      {
        title: `${source.title} (Copy)`,
        description: source.description,
        status: 'draft',
        settings: { ...source.settings },
        questions: (source.questions || []).map(question => ({
          ...question,
          id: generateUUID()
        }))
      },
      user
    );
  },

  async deleteForm(id: string): Promise<boolean> {
    if (!isValidUUID(id)) throw new Error('Invalid form id.');

    const client = requireClient();
    const { data, error } = await client
      .from('forms')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw toSupabaseError(error);
    if (!data) throw new Error('Form not found, or you do not have permission to delete it.');
    return true;
  },

  async submitResponse(
    formId: string,
    answers: Record<string, FormResponse['answers'][string]>,
    participantInfo?: { name?: string; email?: string },
    user?: UserProfile | null
  ): Promise<{ success: boolean; responseId?: string; error?: string }> {
    if (!user) {
      return { success: false, error: 'Sign in before submitting a response.' };
    }

    try {
      const client = requireClient();
      if (!isValidUUID(formId) || !isValidUUID(user.id)) {
        return {
          success: false,
          error: 'A valid authenticated Supabase account is required to submit responses.'
        };
      }

      const form = await this.getFormById(formId);
      if (!form) return { success: false, error: 'Form not found.' };
      if (form.status !== 'published') {
        return { success: false, error: 'This form is not accepting responses.' };
      }
      if (form.settings.deadline && new Date() > new Date(form.settings.deadline)) {
        return { success: false, error: 'The deadline for this form has passed.' };
      }

      const existing = await this.getFormResponses(formId);
      if (form.settings.responseLimit && existing.length >= form.settings.responseLimit) {
        return {
          success: false,
          error: `This form has reached its maximum limit of ${form.settings.responseLimit} responses.`
        };
      }

      const isDuplicate =
        !form.settings.allowMultipleResponses &&
        existing.some(
          response => response.respondentEmail?.toLowerCase() === user.email.toLowerCase()
        );
      if (isDuplicate) {
        return { success: false, error: 'You have already submitted a response to this form.' };
      }

      const responseId = generateUUID();
      const submittedAt = new Date().toISOString();
      const participantName = participantInfo?.name?.trim() || user.fullName;

      const { error: responseError } = await client.from('responses').insert({
        id: responseId,
        form_id: formId,
        respondent_id: user.id,
        respondent_email: user.email,
        submitted_at: submittedAt
      });
      if (responseError) throw toSupabaseError(responseError);

      try {
        const questionIds = new Set((form.questions || []).map(question => question.id));
        const answerRows = Object.entries(answers)
          .filter(([questionId]) => questionIds.has(questionId))
          .map(([questionId, value]) => ({
            id: generateUUID(),
            response_id: responseId,
            question_id: questionId,
            value
          }));

        if (answerRows.length > 0) {
          const { error: answersError } = await client.from('answers').insert(answerRows);
          if (answersError) throw toSupabaseError(answersError);
        }

        if (form.settings.isEvent) {
          const { error: registrationError } = await client.from('event_registrations').insert({
            id: generateUUID(),
            form_id: formId,
            response_id: responseId,
            participant_name: participantName,
            participant_email: user.email,
            status: 'registered'
          });
          if (registrationError) throw toSupabaseError(registrationError);
        }
      } catch (error) {
        // Roll back the parent response so a half-saved submission is not visible.
        await client.from('responses').delete().eq('id', responseId);
        throw error;
      }

      return { success: true, responseId };
    } catch (error) {
      console.error('Response submission failed:', error);
      return { success: false, error: getErrorMessage(error, 'Submission failed.') };
    }
  },

  async getFormResponses(formId: string): Promise<FormResponse[]> {
    if (!isValidUUID(formId)) return [];

    const client = requireClient();
    const { data, error } = await withSupabaseTimeout(
      signal =>
        client
          .from('responses')
          .select('*, answers(*), event_registrations(*)')
          .eq('form_id', formId)
          .order('submitted_at', { ascending: false })
          .abortSignal(signal),
      'Loading responses from Supabase'
    );

    if (error) throw toSupabaseError(error);

    return ((data || []) as ResponseRow[]).map(row => {
      const answerMap: FormResponse['answers'] = {};
      (row.answers || []).forEach(answer => {
        answerMap[answer.question_id] = answer.value;
      });

      const registration = row.event_registrations?.[0];
      return {
        id: row.id,
        formId: row.form_id,
        respondentId: row.respondent_id,
        respondentEmail: row.respondent_email,
        submittedAt: row.submitted_at,
        answers: answerMap,
        participantName: registration?.participant_name || 'Anonymous Participant',
        registrationStatus: registration?.status || 'confirmed',
        checkedInAt: registration?.checked_in_at || null
      };
    });
  },

  async updateResponseAnswers(
    responseId: string,
    answers: FormResponse['answers']
  ): Promise<void> {
    if (!isValidUUID(responseId)) throw new Error('Invalid response id.');

    const client = requireClient();
    const { error } = await client.rpc('update_form_response_answers', {
      target_response_id: responseId,
      target_answers: answers
    });
    if (error) throw toSupabaseError(error);
  },

  async updateAttendance(
    formId: string,
    responseId: string,
    status: RegistrationStatus
  ): Promise<boolean> {
    if (!isValidUUID(formId) || !isValidUUID(responseId)) {
      throw new Error('Invalid response id.');
    }

    const client = requireClient();
    const { data, error } = await client
      .from('event_registrations')
      .update({
        status,
        checked_in_at: status === 'attended' ? new Date().toISOString() : null
      })
      .eq('form_id', formId)
      .eq('response_id', responseId)
      .select('id')
      .maybeSingle();

    if (error) throw toSupabaseError(error);
    if (!data) throw new Error('Registration not found, or you cannot update it.');
    return true;
  },

  async addCollaborator(
    formId: string,
    userEmail: string,
    role: CollaboratorRole = 'editor'
  ): Promise<FormCollaborator> {
    const client = requireClient();
    if (!isValidUUID(formId)) throw new Error('Invalid form id.');

    const cleanEmail = userEmail.trim().toLowerCase();
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileError) throw toSupabaseError(profileError);
    if (!profile) {
      throw new Error(`No AuraForm account exists for ${cleanEmail}. Ask them to sign up first.`);
    }

    const { data, error } = await client
      .from('form_collaborators')
      .insert({
        id: generateUUID(),
        form_id: formId,
        user_id: profile.id,
        role
      })
      .select('id, form_id, user_id, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('This user is already a collaborator on this form.');
      }
      throw toSupabaseError(error);
    }

    return {
      id: data.id,
      formId: data.form_id,
      userId: data.user_id,
      userEmail: profile.email,
      role: data.role
    };
  },

  async removeCollaborator(formId: string, collaboratorId: string): Promise<boolean> {
    const client = requireClient();
    if (!isValidUUID(formId) || !isValidUUID(collaboratorId)) {
      throw new Error('Invalid collaborator id.');
    }

    const { data, error } = await client
      .from('form_collaborators')
      .delete()
      .eq('id', collaboratorId)
      .eq('form_id', formId)
      .select('id')
      .maybeSingle();

    if (error) throw toSupabaseError(error);
    if (!data) throw new Error('Collaborator not found, or you cannot remove them.');
    return true;
  },

  /**
   * Populates the starter forms when the database has no forms yet.
   * Existing database forms are never modified or removed.
   */
  async seedStarterFormsToSupabase(
    user: UserProfile
  ): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const client = requireClient();
      const { count, error } = await client
        .from('forms')
        .select('id', { count: 'exact', head: true });
      if (error) throw toSupabaseError(error);

      if ((count ?? 0) > 0) {
        return {
          success: true,
          count: count ?? 0,
          message: `Database already contains ${count} form(s). Existing forms were left untouched.`
        };
      }

      for (const starter of STARTER_FORMS) {
        await this.createForm(
          {
            title: starter.title,
            description: starter.description,
            status: starter.status,
            settings: starter.settings,
            questions: starter.questions
          },
          user
        );
      }

      return {
        success: true,
        count: STARTER_FORMS.length,
        message: `Successfully seeded ${STARTER_FORMS.length} starter forms.`
      };
    } catch (error) {
      return {
        success: false,
        count: 0,
        message: getErrorMessage(error, 'Failed to seed starter forms.')
      };
    }
  }
};
