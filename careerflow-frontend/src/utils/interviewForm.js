import { compact, toDateInputValue } from './format.js'

// Interview form model helpers. The backend Interview schema is the source of
// truth. The form is reused for creating an interview from an application
// detail page (application id auto-supplied) and for editing one from the
// interview detail page.
export const emptyInterviewForm = () => ({
  title: '',
  type: 'video',
  scheduledDate: '',
  status: 'scheduled',
  interviewerNames: '',
  meetingLink: '',
  location: '',
  notes: '',
  feedback: '',
})

export const hydrateInterviewForm = (interview) => ({
  title: interview.title ?? '',
  type: interview.type ?? 'video',
  scheduledDate: toDateInputValue(interview.scheduledDate),
  status: interview.status ?? 'scheduled',
  interviewerNames: interview.interviewerNames ?? '',
  meetingLink: interview.meetingLink ?? '',
  location: interview.location ?? '',
  notes: interview.notes ?? '',
  feedback: interview.feedback ?? '',
})

export const buildInterviewPayload = (form, { includeApplicationId = false, applicationId } = {}) => {
  const payload = compact({
    title: String(form.title || '').trim(),
    type: form.type || undefined,
    scheduledDate: form.scheduledDate || undefined,
    status: form.status || undefined,
    interviewerNames: String(form.interviewerNames || '').trim() || undefined,
    meetingLink: String(form.meetingLink || '').trim() || undefined,
    location: String(form.location || '').trim() || undefined,
    notes: String(form.notes || '').trim() || undefined,
    feedback: String(form.feedback || '').trim() || undefined,
  })
  if (includeApplicationId && applicationId) payload.application = applicationId
  return payload
}