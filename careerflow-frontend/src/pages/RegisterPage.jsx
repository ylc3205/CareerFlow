import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { validateRegister } from '../utils/validators.js'
import ErrorMessage from '../components/ErrorMessage.jsx'
import PasswordField from '../components/PasswordField.jsx'
import { Button } from '../components/ui/button.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card.jsx'

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

  const fieldClass = "space-y-1.5"
  const errorClass = "text-sm text-destructive"

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start tracking jobs with AI-powered tools.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiError && <ErrorMessage message={apiError.message} errors={apiError.errors} />}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className={fieldClass}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
            </div>

            <div className={fieldClass}>
              <Label htmlFor="password">Password</Label>
              <PasswordField
                id="password"
                name="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password && <p className={errorClass}>{fieldErrors.password}</p>}
            </div>

            <div className={fieldClass}>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <PasswordField
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
              />
              {fieldErrors.confirmPassword && <p className={errorClass}>{fieldErrors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="underline hover:no-underline">Sign in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}