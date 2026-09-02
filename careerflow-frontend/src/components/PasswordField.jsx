import { useState } from 'react'
import { Input } from './ui/input.jsx'
import { Button } from './ui/button.jsx'
import { Eye, EyeOff } from 'lucide-react'

const PasswordField = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const [visible, setVisible] = useState(false)
  const inputType = visible ? 'text' : 'password'
  const toggleLabel = visible ? 'Hide password' : 'Show password'

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={inputType}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="pr-10"
        {...rest}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={toggleLabel}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  )
}

export default PasswordField