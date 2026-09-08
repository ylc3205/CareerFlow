import { useState } from 'react'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card.jsx'
import { Sparkles, Edit, ArrowLeft, X } from 'lucide-react'
import ConfirmDialog from '../ConfirmDialog.jsx'

const baseTypeVariant = (baseType) => {
  switch (baseType) {
    case 'profile':
      return 'primary'
    case 'resume':
      return 'secondary'
    default:
      return 'default'
  }
}

const careerLevelLabel = (level) => {
  const labels = {
    intern: 'Intern',
    junior: 'Junior',
    mid: 'Mid-level',
    senior: 'Senior',
    unspecified: 'Not specified',
  }
  return labels[level] || level
}

const focusAreaLabel = (area) => {
  const labels = {
    backend: 'Backend',
    frontend: 'Frontend',
    apis: 'APIs',
    databases: 'Databases',
    cloud: 'Cloud',
    system_design: 'System Design',
    ai: 'AI',
    devops: 'DevOps',
    mobile: 'Mobile',
    data: 'Data',
    security: 'Security',
    qa: 'QA',
  }
  return labels[area] || area
}

export default function CareerDirectionPreview({
  draft,
  metadata,
  isConfirming,
  confirmError,
  onEdit,
  onConfirm,
  onBackToInput,
  onCancel,
  validationErrors,
  canConfirm = true,
}) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const skills = draft.focusSkills || []
  const roles = draft.targetRoles || []
  const priorities = draft.learningPriorities || []
  const steps = draft.suggestedNextSteps || []
  const primary = draft.primaryFocus || []
  const secondary = draft.secondaryFocus || []
  const invalidFields = validationErrors ? Object.keys(validationErrors) : []

  const handleConfirm = () => {
    setConfirmDialogOpen(false)
    onConfirm()
  }

  const handleCancel = () => {
    setConfirmDialogOpen(false)
    onCancel()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-primary/50 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          AI Generated Draft
        </span>
        <span className="text-sm text-muted-foreground">Not saved yet — review and edit before confirming.</span>
      </div>

      {invalidFields.length > 0 && (
        <div className="rounded-sm border border-warning bg-warning/10 p-4 text-sm text-warning">
          <p className="font-medium">Some fields have issues that should be fixed:</p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {invalidFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">Click Edit to fix these issues before confirming.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {draft.title || 'Untitled Direction'}
            <Badge variant={baseTypeVariant(draft.baseType)}>{draft.baseType}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {draft.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{draft.description}</p>
            </div>
          )}

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Career Level</dt>
              <dd className="text-sm text-foreground">{careerLevelLabel(draft.careerLevel)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Base Type</dt>
              <dd className="text-sm text-foreground">
                <Badge variant={baseTypeVariant(draft.baseType)}>{draft.baseType}</Badge>
              </dd>
            </div>
          </dl>

          {(primary.length > 0 || secondary.length > 0) && (
            <div className="space-y-4">
              {primary.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Primary Focus ({primary.length}/5)</h4>
                  <div className="flex flex-wrap gap-2">
                    {primary.map((area) => (
                      <Badge key={area} variant="outline">{focusAreaLabel(area)}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {secondary.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Secondary Focus ({secondary.length}/3)</h4>
                  <div className="flex flex-wrap gap-2">
                    {secondary.map((area) => (
                      <Badge key={area} variant="outline">{focusAreaLabel(area)}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {skills.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Focus Skills ({skills.length})</h4>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="outline">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {roles.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Target Roles ({roles.length})</h4>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge key={role} variant="outline">{role}</Badge>
                ))}
              </div>
            </div>
          )}

          {priorities.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Learning Priorities ({priorities.length})</h4>
              <div className="flex flex-wrap gap-2">
                {priorities.map((priority) => (
                  <Badge key={priority} variant="secondary">{priority}</Badge>
                ))}
              </div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Next Steps ({steps.length})</h4>
              <ol className="space-y-1">
                {steps.map((step, index) => (
                  <li key={index} className="text-sm text-foreground flex items-start gap-2">
                    <span className="flex-shrink-0 text-muted-foreground">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {draft.rationale && (
            <div className="space-y-1.5 rounded-sm border border-border bg-muted/50 p-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                AI Rationale
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{draft.rationale}</p>
            </div>
          )}

          {metadata && (
            <div className="rounded-sm border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
              <p><strong>Generation Mode:</strong> {metadata.mode}</p>
              {metadata.userIdea && (
                <p>
                  <strong>User Idea:</strong>{' '}
                  {metadata.userIdea.substring(0, 100)}
                  {metadata.userIdea.length > 100 ? '...' : ''}
                </p>
              )}
              {metadata.contextSources?.length > 0 && (
                <p><strong>Context Sources:</strong> {metadata.contextSources.join(', ')}</p>
              )}
              {metadata.modelVersion && <p><strong>Model:</strong> {metadata.modelVersion}</p>}
              {metadata.generatedAt && <p><strong>Generated:</strong> {new Date(metadata.generatedAt).toLocaleString()}</p>}
              {metadata.requestId && <p><strong>Request ID:</strong> {metadata.requestId}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button variant="outline" onClick={onBackToInput} disabled={isConfirming}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Back to Inputs
        </Button>
        <Button variant="ghost" onClick={() => setCancelDialogOpen(true)} disabled={isConfirming}>
          <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Cancel Creation
        </Button>
        <Button variant="outline" onClick={onEdit} disabled={isConfirming}>
          <Edit className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
        <Button
          variant="default"
          onClick={() => setConfirmDialogOpen(true)}
          disabled={isConfirming || !canConfirm}
          className="ml-auto"
        >
          {isConfirming ? 'Saving...' : 'Confirm'}
        </Button>
      </div>

      {confirmError && (
        <div className="rounded-sm border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {confirmError.message}
          {confirmError.errors && (
            <ul className="mt-2 list-disc list-inside space-y-1">
              {Object.entries(confirmError.errors).map(([field, msg]) => (
                <li key={field}><strong>{field}:</strong> {msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleConfirm}
        title="Save this Career Direction?"
        description="This will save the direction to your account."
        confirmLabel="Save"
        loading={isConfirming}
        loadingLabel="Saving..."
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        title="Discard this draft?"
        description="This will discard the generated draft. You can always generate a new one."
        confirmLabel="Discard"
        variant="destructive"
      />
    </div>
  )
}
