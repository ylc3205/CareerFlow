import { useEffect, useState } from 'react'
import ErrorMessage from '../ErrorMessage.jsx'
import { Button } from '../ui/button.jsx'
import { Input } from '../ui/input.jsx'
import { Label } from '../ui/label.jsx'
import { Select } from '../ui/select.jsx'
import { Textarea } from '../ui/textarea.jsx'
import { buildJobPayload } from '../../utils/jobForm.js'
import { validateJob } from '../../utils/validators.js'

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'internship', 'contract', 'freelance']
const WORKPLACE_TYPES = ['remote', 'hybrid', 'onsite']
const JOB_STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed']
const SALARY_PERIODS = ['hourly', 'monthly', 'yearly']

const fieldClass = "space-y-1.5"
const rowClass = "grid grid-cols-1 md:grid-cols-2 gap-4"
const sectionClass = "border-t border-border pt-6"
const sectionTitleClass = "text-lg font-semibold tracking-tight"
const errorClass = "text-sm text-destructive"

export default function JobForm({ initialValues, submitLabel = 'Save job', onSubmit, submitting, apiError }) {
  const [form, setForm] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState({})

  // Keep the form in sync when the parent swaps initialValues (e.g. navigating
  // from an edit page back to create mode) so stale hydrated values never leak.
  useEffect(() => {
    setForm(initialValues)
  }, [initialValues])

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
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {apiError && <ErrorMessage title="Could not save job" message={apiError.message} errors={apiError.errors} />}

      <div className={rowClass}>
        <div className={fieldClass}>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Senior Frontend Engineer"
            maxLength={300}
            value={form.title}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.title)}
          />
          {fieldErrors.title && <p className={errorClass}>{fieldErrors.title}</p>}
        </div>
        <div className={fieldClass}>
          <Label htmlFor="company">Company *</Label>
          <Input
            id="company"
            name="company"
            placeholder="e.g. Acme Inc."
            maxLength={200}
            value={form.company}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.company)}
          />
          {fieldErrors.company && <p className={errorClass}>{fieldErrors.company}</p>}
        </div>
      </div>

      <div className={rowClass}>
        <div className={fieldClass}>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="City, Country"
            maxLength={200}
            value={form.location}
            onChange={updateField}
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" value={form.status} onChange={updateField}>
            {JOB_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className={rowClass}>
        <div className={fieldClass}>
          <Label htmlFor="employmentType">Employment type</Label>
          <Select id="employmentType" name="employmentType" value={form.employmentType} onChange={updateField}>
            <option value="">Not specified</option>
            {EMPLOYMENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
        <div className={fieldClass}>
          <Label htmlFor="workplaceType">Workplace type</Label>
          <Select id="workplaceType" name="workplaceType" value={form.workplaceType} onChange={updateField}>
            <option value="">Not specified</option>
            {WORKPLACE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          className="min-h-[80px] resize-y"
          rows={5}
          maxLength={10000}
          placeholder="Paste the job description"
          value={form.description}
          onChange={updateField}
        />
      </div>

      <div className={fieldClass}>
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea
          id="requirements"
          name="requirements"
          className="min-h-[80px] resize-y"
          rows={4}
          maxLength={5000}
          value={form.requirements}
          onChange={updateField}
        />
      </div>

      <div className={fieldClass}>
        <Label htmlFor="responsibilities">Responsibilities</Label>
        <Textarea
          id="responsibilities"
          name="responsibilities"
          className="min-h-[80px] resize-y"
          rows={4}
          maxLength={5000}
          value={form.responsibilities}
          onChange={updateField}
        />
      </div>

      <div className={fieldClass}>
        <Label htmlFor="skills">Skills</Label>
        <Input
          id="skills"
          name="skills"
          placeholder="JavaScript, React, Node.js"
          maxLength={200}
          value={form.skills}
          onChange={updateField}
        />
      </div>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Salary</h2>
        <div className={rowClass}>
          <div className={fieldClass}>
            <Label htmlFor="salaryMin">Minimum</Label>
            <Input
              id="salaryMin"
              name="salaryMin"
              type="number"
              min="0"
              value={form.salaryMin}
              onChange={updateField}
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="salaryMax">Maximum</Label>
            <Input
              id="salaryMax"
              name="salaryMax"
              type="number"
              min="0"
              value={form.salaryMax}
              onChange={updateField}
            />
          </div>
        </div>
        <div className={rowClass}>
          <div className={fieldClass}>
            <Label htmlFor="salaryCurrency">Currency</Label>
            <Input
              id="salaryCurrency"
              name="salaryCurrency"
              maxLength={10}
              value={form.salaryCurrency}
              onChange={updateField}
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="salaryPeriod">Period</Label>
            <Select id="salaryPeriod" name="salaryPeriod" value={form.salaryPeriod} onChange={updateField}>
              <option value="">Not specified</option>
              {SALARY_PERIODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <div className={rowClass}>
        <div className={fieldClass}>
          <Label htmlFor="postedAt">Posted date</Label>
          <Input id="postedAt" name="postedAt" type="date" value={form.postedAt} onChange={updateField} />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="deadline">Deadline</Label>
          <Input id="deadline" name="deadline" type="date" value={form.deadline} onChange={updateField} />
        </div>
      </div>

      <div className={rowClass}>
        <div className={fieldClass}>
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            name="source"
            placeholder="e.g. LinkedIn, Company website"
            maxLength={200}
            value={form.source}
            onChange={updateField}
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input
            id="sourceUrl"
            name="sourceUrl"
            placeholder="https://..."
            value={form.sourceUrl}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.sourceUrl)}
          />
          {fieldErrors.sourceUrl && <p className={errorClass}>{fieldErrors.sourceUrl}</p>}
        </div>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          className="min-h-[80px] resize-y"
          rows={3}
          maxLength={2000}
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
