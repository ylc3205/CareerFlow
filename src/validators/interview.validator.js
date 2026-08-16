import { z } from 'zod'
import { INTERVIEW_TYPES, INTERVIEW_STATUSES } from '../models/interview.model.js'

export const createInterviewSchema = z.object({
  application: z
    .string({ required_error: 'Application is required' })
    .refine(
      (val) => /^[a-f\d]{24}$/i.test(val),
      { message: 'Invalid application ID' }
    ),

  title: z.string().min(1, 'Title is required').max(200),
  scheduledDate: z.coerce.date({ required_error: 'Scheduled date is required' }),
  type: z.enum(INTERVIEW_TYPES).optional(),
  status: z.enum(INTERVIEW_STATUSES).optional(),
  interviewerNames: z.string().max(500).optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  location: z.string().max(500).optional(),
  notes: z.string().max(3000).optional(),
  feedback: z.string().max(3000).optional(),
})

// .partial() makes all fields optional
// We explicitly omit 'application' so the client cannot update it.
// 'user' is already absent from the schema.
export const updateInterviewSchema = createInterviewSchema.partial().omit({ application: true })
