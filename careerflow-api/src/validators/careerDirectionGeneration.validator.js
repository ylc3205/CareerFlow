import { z } from 'zod'
import { CAREER_LEVELS, FOCUS_AREAS, GENERATION_MODES } from '../models/careerDirection.model.js'

const contextSourcesSchema = z.object({
  resume: z.boolean(),
  profile: z.boolean(),
  existingDirections: z.boolean(),
})

export const generateCareerDirectionSchema = z.object({
  mode: z.enum(GENERATION_MODES.filter((m) => m !== 'manual')),
  userIdea: z.string().max(2000).optional(),
  targetRole: z.string().max(200).optional(),
  careerLevel: z.enum(CAREER_LEVELS).optional(),
  primaryFocus: z.array(z.enum(FOCUS_AREAS)).max(5).optional(),
  secondaryFocus: z.array(z.enum(FOCUS_AREAS)).max(3).optional(),
  contextSources: contextSourcesSchema,
  templateRole: z.string().max(200).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === 'ai_from_idea') {
    if (!data.userIdea || data.userIdea.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'userIdea is required when mode is ai_from_idea',
        path: ['userIdea'],
      })
    }
  }

  if (data.mode === 'template_based') {
    if (!data.templateRole || data.templateRole.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'templateRole is required when mode is template_based',
        path: ['templateRole'],
      })
    }
  }

  if (data.mode === 'ai_from_background') {
    const hasAnyContext = Object.values(data.contextSources).some((v) => v === true)
    if (!hasAnyContext && (!data.userIdea || data.userIdea.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one context source must be selected or userIdea must be provided',
        path: ['contextSources'],
      })
    }
  }
})