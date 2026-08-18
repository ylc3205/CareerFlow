import { z } from 'zod'
import { EMPLOYMENT_TYPES, WORKPLACE_TYPES, JOB_STATUSES } from '../models/job.model.js'

const salarySchema = z.object({
  min: z.number().min(0).optional(),
  max: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  period: z.enum(['hourly', 'monthly', 'yearly']).optional(),
})

export const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  company: z.string().min(1, 'Company is required').max(200),
  description: z.string().max(10000).optional(),
  location: z.string().max(200).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  workplaceType: z.enum(WORKPLACE_TYPES).optional(),
  skills: z.array(z.string().max(100)).optional(),
  requirements: z.string().max(5000).optional(),
  responsibilities: z.string().max(5000).optional(),
  salary: salarySchema.optional(),
  source: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  postedAt: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  notes: z.string().max(2000).optional(),
})

// .partial() makes title and company optional for PATCH — correct PATCH semantics.
// title.min(1) and company.min(1) no longer apply on update — intentional.
export const updateJobSchema = createJobSchema.partial()
