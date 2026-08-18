import { z } from 'zod'
import { APPLICATION_STATUSES } from '../models/application.model.js'

export const createApplicationSchema = z.object({
  // job is required — must be a valid MongoDB ObjectId string
  job: z
    .string({ required_error: 'Job is required' })
    .refine(
      (val) => /^[a-f\d]{24}$/i.test(val),
      { message: 'Invalid job ID' }
    ),

  status: z.enum(APPLICATION_STATUSES).optional(),
  appliedAt: z.coerce.date().optional(),
  coverLetter: z.string().max(10000).optional(),
  notes: z.string().max(3000).optional(),
  // `user` intentionally absent — always injected from req.user.userId in service
})

// For PATCH: every field becomes optional.
// `user` and `job` are absent from this schema entirely —
// the service never updates those fields regardless of what is in req.body.
export const updateApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  appliedAt: z.coerce.date().optional(),
  coverLetter: z.string().max(10000).optional(),
  notes: z.string().max(3000).optional(),
  // `user` and `job` explicitly excluded — not a partial of createApplicationSchema
  // because we must never allow updating these two fields.
})
