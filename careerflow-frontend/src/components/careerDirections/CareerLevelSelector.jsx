import { Label } from '../ui/label.jsx'

const CAREER_LEVELS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'unspecified', label: 'Not specified' },
]

const selectClass = "flex h-9 w-full rounded-sm border border-input bg-transparent px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
const fieldClass = "space-y-1.5"
const errorClass = "text-sm text-destructive"

export default function CareerLevelSelector({ value, onChange, error, label = 'Career level', required = false, disabled = false }) {
  return (
    <div className={fieldClass}>
      <Label htmlFor="careerLevel">{label}{required && ' *'}</Label>
      <select
        id="careerLevel"
        className={selectClass}
        value={value || 'unspecified'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      >
        {CAREER_LEVELS.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  )
}