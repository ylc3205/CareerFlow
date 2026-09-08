import { useState, useEffect, useCallback } from 'react'
import ErrorMessage from '../ErrorMessage.jsx'
import { Button } from '../ui/button.jsx'
import { Input } from '../ui/input.jsx'
import { Label } from '../ui/label.jsx'
import { Textarea } from '../ui/textarea.jsx'
import { splitList, joinList, splitLines, joinLines, deepEqual } from '../../utils/format.js'
import CareerLevelSelector from './CareerLevelSelector.jsx'
import FocusAreaSelector from './FocusAreaSelector.jsx'

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
  focusSkills: [],
  targetRoles: [],
  baseType: 'resume',
  careerLevel: 'unspecified',
  primaryFocus: [],
  secondaryFocus: [],
  learningPriorities: [],
  rationale: '',
  suggestedNextSteps: [],
}

export const hydrateCareerDirectionForm = (dir) => ({
  title: dir.title || '',
  description: dir.description || '',
  focusSkills: Array.isArray(dir.focusSkills) ? dir.focusSkills : [],
  targetRoles: Array.isArray(dir.targetRoles) ? dir.targetRoles : [],
  baseType: dir.baseType || 'resume',
  careerLevel: dir.careerLevel || 'unspecified',
  primaryFocus: Array.isArray(dir.primaryFocus) ? dir.primaryFocus : [],
  secondaryFocus: Array.isArray(dir.secondaryFocus) ? dir.secondaryFocus : [],
  learningPriorities: Array.isArray(dir.learningPriorities) ? dir.learningPriorities : [],
  rationale: dir.rationale || '',
  suggestedNextSteps: Array.isArray(dir.suggestedNextSteps) ? dir.suggestedNextSteps : [],
})

const normalizePayload = (d) => ({
  title: String(d.title || '').trim(),
  description: String(d.description || '').trim(),
  focusSkills: splitList(Array.isArray(d.focusSkills) ? joinList(d.focusSkills) : d.focusSkills),
  targetRoles: splitList(Array.isArray(d.targetRoles) ? joinList(d.targetRoles) : d.targetRoles),
  baseType: d.baseType || 'resume',
  careerLevel: d.careerLevel || 'unspecified',
  primaryFocus: Array.isArray(d.primaryFocus) ? d.primaryFocus : [],
  secondaryFocus: Array.isArray(d.secondaryFocus) ? d.secondaryFocus : [],
  learningPriorities: splitLines(Array.isArray(d.learningPriorities) ? joinLines(d.learningPriorities) : d.learningPriorities),
  rationale: String(d.rationale || '').trim(),
  suggestedNextSteps: splitLines(Array.isArray(d.suggestedNextSteps) ? joinLines(d.suggestedNextSteps) : d.suggestedNextSteps),
})

