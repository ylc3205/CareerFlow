import { Label } from '../ui/label.jsx'
import { Input } from '../ui/input.jsx'

const SUGGESTED_ROLES = [
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Data Engineer',
  'AI Engineer',
  'QA Engineer',
  'Software Engineer',
]

const fieldClass = "space-y-2"
const errorClass = "text-sm text-destructive"
const suggestionClass = "flex flex-wrap gap-2 mt-2"
const suggestionButtonClass = "rounded-lg border border-input bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export default function TemplateSelector({
  value = '',
  onChange,
  error,
  disabled = false,
}) {
  return (
    <div className={fieldClass}>
      <Label htmlFor="templateRole">Starting role template *</Label>
      <Input
        id="templateRole"
        placeholder="e.g. Backend Developer"
        maxLength={200}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        list="template-role-suggestions"
      />
      <datalist id="template-role-suggestions">
        {SUGGESTED_ROLES.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>
      <p className="text-xs text-muted-foreground">Type or select a role to use as a starting template.</p>
      <div className={suggestionClass}>
        {SUGGESTED_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className={suggestionButtonClass}
            onClick={() => onChange(role)}
            disabled={disabled}
          >
            {role}
          </button>
        ))}
      </div>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  )
}