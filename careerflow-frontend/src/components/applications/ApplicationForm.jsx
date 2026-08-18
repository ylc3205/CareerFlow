import { useState } from 'react'
import ErrorMessage from '../ErrorMessage.jsx'
import { APPLICATION_STATUSES } from '../../utils/constants.js'
import { buildApplicationPayload } from '../../utils/applicationForm.js'

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
    <form className="form form--card" onSubmit={handleSubmit} noValidate>
      {apiError && <ErrorMessage title="Could not save application" message={apiError.message} errors={apiError.errors} />}

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="form__input" value={form.status} onChange={updateField}>
            {APPLICATION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="appliedAt">
            Applied date
          </label>
          <input id="appliedAt" name="appliedAt" type="date" className="form__input" value={form.appliedAt} onChange={updateField} />
        </div>
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="coverLetter">
          Cover letter
        </label>
        <textarea
          id="coverLetter"
          name="coverLetter"
          className="form__input form__textarea"
          rows={6}
          maxLength={10000}
          value={form.coverLetter}
          onChange={updateField}
        />
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

      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}