import { useState } from 'react'

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
    <div className="password-field">
      <input
        id={id}
        name={name}
        type={inputType}
        className="form__input"
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        {...rest}
      />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={toggleLabel}
        aria-pressed={visible}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export default PasswordField