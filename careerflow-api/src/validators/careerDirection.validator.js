import { z } from 'zod'
import {
  CAREER_DIRECTION_BASE_TYPES,
  CAREER_LEVELS,
  FOCUS_AREAS,
} from '../models/careerDirection.model.js'

export const createCareerDirectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).optional(),
  focusSkills: z.array(z.string().max(100)).max(20).optional(),
  targetRoles: z.array(z.string().max(200)).max(20).optional(),
  baseType: z.enum(CAREER_DIRECTION_BASE_TYPES).optional(),
  careerLevel: z.enum(CAREER_LEVELS).optional(),
  primaryFocus: z.array(z.enum(FOCUS_AREAS)).max(5).optional(),
  secondaryFocus: z.array(z.enum(FOCUS_AREAS)).max(3).optional(),
  learningPriorities: z.array(z.string().max(200)).max(10).optional(),
  rationale: z.string().max(1000).optional(),
  suggestedNextSteps: z.array(z.string().max(200)).max(10).optional(),
  generationMetadata: z
    .object({
      mode: z.enum(['manual', 'ai_from_idea', 'ai_from_background', 'template_based']).optional(),
      userIdea: z.string().optional(),
      contextSources: z.array(z.string()).optional(),
      modelVersion: z.string().optional(),
      generatedAt: z.coerce.date().optional(),
      requestId: z.string().optional(),
    })
    .optional(),
})

export const updateCareerDirectionSchema = createCareerDirectionSchema.partial()
