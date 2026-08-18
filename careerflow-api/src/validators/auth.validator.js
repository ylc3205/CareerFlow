import { z } from 'zod'

const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 72

// bcrypt only uses the first 72 bytes of input, so passwords are capped at 72
// characters to avoid silent truncation.
const passwordComplexity = (value) =>
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value)

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(MAX_EMAIL_LENGTH, `Email must be ${MAX_EMAIL_LENGTH} characters or fewer`),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(MAX_PASSWORD_LENGTH, `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`)
    .refine(passwordComplexity, {
      message:
        'Password must include at least one lowercase letter, one uppercase letter, one number, and one special character',
    }),
})

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(MAX_EMAIL_LENGTH, `Email must be ${MAX_EMAIL_LENGTH} characters or fewer`),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(MAX_PASSWORD_LENGTH, `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer`),
})
