const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 72

export const isValidEmail = (value) => EMAIL_RE.test(String(value || '').trim())

// Mirrors the backend register complexity rules: lowercase + uppercase + digit + special.
export const isValidStrongPassword = (value) =>
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value)

export const validateLogin = ({ email, password }) => {
  const errors = {}

  if (!email || !String(email).trim()) {
    errors.email = 'Email is required'
  } else if (String(email).trim().length > MAX_EMAIL_LENGTH) {
    errors.email = `Email must be ${MAX_EMAIL_LENGTH} characters or fewer`
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else if (String(password).length > MAX_PASSWORD_LENGTH) {
    errors.password = `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`
  }

  return errors
}

export const validateRegister = ({ email, password, confirmPassword }) => {
  const errors = validateLogin({ email, password })

  if (password && String(password).length < 8) {
    errors.password = 'Password must be at least 8 characters'
  } else if (password && !isValidStrongPassword(password)) {
    errors.password =
      'Password must include at least one lowercase letter, one uppercase letter, one number, and one special character'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return errors
}

// Light frontend validation for the job form (backend remains authoritative).
export const validateJob = (form) => {
  const errors = {}

  const title = String(form.title || '').trim()
  if (!title) {
    errors.title = 'Title is required'
  } else if (title.length > 300) {
    errors.title = 'Title must be 300 characters or fewer'
  }

  const company = String(form.company || '').trim()
  if (!company) {
    errors.company = 'Company is required'
  } else if (company.length > 200) {
    errors.company = 'Company must be 200 characters or fewer'
  }

  const sourceUrl = String(form.sourceUrl || '').trim()
  if (sourceUrl) {
    try {
      new URL(sourceUrl)
    } catch {
      errors.sourceUrl = 'Enter a valid URL'
    }
  }

  return errors
}

// Light frontend validation for the interview form (backend remains authoritative).
export const validateInterview = (form) => {
  const errors = {}

  const title = String(form.title || '').trim()
  if (!title) {
    errors.title = 'Title is required'
  } else if (title.length > 200) {
    errors.title = 'Title must be 200 characters or fewer'
  }

  const scheduledDate = String(form.scheduledDate || '').trim()
  if (!scheduledDate) {
    errors.scheduledDate = 'Scheduled date is required'
  }

  const meetingLink = String(form.meetingLink || '').trim()
  if (meetingLink) {
    try {
      new URL(meetingLink)
    } catch {
      errors.meetingLink = 'Enter a valid URL'
    }
  }

  return errors
}