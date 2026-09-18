import { useState } from 'react'
import ErrorMessage from '../ErrorMessage.jsx'
import { Button } from '../ui/button.jsx'
import { Input } from '../ui/input.jsx'
import { Label } from '../ui/label.jsx'
import { Select } from '../ui/select.jsx'
import { Textarea } from '../ui/textarea.jsx'
import { validateInterview } from '../../utils/validators.js'
import { INTERVIEW_TYPES, INTERVIEW_STATUSES } from '../../utils/constants.js'
import { buildInterviewPayload } from '../../utils/interviewForm.js'

const fieldClass = "space-y-1.5"
const rowClass = "grid grid-cols-1 md:grid-cols-2 gap-4"
const errorClass = "text-sm text-destructive"

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
    <>
      {apiError && <ErrorMessage title="Could not save interview" message={apiError.message} errors={apiError.errors} />}

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div className={rowClass}>
          <div className={fieldClass}>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Technical interview with hiring manager"
              maxLength={200}
              value={form.title}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title && <p className={errorClass}>{fieldErrors.title}</p>}
          </div>
          <div className={fieldClass}>
            <Label htmlFor="type">Type</Label>
            <Select id="type" name="type" value={form.type} onChange={updateField}>
              {INTERVIEW_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className={rowClass}>
          <div className={fieldClass}>
            <Label htmlFor="scheduledDate">Scheduled date *</Label>
            <Input
              id="scheduledDate"
              name="scheduledDate"
              type="date"
              value={form.scheduledDate}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.scheduledDate)}
            />
            {fieldErrors.scheduledDate && <p className={errorClass}>{fieldErrors.scheduledDate}</p>}
          </div>
          <div className={fieldClass}>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" value={form.status} onChange={updateField}>
              {INTERVIEW_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className={rowClass}>
          <div className={fieldClass}>
            <Label htmlFor="interviewerNames">Interviewers</Label>
            <Input
              id="interviewerNames"
              name="interviewerNames"
              placeholder="e.g. Sarah Lee, Tom Chen"
              maxLength={500}
              value={form.interviewerNames}
              onChange={updateField}
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="meetingLink">Meeting link</Label>
            <Input
              id="meetingLink"
              name="meetingLink"
              placeholder="https://..."
              value={form.meetingLink}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.meetingLink)}
            />
            {fieldErrors.meetingLink && <p className={errorClass}>{fieldErrors.meetingLink}</p>}
          </div>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="Office address or meeting room"
            maxLength={500}
            value={form.location}
            onChange={updateField}
          />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            maxLength={3000}
            value={form.notes}
            onChange={updateField}
          />
        </div>

        <div className={fieldClass}>
          <Label htmlFor="feedback">Feedback</Label>
          <Textarea
            id="feedback"
            name="feedback"
            rows={4}
            maxLength={3000}
            value={form.feedback}
            onChange={updateField}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </>
  )
}
