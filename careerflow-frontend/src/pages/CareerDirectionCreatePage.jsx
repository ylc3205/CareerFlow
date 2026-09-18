import { useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { Button } from '../components/ui/button.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import CreateModeSelector from '../components/careerDirections/CreateModeSelector.jsx'
import AIdeaInputForm from '../components/careerDirections/AIdeaInputForm.jsx'
import AIBackgroundInputForm from '../components/careerDirections/AIBackgroundInputForm.jsx'
import TemplateInputForm from '../components/careerDirections/TemplateInputForm.jsx'
import CareerDirectionPreview from '../components/careerDirections/CareerDirectionPreview.jsx'
import CareerDirectionForm, { hydrateCareerDirectionForm } from '../components/careerDirections/CareerDirectionForm.jsx'
import { generateCareerDirectionApi, createCareerDirectionApi } from '../api/careerDirections.api.js'

const INITIAL_AI_VALUES = {
  userIdea: '',
  targetRole: '',
  careerLevel: 'unspecified',
  primaryFocus: [],
  secondaryFocus: [],
  contextSources: { resume: false, profile: false, existingDirections: false },
  templateRole: '',
}

const MODE_STEPS = {
  manual: 'redirect',
  ai_from_idea: 'input',
  ai_from_background: 'input',
  template_based: 'input',
}

const CAREER_LEVELS = ['intern', 'junior', 'mid', 'senior', 'unspecified']

const validateDraft = (draft) => {
  draft ??= {}
  const errors = {}

  const title = String(draft.title || '').trim()
  if (!title) {
    errors.title = 'Title is required'
  } else if (title.length > 200) {
    errors.title = 'Title must be 200 characters or fewer'
  }

  if (String(draft.description || '').length > 500) {
    errors.description = 'Description must be 500 characters or fewer'
  }

  const skills = Array.isArray(draft.focusSkills) ? draft.focusSkills : []
  if (skills.length > 20) {
    errors.focusSkills = 'Maximum 20 skills'
  } else if (skills.some((s) => s.length > 100)) {
    errors.focusSkills = 'Each skill must be 100 characters or fewer'
  }

  const roles = Array.isArray(draft.targetRoles) ? draft.targetRoles : []
  if (roles.length > 20) {
    errors.targetRoles = 'Maximum 20 target roles'
  } else if (roles.some((r) => r.length > 200)) {
    errors.targetRoles = 'Each target role must be 200 characters or fewer'
  }

  if (draft.careerLevel && !CAREER_LEVELS.includes(draft.careerLevel)) {
    errors.careerLevel = 'Invalid career level'
  }

  const primary = Array.isArray(draft.primaryFocus) ? draft.primaryFocus : []
  const secondary = Array.isArray(draft.secondaryFocus) ? draft.secondaryFocus : []
  if (primary.length > 5) {
    errors.primaryFocus = 'Maximum 5 primary focus areas'
  }
  if (secondary.length > 3) {
    errors.secondaryFocus = 'Maximum 3 secondary focus areas'
  }
  if (primary.filter((f) => secondary.includes(f)).length > 0) {
    errors.primaryFocus = 'Focus areas cannot be both primary and secondary'
    errors.secondaryFocus = 'Focus areas cannot be both primary and secondary'
  }

  const priorities = Array.isArray(draft.learningPriorities) ? draft.learningPriorities : []
  if (priorities.length > 10) {
    errors.learningPriorities = 'Maximum 10 learning priorities'
  } else if (priorities.some((p) => p.length > 200)) {
    errors.learningPriorities = 'Each learning priority must be 200 characters or fewer'
  }

  if (String(draft.rationale || '').length > 1000) {
    errors.rationale = 'Rationale must be 1000 characters or fewer'
  }

  const steps = Array.isArray(draft.suggestedNextSteps) ? draft.suggestedNextSteps : []
  if (steps.length > 10) {
    errors.suggestedNextSteps = 'Maximum 10 suggested next steps'
  } else if (steps.some((s) => s.length > 200)) {
    errors.suggestedNextSteps = 'Each suggested next step must be 200 characters or fewer'
  }

  return errors
}

export default function CareerDirectionCreatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('mode')
  const [selectedMode, setSelectedMode] = useState(null)
  const [generationInput, setGenerationInput] = useState(INITIAL_AI_VALUES)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState(null)
  const [draftFormState, setDraftFormState] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState(null)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false)
  const [editDirty, setEditDirty] = useState(false)

  const validationErrors = useMemo(() => validateDraft(draftFormState), [draftFormState])
  const canConfirm = !validationErrors.title

  const handleModeSelect = useCallback((mode) => {
    if (mode === 'manual') {
      navigate('/career-directions/new', { replace: true })
      return
    }

    setSelectedMode(mode)
    setGenerationInput({ ...INITIAL_AI_VALUES, mode })
    setFieldErrors({})
    setError(null)
    setStep('input')
  }, [navigate])

  const handleInputChange = useCallback((newValues) => {
    setGenerationInput(newValues)
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors({})
    }
  }, [fieldErrors])

  const validateInput = useCallback(() => {
    const errors = {}
    const { mode, userIdea, templateRole, primaryFocus, secondaryFocus } = generationInput

    if (mode === 'ai_from_idea') {
      if (!userIdea?.trim()) {
        errors.userIdea = 'Please describe your career goal'
      } else if (userIdea.length > 2000) {
        errors.userIdea = 'Description must be 2000 characters or fewer'
      }
    }

    if (mode === 'template_based') {
      if (!templateRole?.trim()) {
        errors.templateRole = 'Please select or enter a starting role'
      }
    }

    if (primaryFocus.length > 5) {
      errors.primaryFocus = 'Maximum 5 primary focus areas'
    }
    if (secondaryFocus.length > 3) {
      errors.secondaryFocus = 'Maximum 3 secondary focus areas'
    }

    const duplicates = primaryFocus.filter((f) => secondaryFocus.includes(f))
    if (duplicates.length > 0) {
      errors.primaryFocus = 'Focus areas cannot be both primary and secondary'
      errors.secondaryFocus = 'Focus areas cannot be both primary and secondary'
    }

    if (mode === 'ai_from_background') {
      const { contextSources } = generationInput
      const hasContext = contextSources.resume || contextSources.profile || contextSources.existingDirections
      if (!hasContext && !userIdea?.trim()) {
        errors.contextSources = 'Select at least one context source or provide a guiding preference'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [generationInput])

  const buildPayload = useCallback(() => {
    const { mode, userIdea, targetRole, careerLevel, primaryFocus, secondaryFocus, contextSources, templateRole } = generationInput

    const payload = { mode }

    if (mode === 'ai_from_idea') {
      payload.userIdea = userIdea.trim()
    }

    if (mode === 'template_based') {
      payload.templateRole = templateRole.trim()
    }

    if (userIdea?.trim()) payload.userIdea = userIdea.trim()
    if (targetRole?.trim()) payload.targetRole = targetRole.trim()
    if (careerLevel && careerLevel !== 'unspecified') payload.careerLevel = careerLevel
    if (primaryFocus.length > 0) payload.primaryFocus = primaryFocus
    if (secondaryFocus.length > 0) payload.secondaryFocus = secondaryFocus

    payload.contextSources = {
      resume: contextSources?.resume || false,
      profile: contextSources?.profile || false,
      existingDirections: contextSources?.existingDirections || false,
    }

    return payload
  }, [generationInput])

  const runGenerate = useCallback(async () => {
    setRegenerateDialogOpen(false)
    setIsGenerating(true)
    setError(null)

    try {
      const payload = buildPayload()
      const res = await generateCareerDirectionApi(payload)
      const { generatedDirection, metadata } = res.data

      setGenerationResult({ generatedDirection, metadata })
      setDraftFormState(hydrateCareerDirectionForm(generatedDirection))
      setIsEditing(false)
      setStep('preview')
    } catch (err) {
      setError({ message: err.message, errors: err.errors })
    } finally {
      setIsGenerating(false)
    }
  }, [buildPayload])

  const handleGenerate = useCallback(() => {
    if (!validateInput()) return
    if (generationResult) {
      setRegenerateDialogOpen(true)
      return
    }
    runGenerate()
  }, [validateInput, generationResult, runGenerate])

  const handleBack = useCallback(() => {
    if (selectedMode && MODE_STEPS[selectedMode] === 'input') {
      setSelectedMode(null)
      setGenerationInput(INITIAL_AI_VALUES)
      setFieldErrors({})
      setError(null)
      setStep('mode')
    } else {
      navigate('/career-directions')
    }
  }, [selectedMode, navigate])

  const handleBackToInput = useCallback(() => {
    setIsEditing(false)
    setConfirmError(null)
    setStep('input')
  }, [])

  const handleEdit = useCallback(() => {
    setIsEditing(true)
    setEditDirty(false)
    setStep('edit')
  }, [])

  const handleEditSave = useCallback((payload) => {
    setDraftFormState(payload)
    setIsEditing(false)
    setEditDirty(false)
    setStep('preview')
  }, [])

  const handleEditCancelClick = useCallback(() => {
    if (editDirty) {
      setCancelEditDialogOpen(true)
      return
    }
    setIsEditing(false)
    setStep('preview')
  }, [editDirty])

  const handleEditCancelConfirm = useCallback(() => {
    setCancelEditDialogOpen(false)
    setIsEditing(false)
    setStep('preview')
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!generationResult || !draftFormState) return

    const preErrors = validateDraft(draftFormState)
    if (Object.keys(preErrors).length > 0) {
      setConfirmError({ message: 'Please fix required fields before confirming.', errors: preErrors })
      return
    }

    setIsConfirming(true)
    setConfirmError(null)

    try {
      const finalPayload = {
        ...draftFormState,
        generationMetadata: generationResult.metadata,
      }

      const res = await createCareerDirectionApi(finalPayload)
      const id = res.data.careerDirection._id
      navigate(`/career-directions/${id}`, { replace: true })
    } catch (err) {
      setConfirmError({ message: err.message, errors: err.errors })
    } finally {
      setIsConfirming(false)
    }
  }, [generationResult, draftFormState, navigate])

  const renderStep = () => {
    if (step === 'mode' || !selectedMode) {
      return (
        <div className="space-y-6">
          <PageHeader
            title="Create Career Direction"
            subtitle="Choose how you want to create your career direction."
            actions={
              <Button variant="ghost" asChild>
                <Link to="/career-directions">Cancel</Link>
              </Button>
            }
          />
          <Card>
            <CardContent className="pt-5">
              <CreateModeSelector selectedMode={null} onSelect={handleModeSelect} />
            </CardContent>
          </Card>
        </div>
      )
    }

    if (step === 'input' || (step !== 'preview' && step !== 'edit')) {
      const isIdeaMode = selectedMode === 'ai_from_idea'
      const isBackgroundMode = selectedMode === 'ai_from_background'
      const isTemplateMode = selectedMode === 'template_based'

      return (
        <div className="space-y-6">
          <PageHeader
            title={isIdeaMode ? 'AI from Idea' : isBackgroundMode ? 'AI from Background' : 'From Role Template'}
            subtitle={isIdeaMode
              ? 'Describe the career path you want, and AI will help structure it.'
              : isBackgroundMode
              ? 'Let AI analyze your background and suggest a direction.'
              : 'Start from a role and let AI personalize the direction.'}
            actions={
              <Button variant="ghost" onClick={handleBack}>
                ← Change creation method
              </Button>
            }
          />

          {error && <ErrorMessage title="Generation failed" message={error.message} errors={error.errors} />}

          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle>{isIdeaMode ? 'AI inputs' : isBackgroundMode ? 'AI inputs' : 'Template inputs'}</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {isIdeaMode && (
                <AIdeaInputForm
                  values={generationInput}
                  onChange={handleInputChange}
                  errors={fieldErrors}
                  disabled={isGenerating}
                />
              )}

              {isBackgroundMode && (
                <AIBackgroundInputForm
                  values={generationInput}
                  onChange={handleInputChange}
                  errors={fieldErrors}
                  disabled={isGenerating}
                />
              )}

              {isTemplateMode && (
                <TemplateInputForm
                  values={generationInput}
                  onChange={handleInputChange}
                  errors={fieldErrors}
                  disabled={isGenerating}
                />
              )}

              <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating your career direction…' : 'Generate direction'}
                </Button>
                <Button variant="outline" onClick={handleBack} disabled={isGenerating}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if ((step === 'preview' || step === 'edit') && generationResult && draftFormState) {
      const { metadata } = generationResult

      if (isEditing && step === 'edit') {
        return (
          <div className="space-y-6">
            <PageHeader
              title="Edit AI Draft"
              subtitle="Modify any field before confirming. Changes are not saved until you click Confirm."
              actions={
                <Button variant="ghost" onClick={handleEditCancelClick}>
                  ← Back to preview
                </Button>
              }
            />

            <CareerDirectionForm
              initialValues={draftFormState}
              submitLabel="Save changes"
              onSubmit={handleEditSave}
              submitting={false}
              isAIEdit={true}
              onCancel={handleEditCancelClick}
              onDirtyChange={setEditDirty}
            />
          </div>
        )
      }

      return (
        <CareerDirectionPreview
          draft={draftFormState}
          metadata={metadata}
          isConfirming={isConfirming}
          confirmError={confirmError}
          onEdit={handleEdit}
          onConfirm={handleConfirm}
          onBackToInput={handleBackToInput}
          onCancel={() => navigate('/career-directions')}
          validationErrors={validationErrors}
          canConfirm={canConfirm}
        />
      )
    }

    return null
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {renderStep()}

      <ConfirmDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        onConfirm={runGenerate}
        title="Generate again?"
        description="Your current generated draft will be discarded."
        confirmLabel="Generate"
        loading={isGenerating}
        loadingLabel="Generating..."
      />

      <ConfirmDialog
        open={cancelEditDialogOpen}
        onOpenChange={setCancelEditDialogOpen}
        onConfirm={handleEditCancelConfirm}
        title="Discard changes?"
        description="You have unsaved edits. If you go back, changes will be discarded."
        confirmLabel="Discard"
        variant="destructive"
      />
    </div>
  )
}