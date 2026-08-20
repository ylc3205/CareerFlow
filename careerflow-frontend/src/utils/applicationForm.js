import { toDateInputValue } from './format.js'

// Application form model helpers. The backend Application schema is the
// source of truth. Applications are created only via the "Apply" action on a
// job detail page (POST { job }); this form is used to EDIT an application.
export const emptyApplicationForm = () => ({
  status: 'applied',
  appliedAt: '',
  coverLetter: '',
  notes: '',
})

export const hydrateApplicationForm = (application) => ({
  status: application.status || 'applied',
  appliedAt: toDateInputValue(application.appliedAt),
  coverLetter: application.coverLetter || '',
  notes: application.notes || '',
})

export const buildApplicationPayload = (form) => {
  const payload = { status: form.status }
  if (form.appliedAt) payload.appliedAt = form.appliedAt
  // Always include the free-text fields (even when empty) so a cleared box
  // is sent as '' and $set actually clears the stored value.
  payload.coverLetter = String(form.coverLetter || '').trim()
  payload.notes = String(form.notes || '').trim()
  return payload
}