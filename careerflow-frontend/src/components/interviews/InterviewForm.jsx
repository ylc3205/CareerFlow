import { useState } from 'react'
import ErrorMessage from '../ErrorMessage.jsx'
import { validateInterview } from '../../utils/validators.js'
import { INTERVIEW_TYPES, INTERVIEW_STATUSES } from '../../utils/constants.js'
import { buildInterviewPayload } from '../../utils/interviewForm.js'

// Reusable for creating an interview from an application detail page (the
// `applicationId` prop is then supplied) and for editing one from the interview
// detail page (the application id is resolved from the interview, never editable).
export default function InterviewForm({ initialValues, applicationId, submitLabel = 'Save interview', onSubmit, submitting, apiError }) {
  const [form, setForm] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState({})

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const errors = validateInterview(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }
    const payload = buildInterviewPayload(form, {
      includeApplicationId: Boolean(applicationId),
      applicationId,
    })
    onSubmit(payload)
  }

  return (
    <form className="form form--card" onSubmit={handleSubmit} noValidate>
      {apiError && <ErrorMessage title="Could not save interview" message={apiError.message} errors={apiError.errors} />}

      <div className="form__field">
        <label className="form__label" htmlFor="title">
          Title *
        </label>
        <input
          id="title"
          name="title"
          className="form__input"
          placeholder="e.g. Technical interview with hiring manager"
          maxLength={200}
          value={form.title}
          onChange={updateField}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title && <p className="form__error">{fieldErrors.title}</p>}
      </div>

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" className="form__input" value={form.type} onChange={updateField}>
            {INTERVIEW_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="scheduledDate">
            Scheduled date *
          </label>
          <input
            id="scheduledDate"
            name="scheduledDate"
            type="date"
            className="form__input"
            value={form.scheduledDate}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.scheduledDate)}
          />
          {fieldErrors.scheduledDate && <p className="form__error">{fieldErrors.scheduledDate}</p>}
        </div>
      </div>

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="form__input" value={form.status} onChange={updateField}>
            {INTERVIEW_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="interviewerNames">
            Interviewers
          </label>
          <input
            id="interviewerNames"
            name="interviewerNames"
            className="form__input"
            placeholder="e.g. Sarah Lee, Tom Chen"
            maxLength={500}
            value={form.interviewerNames}
            onChange={updateField}
          />
        </div>
      </div>

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="meetingLink">
            Meeting link
          </label>
          <input
            id="meetingLink"
            name="meetingLink"
            className="form__input"
            placeholder="https://..."
            value={form.meetingLink}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.meetingLink)}
          />
          {fieldErrors.meetingLink && <p className="form__error">{fieldErrors.meetingLink}</p>}
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            className="form__input"
            placeholder="Office address or meeting room"
            maxLength={500}
            value={form.location}
            onChange={updateField}
          />
        </div>
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          className="form__input form__textarea"
          rows={4}
          maxLength={3000}
          value={form.notes}
          onChange={updateField}
        />
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="feedback">
          Feedback
        </label>
        <textarea
          id="feedback"
          name="feedback"
          className="form__input form__textarea"
          rows={4}
          maxLength={3000}
          value={form.feedback}
          onChange={updateField}
        />
      </div>

      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}