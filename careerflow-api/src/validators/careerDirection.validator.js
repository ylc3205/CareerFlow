import { z } from 'zod'
import { CAREER_DIRECTION_BASE_TYPES } from '../models/careerDirection.model.js'

export const createCareerDirectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).optional(),
  focusSkills: z.array(z.string().max(100)).max(20).optional(),
  targetRoles: z.array(z.string().max(200)).max(20).optional(),
  baseType: z.enum(CAREER_DIRECTION_BASE_TYPES).optional(),
})

export const updateCareerDirectionSchema = createCareerDirectionSchema.partial()
