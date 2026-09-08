import { Label } from '../ui/label.jsx'

const FOCUS_AREAS = [
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'apis', label: 'APIs' },
  { value: 'databases', label: 'Databases' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'system_design', label: 'System Design' },
  { value: 'ai', label: 'AI' },
  { value: 'devops', label: 'DevOps' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'data', label: 'Data' },
  { value: 'security', label: 'Security' },
  { value: 'qa', label: 'QA' },
]

const fieldClass = "space-y-1.5"
const errorClass = "text-sm text-destructive"
const chipContainerClass = "flex flex-wrap gap-2"
const chipClass = "inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
const chipSelectedClass = "bg-primary text-primary-foreground border-primary hover:bg-primary/90"

const MAX_PRIMARY = 5
const MAX_SECONDARY = 3

export default function FocusAreaSelector({
  primaryFocus = [],
  secondaryFocus = [],
  onPrimaryChange,
  onSecondaryChange,
  primaryError,
  secondaryError,
  disabled = false,
}) {
  const isPrimarySelected = (value) => primaryFocus.includes(value)
  const isSecondarySelected = (value) => secondaryFocus.includes(value)
  const isSelected = (value) => isPrimarySelected(value) || isSecondarySelected(value)

  const canAddPrimary = primaryFocus.length < MAX_PRIMARY
  const canAddSecondary = secondaryFocus.length < MAX_SECONDARY

  const handlePrimaryToggle = (value) => {
    if (isPrimarySelected(value)) {
      onPrimaryChange(primaryFocus.filter((v) => v !== value))
    } else if (canAddPrimary && !isSecondarySelected(value)) {
      onPrimaryChange([...primaryFocus, value])
    }
  }

  const handleSecondaryToggle = (value) => {
    if (isSecondarySelected(value)) {
      onSecondaryChange(secondaryFocus.filter((v) => v !== value))
    } else if (canAddSecondary && !isPrimarySelected(value)) {
      onSecondaryChange([...secondaryFocus, value])
    }
  }

  const renderChips = (type) => {
    const selected = type === 'primary' ? primaryFocus : secondaryFocus
    const max = type === 'primary' ? MAX_PRIMARY : MAX_SECONDARY
    const canAdd = type === 'primary' ? canAddPrimary : canAddSecondary
    const toggle = type === 'primary' ? handlePrimaryToggle : handleSecondaryToggle
    const label = type === 'primary' ? 'Primary focus' : 'Secondary focus'
    const error = type === 'primary' ? primaryError : secondaryError

    return (
      <div className={fieldClass}>
        <div className="flex items-center justify-between">
          <Label>{label} <span className="text-muted-foreground">({selected.length}/{max})</span></Label>
        </div>
        <div className={chipContainerClass}>
          {FOCUS_AREAS.map((area) => (
            <button
              key={area.value}
              type="button"
              className={cn(chipClass, isSelected(area.value) && chipSelectedClass)}
              onClick={() => toggle(area.value)}
              disabled={disabled || (!canAdd && !isSelected(area.value)) || isSelected(area.value) && isSelected(area.value) !== (type === 'primary' ? isPrimarySelected(area.value) : isSecondarySelected(area.value))}
              aria-pressed={isSelected(area.value)}
            >
              {area.label}
              {isSelected(area.value) && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
        {error && <p className={errorClass}>{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {renderChips('primary')}
      {renderChips('secondary')}
    </div>
  )
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}