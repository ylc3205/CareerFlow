import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCareerDirectionSchema } from './careerDirectionGeneration.validator.js'

describe('careerDirectionGeneration validator', () => {
  describe('mode: ai_from_idea', () => {
    it('accepts valid userIdea', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_idea',
        userIdea: 'I want to become a backend developer',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing userIdea', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_idea',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
      expect(result.error.issues.some(i => i.path.includes('userIdea'))).toBe(true)
    })

    it('rejects empty userIdea', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_idea',
        userIdea: '   ',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
    })

    it('rejects userIdea exceeding max length', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_idea',
        userIdea: 'a'.repeat(2001),
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mode: template_based', () => {
    it('accepts valid templateRole', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'template_based',
        templateRole: 'Backend Developer',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing templateRole', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'template_based',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
      expect(result.error.issues.some(i => i.path.includes('templateRole'))).toBe(true)
    })

    it('rejects empty templateRole', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'template_based',
        templateRole: '   ',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mode: ai_from_background', () => {
    it('accepts valid context sources', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        contextSources: { resume: true, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(true)
    })

    it('accepts userIdea without context sources', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        userIdea: 'I want to transition to backend',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(true)
    })

    it('rejects no context sources and no userIdea', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
      expect(result.error.issues.some(i => i.path.includes('contextSources'))).toBe(true)
    })
  })

  describe('contextSources validation', () => {
    it('requires all three boolean fields', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        contextSources: { resume: true }, // missing profile, existingDirections
      })
      expect(result.success).toBe(false)
    })

    it('accepts valid contextSources object', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        contextSources: { resume: true, profile: true, existingDirections: true },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('field constraints', () => {
    it('validates careerLevel enum', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        careerLevel: 'invalid_level',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
    })

    it('validates primaryFocus max 5', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        primaryFocus: ['backend', 'frontend', 'apis', 'databases', 'cloud', 'system_design'],
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
    })

    it('validates secondaryFocus max 3', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        secondaryFocus: ['backend', 'frontend', 'apis', 'databases'],
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
    })

    it('validates primaryFocus enum values', () => {
      const result = generateCareerDirectionSchema.safeParse({
        mode: 'ai_from_background',
        primaryFocus: ['invalid_focus'],
        contextSources: { resume: false, profile: false, existingDirections: false },
      })
      expect(result.success).toBe(false)
    })
  })
})