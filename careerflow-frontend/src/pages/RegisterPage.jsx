import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { validateRegister } from '../utils/validators.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import PasswordField from '../components/PasswordField.jsx'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errors = validateRegister(form)
    setFieldErrors(errors)
    setApiError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await register(form.email, form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setApiError({ message: err.message, errors: err.errors })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1 className="auth-page__title">Create your account</h1>
      <p className="auth-page__subtitle">Start tracking jobs with AI-powered tools.</p>

      {apiError && <ErrorMessage message={apiError.message} errors={apiError.errors} />}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form__field">
          <label className="form__label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="form__input"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <p className="form__error">{fieldErrors.email}</p>}
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="password">
            Password
          </label>
          <PasswordField
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password && <p className="form__error">{fieldErrors.password}</p>}
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
          />
          {fieldErrors.confirmPassword && <p className="form__error">{fieldErrors.confirmPassword}</p>}
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="auth-page__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}