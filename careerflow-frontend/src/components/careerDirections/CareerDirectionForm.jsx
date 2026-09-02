import { useState } from 'react'
import ErrorMessage from '../ErrorMessage.jsx'
import { Button } from '../ui/button.jsx'
import { Input } from '../ui/input.jsx'
import { Label } from '../ui/label.jsx'
import { Textarea } from '../ui/textarea.jsx'
import { splitList } from '../../utils/format.js'

const BASE_TYPES = ['profile', 'resume']

const inputClass = "flex h-9 w-full rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
const textareaClass = `${inputClass} min-h-[80px] resize-y`
const selectClass = inputClass
const fieldClass = "space-y-1.5"
const rowClass = "grid grid-cols-1 md:grid-cols-2 gap-4"
const errorClass = "text-sm text-destructive"

export const emptyCareerDirectionForm = {
  title: '',
  description: '',
  focusSkills: '',
  targetRoles: '',
  baseType: 'resume',
}

export const hydrateCareerDirectionForm = (dir) => ({
  title: dir.title || '',
  description: dir.description || '',
  focusSkills: (dir.focusSkills || []).join(', '),
  targetRoles: (dir.targetRoles || []).join(', '),
  baseType: dir.baseType || 'resume',
})

export default function CareerDirectionForm({ initialValues, submitLabel = 'Save direction', onSubmit, submitting, apiError }) {
  const [form, setForm] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState({})

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validate = () => {
    const errors = {}

    if (!form.title.trim()) {
      errors.title = 'Title is required'
    } else if (form.title.length > 200) {
      errors.title = 'Title must be 200 characters or fewer'
    }

    if (form.description.length > 500) {
      errors.description = 'Description must be 500 characters or fewer'
    }

    const skills = splitList(form.focusSkills)
    if (skills.length > 20) {
      errors.focusSkills = 'Maximum 20 skills'
    } else if (skills.some((s) => s.length > 100)) {
      errors.focusSkills = 'Each skill must be 100 characters or fewer'
    }

    const roles = splitList(form.targetRoles)
    if (roles.length > 20) {
      errors.targetRoles = 'Maximum 20 target roles'
    } else if (roles.some((r) => r.length > 200)) {
      errors.targetRoles = 'Each target role must be 200 characters or fewer'
    }

    return errors
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      focusSkills: splitList(form.focusSkills),
      targetRoles: splitList(form.targetRoles),
      baseType: form.baseType,
    })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {apiError && <ErrorMessage title="Could not save career direction" message={apiError.message} errors={apiError.errors} />}

      <div className={fieldClass}>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          className={inputClass}
          placeholder="e.g. Backend Developer"
          maxLength={200}
          value={form.title}
          onChange={updateField}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title && <p className={errorClass}>{fieldErrors.title}</p>}
      </div>

      <div className={fieldClass}>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          className={textareaClass}
          rows={4}
          maxLength={500}
          placeholder="Describe this career direction..."
          value={form.description}
          onChange={updateField}
          aria-invalid={Boolean(fieldErrors.description)}
        />
        {fieldErrors.description && <p className={errorClass}>{fieldErrors.description}</p>}
      </div>

      <div className={rowClass}>
        <div className={fieldClass}>
          <Label htmlFor="focusSkills">Focus skills</Label>
          <Input
            id="focusSkills"
            name="focusSkills"
            className={inputClass}
            placeholder="e.g. Node.js, Express, MongoDB"
            value={form.focusSkills}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.focusSkills)}
          />
          {fieldErrors.focusSkills && <p className={errorClass}>{fieldErrors.focusSkills}</p>}
          <p className="text-xs text-muted-foreground">Comma-separated list</p>
        </div>
        <div className={fieldClass}>
          <Label htmlFor="baseType">Base type *</Label>
          <select
            id="baseType"
            name="baseType"
            className={selectClass}
            value={form.baseType}
            onChange={updateField}
          >
            {BASE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="targetRoles">Target roles</Label>
        <Input
          id="targetRoles"
          name="targetRoles"
          className={inputClass}
          placeholder="e.g. Senior Backend Engineer, Tech Lead"
          value={form.targetRoles}
          onChange={updateField}
          aria-invalid={Boolean(fieldErrors.targetRoles)}
        />
        {fieldErrors.targetRoles && <p className={errorClass}>{fieldErrors.targetRoles}</p>}
        <p className="text-xs text-muted-foreground">Comma-separated list</p>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
