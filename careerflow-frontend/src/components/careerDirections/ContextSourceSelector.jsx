import { Label } from '../ui/label.jsx'

const CONTEXT_SOURCES = [
  {
    key: 'resume',
    label: 'Resume',
    description: 'Use your skills, experience, education, projects, and resume information.',
  },
  {
    key: 'profile',
    label: 'Profile',
    description: 'Use information from your CareerFlow profile.',
  },
  {
    key: 'existingDirections',
    label: 'Existing Career Directions',
    description: 'Help AI understand directions you have already defined.',
  },
]

const fieldClass = "space-y-2"
const checkboxClass = "flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors shadow-sm hover:bg-secondary/50"
const checkboxInputClass = "mt-1 h-4 w-4 shrink-0 rounded-md border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
const labelClass = "flex-1 cursor-pointer"
const titleClass = "font-medium"
const descClass = "text-sm text-muted-foreground mt-0.5"

export default function ContextSourceSelector({
  value = {},
  onChange,
  disabled = false,
  error,
}) {
  const handleToggle = (key) => {
    onChange({
      ...value,
      [key]: !value[key],
    })
  }

  return (
    <div className={fieldClass}>
      <Label className="block">Context sources</Label>
      <p className="text-sm text-muted-foreground">
        Choose what information AI can use as context. Your explicit intent always takes priority over context.
      </p>
      <div className="space-y-2">
        {CONTEXT_SOURCES.map((source) => (
          <label key={source.key} className={checkboxClass}>
            <input
              type="checkbox"
              className={checkboxInputClass}
              checked={Boolean(value[source.key])}
              onChange={() => handleToggle(source.key)}
              disabled={disabled}
              id={`context-${source.key}`}
            />
            <div className={labelClass}>
              <div className={titleClass}>{source.label}</div>
              <div className={descClass}>{source.description}</div>
            </div>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}