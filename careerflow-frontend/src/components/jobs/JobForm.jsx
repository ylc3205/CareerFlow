import { useState } from 'react'
import ErrorMessage from '../ErrorMessage.jsx'
import { buildJobPayload } from '../../utils/jobForm.js'
import { validateJob } from '../../utils/validators.js'

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'internship', 'contract', 'freelance']
const WORKPLACE_TYPES = ['remote', 'hybrid', 'onsite']
const JOB_STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed']
const SALARY_PERIODS = ['hourly', 'monthly', 'yearly']

export default function JobForm({ initialValues, submitLabel = 'Save job', onSubmit, submitting, apiError }) {
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
    const errors = validateJob(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }
    onSubmit(buildJobPayload(form))
  }

  return (
    <form className="form form--card" onSubmit={handleSubmit} noValidate>
      {apiError && <ErrorMessage title="Could not save job" message={apiError.message} errors={apiError.errors} />}

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="title">
            Title *
          </label>
          <input
            id="title"
            name="title"
            className="form__input"
            placeholder="e.g. Senior Frontend Engineer"
            maxLength={300}
            value={form.title}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.title)}
          />
          {fieldErrors.title && <p className="form__error">{fieldErrors.title}</p>}
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="company">
            Company *
          </label>
          <input
            id="company"
            name="company"
            className="form__input"
            placeholder="e.g. Acme Inc."
            maxLength={200}
            value={form.company}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.company)}
          />
          {fieldErrors.company && <p className="form__error">{fieldErrors.company}</p>}
        </div>
      </div>

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            className="form__input"
            placeholder="City, Country"
            maxLength={200}
            value={form.location}
            onChange={updateField}
          />
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="form__input" value={form.status} onChange={updateField}>
            {JOB_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="employmentType">
            Employment type
          </label>
          <select
            id="employmentType"
            name="employmentType"
            className="form__input"
            value={form.employmentType}
            onChange={updateField}
          >
            <option value="">Not specified</option>
            {EMPLOYMENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="workplaceType">
            Workplace type
          </label>
          <select
            id="workplaceType"
            name="workplaceType"
            className="form__input"
            value={form.workplaceType}
            onChange={updateField}
          >
            <option value="">Not specified</option>
            {WORKPLACE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          className="form__input form__textarea"
          rows={5}
          maxLength={10000}
          placeholder="Paste the job description"
          value={form.description}
          onChange={updateField}
        />
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="requirements">
          Requirements
        </label>
        <textarea
          id="requirements"
          name="requirements"
          className="form__input form__textarea"
          rows={4}
          maxLength={5000}
          value={form.requirements}
          onChange={updateField}
        />
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="responsibilities">
          Responsibilities
        </label>
        <textarea
          id="responsibilities"
          name="responsibilities"
          className="form__input form__textarea"
          rows={4}
          maxLength={5000}
          value={form.responsibilities}
          onChange={updateField}
        />
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="skills">
          Skills
        </label>
        <input
          id="skills"
          name="skills"
          className="form__input"
          placeholder="JavaScript, React, Node.js"
          value={form.skills}
          onChange={updateField}
        />
      </div>

      <section className="form__section">
        <h2 className="form__section-title">Salary</h2>
        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="salaryMin">
              Minimum
            </label>
            <input
              id="salaryMin"
              name="salaryMin"
              type="number"
              min="0"
              className="form__input"
              value={form.salaryMin}
              onChange={updateField}
            />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="salaryMax">
              Maximum
            </label>
            <input
              id="salaryMax"
              name="salaryMax"
              type="number"
              min="0"
              className="form__input"
              value={form.salaryMax}
              onChange={updateField}
            />
          </div>
        </div>
        <div className="form__row">
          <div className="form__field">
            <label className="form__label" htmlFor="salaryCurrency">
              Currency
            </label>
            <input
              id="salaryCurrency"
              name="salaryCurrency"
              className="form__input"
              maxLength={10}
              value={form.salaryCurrency}
              onChange={updateField}
            />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="salaryPeriod">
              Period
            </label>
            <select id="salaryPeriod" name="salaryPeriod" className="form__input" value={form.salaryPeriod} onChange={updateField}>
              <option value="">Not specified</option>
              {SALARY_PERIODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="postedAt">
            Posted date
          </label>
          <input id="postedAt" name="postedAt" type="date" className="form__input" value={form.postedAt} onChange={updateField} />
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="deadline">
            Deadline
          </label>
          <input id="deadline" name="deadline" type="date" className="form__input" value={form.deadline} onChange={updateField} />
        </div>
      </div>

      <div className="form__row">
        <div className="form__field">
          <label className="form__label" htmlFor="source">
            Source
          </label>
          <input
            id="source"
            name="source"
            className="form__input"
            placeholder="e.g. LinkedIn, Company website"
            maxLength={200}
            value={form.source}
            onChange={updateField}
          />
        </div>
        <div className="form__field">
          <label className="form__label" htmlFor="sourceUrl">
            Source URL
          </label>
          <input
            id="sourceUrl"
            name="sourceUrl"
            className="form__input"
            placeholder="https://..."
            value={form.sourceUrl}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.sourceUrl)}
          />
          {fieldErrors.sourceUrl && <p className="form__error">{fieldErrors.sourceUrl}</p>}
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
          rows={3}
          maxLength={2000}
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
