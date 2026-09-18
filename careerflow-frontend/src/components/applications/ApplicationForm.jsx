import { useState } from 'react'
import ErrorMessage from '../ErrorMessage.jsx'
import { Button } from '../ui/button.jsx'
import { Input } from '../ui/input.jsx'
import { Label } from '../ui/label.jsx'
import { Textarea } from '../ui/textarea.jsx'
import { Select } from '../ui/select.jsx'
import { APPLICATION_STATUSES } from '../../utils/constants.js'
import { buildApplicationPayload } from '../../utils/applicationForm.js'

const fieldClass = "space-y-1.5"
const rowClass = "grid grid-cols-1 md:grid-cols-2 gap-4"

export default function ApplicationForm({ initialValues, submitLabel = 'Save changes', onSubmit, submitting, apiError }) {
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
    onSubmit(buildApplicationPayload(form))
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {apiError && <ErrorMessage title="Could not save application" message={apiError.message} errors={apiError.errors} />}

      <div className={rowClass}>
        <div className={fieldClass}>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" value={form.status} onChange={updateField}>
            {APPLICATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
        <div className={fieldClass}>
          <Label htmlFor="appliedAt">Applied date</Label>
          <Input id="appliedAt" name="appliedAt" type="date" value={form.appliedAt} onChange={updateField} />
        </div>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="coverLetter">Cover letter</Label>
        <Textarea
          id="coverLetter"
          name="coverLetter"
          rows={6}
          maxLength={10000}
          value={form.coverLetter}
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

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}