export default function CareerDirectionForm({
  initialValues,
  submitLabel = 'Save direction',
  onSubmit,
  submitting,
  apiError,
  isAIEdit = false,
  onCancel,
  onDirtyChange,
}) {
  const [form, setForm] = useState(() => ({
    title: initialValues.title || '',
    description: initialValues.description || '',
    focusSkillsText: joinList(initialValues.focusSkills || []),
    targetRolesText: joinList(initialValues.targetRoles || []),
    baseType: initialValues.baseType || 'resume',
    careerLevel: initialValues.careerLevel || 'unspecified',
    primaryFocus: initialValues.primaryFocus || [],
    secondaryFocus: initialValues.secondaryFocus || [],
    learningPrioritiesText: joinLines(initialValues.learningPriorities || []),
    rationale: initialValues.rationale || '',
    suggestedNextStepsText: joinLines(initialValues.suggestedNextSteps || []),
  }))

  const [fieldErrors, setFieldErrors] = useState({})

  const buildPayload = useCallback(() => ({
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    focusSkills: splitList(form.focusSkillsText),
    targetRoles: splitList(form.targetRolesText),
    baseType: form.baseType,
    careerLevel: form.careerLevel === 'unspecified' ? undefined : form.careerLevel,
    primaryFocus: form.primaryFocus.length > 0 ? form.primaryFocus : undefined,
    secondaryFocus: form.secondaryFocus.length > 0 ? form.secondaryFocus : undefined,
    learningPriorities: splitLines(form.learningPrioritiesText).length > 0 ? splitLines(form.learningPrioritiesText) : undefined,
    rationale: isAIEdit ? (form.rationale.trim() || undefined) : undefined,
    suggestedNextSteps: splitLines(form.suggestedNextStepsText).length > 0 ? splitLines(form.suggestedNextStepsText) : undefined,
  }), [form, isAIEdit])

  const snapshotRef = useState(() => normalizePayload(initialValues))[0]
  const current = normalizePayload(buildPayload())
  const isDirty = !deepEqual(snapshotRef, current)

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    setForm({
      title: initialValues.title || '',
      description: initialValues.description || '',
      focusSkillsText: joinList(initialValues.focusSkills || []),
      targetRolesText: joinList(initialValues.targetRoles || []),
      baseType: initialValues.baseType || 'resume',
      careerLevel: initialValues.careerLevel || 'unspecified',
      primaryFocus: initialValues.primaryFocus || [],
      secondaryFocus: initialValues.secondaryFocus || [],
      learningPrioritiesText: joinLines(initialValues.learningPriorities || []),
      rationale: initialValues.rationale || '',
      suggestedNextStepsText: joinLines(initialValues.suggestedNextSteps || []),
    })
    setFieldErrors({})
  }, [initialValues])

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

    const skills = splitList(form.focusSkillsText)
    if (skills.length > 20) {
      errors.focusSkillsText = 'Maximum 20 skills'
    } else if (skills.some((s) => s.length > 100)) {
      errors.focusSkillsText = 'Each skill must be 100 characters or fewer'
    }

    const roles = splitList(form.targetRolesText)
    if (roles.length > 20) {
      errors.targetRolesText = 'Maximum 20 target roles'
    } else if (roles.some((r) => r.length > 200)) {
      errors.targetRolesText = 'Each target role must be 200 characters or fewer'
    }

    if (isAIEdit) {
      const priorities = splitLines(form.learningPrioritiesText)
      if (priorities.length > 10) {
        errors.learningPrioritiesText = 'Maximum 10 learning priorities'
      } else if (priorities.some((p) => p.length > 200)) {
        errors.learningPrioritiesText = 'Each learning priority must be 200 characters or fewer'
      }

      if (form.rationale.length > 1000) {
        errors.rationale = 'Rationale must be 1000 characters or fewer'
      }

      const steps = splitLines(form.suggestedNextStepsText)
      if (steps.length > 10) {
        errors.suggestedNextStepsText = 'Maximum 10 suggested next steps'
      } else if (steps.some((s) => s.length > 200)) {
        errors.suggestedNextStepsText = 'Each suggested next step must be 200 characters or fewer'
      }

      if (form.primaryFocus.length > 5) {
        errors.primaryFocus = 'Maximum 5 primary focus areas'
      }
      if (form.secondaryFocus.length > 3) {
        errors.secondaryFocus = 'Maximum 3 secondary focus areas'
      }

      const duplicates = form.primaryFocus.filter((f) => form.secondaryFocus.includes(f))
      if (duplicates.length > 0) {
        errors.primaryFocus = 'Focus areas cannot be both primary and secondary'
        errors.secondaryFocus = 'Focus areas cannot be both primary and secondary'
      }
    }

    return errors
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      focusSkills: splitList(form.focusSkillsText),
      targetRoles: splitList(form.targetRolesText),
      baseType: form.baseType,
    }

    if (isAIEdit) {
      payload.careerLevel = form.careerLevel === 'unspecified' ? undefined : form.careerLevel
      payload.primaryFocus = form.primaryFocus.length > 0 ? form.primaryFocus : undefined
      payload.secondaryFocus = form.secondaryFocus.length > 0 ? form.secondaryFocus : undefined
      payload.learningPriorities = splitLines(form.learningPrioritiesText).length > 0 ? splitLines(form.learningPrioritiesText) : undefined
      payload.rationale = form.rationale.trim() || undefined
      payload.suggestedNextSteps = splitLines(form.suggestedNextStepsText).length > 0 ? splitLines(form.suggestedNextStepsText) : undefined
    }

    onSubmit(payload)
  }

  const handleCancel = () => {
    onCancel?.()
  }

  return (
    <>
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
            <Label htmlFor="focusSkillsText">Focus skills</Label>
            <Input
              id="focusSkillsText"
              name="focusSkillsText"
              className={inputClass}
              placeholder="e.g. Node.js, Express, MongoDB"
              value={form.focusSkillsText}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.focusSkillsText)}
            />
            {fieldErrors.focusSkillsText && <p className={errorClass}>{fieldErrors.focusSkillsText}</p>}
            <p className="text-xs text-muted-foreground">Comma-separated list</p>
          </div>
          <div className={fieldClass}>
            {isAIEdit ? (
              <>
                <Label>Base type</Label>
                <div className="flex h-9 items-center rounded-sm border border-border bg-muted/50 px-3 text-sm text-muted-foreground">
                  {form.baseType}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className={fieldClass}>
          <Label htmlFor="targetRolesText">Target roles</Label>
          <Input
            id="targetRolesText"
            name="targetRolesText"
            className={inputClass}
            placeholder="e.g. Senior Backend Engineer, Tech Lead"
            value={form.targetRolesText}
            onChange={updateField}
            aria-invalid={Boolean(fieldErrors.targetRolesText)}
          />
          {fieldErrors.targetRolesText && <p className={errorClass}>{fieldErrors.targetRolesText}</p>}
          <p className="text-xs text-muted-foreground">Comma-separated list</p>
        </div>

        {isAIEdit && (
          <>
            <div className={rowClass}>
              <CareerLevelSelector
                value={form.careerLevel}
                onChange={(value) => setForm((prev) => ({ ...prev, careerLevel: value }))}
                error={fieldErrors.careerLevel}
                disabled={submitting}
              />
            </div>

            <FocusAreaSelector
              primaryFocus={form.primaryFocus}
              secondaryFocus={form.secondaryFocus}
              onPrimaryChange={(v) => setForm((prev) => ({ ...prev, primaryFocus: v }))}
              onSecondaryChange={(v) => setForm((prev) => ({ ...prev, secondaryFocus: v }))}
              primaryError={fieldErrors.primaryFocus}
              secondaryError={fieldErrors.secondaryFocus}
              disabled={submitting}
            />

            <div className={fieldClass}>
              <Label htmlFor="learningPrioritiesText">Learning priorities</Label>
              <Textarea
                id="learningPrioritiesText"
                name="learningPrioritiesText"
                className={textareaClass}
                rows={3}
                placeholder={"One item per line, e.g.\nSystem Design\nKubernetes\nAWS"}
                value={form.learningPrioritiesText}
                onChange={updateField}
                aria-invalid={Boolean(fieldErrors.learningPrioritiesText)}
              />
              {fieldErrors.learningPrioritiesText && <p className={errorClass}>{fieldErrors.learningPrioritiesText}</p>}
              <p className="text-xs text-muted-foreground">One item per line</p>
            </div>

            <div className={fieldClass}>
              <Label>AI Rationale</Label>
              <div className="min-h-[80px] whitespace-pre-wrap rounded-sm border border-border bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                {form.rationale || 'No rationale provided.'}
              </div>
            </div>

            <div className={fieldClass}>
              <Label htmlFor="suggestedNextStepsText">Suggested next steps</Label>
              <Textarea
                id="suggestedNextStepsText"
                name="suggestedNextStepsText"
                className={textareaClass}
                rows={3}
                placeholder={"One item per line, e.g.\nComplete Node.js course\nBuild portfolio project"}
                value={form.suggestedNextStepsText}
                onChange={updateField}
                aria-invalid={Boolean(fieldErrors.suggestedNextStepsText)}
              />
              {fieldErrors.suggestedNextStepsText && <p className={errorClass}>{fieldErrors.suggestedNextStepsText}</p>}
              <p className="text-xs text-muted-foreground">One item per line</p>
            </div>
          </>
        )}

        <div className="flex items-center gap-3 border-t border-border pt-6">
          {isAIEdit && onCancel && (
            <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting || (isAIEdit && !isDirty)}>
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </>
  )
}
