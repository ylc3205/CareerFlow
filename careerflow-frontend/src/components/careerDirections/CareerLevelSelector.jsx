import { Label } from '../ui/label.jsx'
import { Select } from '../ui/select.jsx'

const CAREER_LEVELS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'unspecified', label: 'Not specified' },
]

const fieldClass = "space-y-2"
const errorClass = "text-sm text-destructive"

export default function CareerLevelSelector({ value, onChange, error, label = 'Career level', required = false, disabled = false }) {
  return (
    <div className={fieldClass}>
      <Label htmlFor="careerLevel">{label}{required && ' *'}</Label>
      <Select
        id="careerLevel"
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
      </Select>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  )
}