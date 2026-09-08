import { Label } from '../ui/label.jsx'
import { Textarea } from '../ui/textarea.jsx'
import { Input } from '../ui/input.jsx'
import CareerLevelSelector from './CareerLevelSelector.jsx'
import FocusAreaSelector from './FocusAreaSelector.jsx'
import ContextSourceSelector from './ContextSourceSelector.jsx'

const MAX_IDEA_LENGTH = 2000
const MAX_ROLE_LENGTH = 200

const fieldClass = "space-y-1.5"
const errorClass = "text-sm text-destructive"

export default function AIdeaInputForm({
  values,
  onChange,
  errors = {},
  disabled = false,
}) {
  const handleChange = (field, value) => {
    onChange({ ...values, [field]: value })
    if (errors[field]) {
      // Clear error when user starts typing
    }
  }

  const handleTextareaChange = (field, e) => {
    const value = e.target.value
    handleChange(field, value)
  }

  const handleInputChange = (field, e) => {
    const value = e.target.value
    handleChange(field, value)
  }

  const charCount = values.userIdea?.length || 0

  return (
    <div className="space-y-6">
      <div className={fieldClass}>
        <Label htmlFor="userIdea">Describe your career goal *</Label>
        <Textarea
          id="userIdea"
          className="flex min-h-[100px] w-full rounded-sm border border-input bg-transparent px-3 py-2 text-base shadow-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y"
          placeholder="I want to become a Node.js backend developer focused on building APIs and working with databases."
          maxLength={MAX_IDEA_LENGTH}
          value={values.userIdea || ''}
          onChange={(e) => handleTextareaChange('userIdea', e)}
          disabled={disabled}
          aria-invalid={Boolean(errors.userIdea)}
        />
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">
            Describe the career path you want. Be specific about the role, technologies, and focus areas.
          </p>
          <span className={cn('text-xs', charCount > MAX_IDEA_LENGTH * 0.9 ? 'text-destructive' : 'text-muted-foreground')}>
            {charCount}/{MAX_IDEA_LENGTH}
          </span>
        </div>
        {errors.userIdea && <p className={errorClass}>{errors.userIdea}</p>}
      </div>

      <div className={fieldClass}>
        <Label htmlFor="targetRole">Target role (optional)</Label>
        <Input
          id="targetRole"
          className="flex h-9 w-full rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          placeholder="e.g. Backend Developer, API Engineer"
          maxLength={MAX_ROLE_LENGTH}
          value={values.targetRole || ''}
          onChange={(e) => handleInputChange('targetRole', e)}
          disabled={disabled}
          aria-invalid={Boolean(errors.targetRole)}
        />
        {errors.targetRole && <p className={errorClass}>{errors.targetRole}</p>}
      </div>

      <CareerLevelSelector
        value={values.careerLevel}
        onChange={(value) => handleChange('careerLevel', value)}
        error={errors.careerLevel}
        disabled={disabled}
      />

      <FocusAreaSelector
        primaryFocus={values.primaryFocus || []}
        secondaryFocus={values.secondaryFocus || []}
        onPrimaryChange={(value) => handleChange('primaryFocus', value)}
        onSecondaryChange={(value) => handleChange('secondaryFocus', value)}
        primaryError={errors.primaryFocus}
        secondaryError={errors.secondaryFocus}
        disabled={disabled}
      />

      <ContextSourceSelector
        value={values.contextSources || { resume: false, profile: false, existingDirections: false }}
        onChange={(value) => handleChange('contextSources', value)}
        error={errors.contextSources}
        disabled={disabled}
      />
    </div>
  )
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}