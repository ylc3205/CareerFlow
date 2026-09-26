import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ApiError from '../utils/ApiError.js'

const mockGenerateStructuredText = vi.fn()

vi.mock('./providers/gemini.provider.js', () => ({
  generateStructuredText: mockGenerateStructuredText,
}))

describe('ai.service', () => {
  const originalEnv = process.env.AI_MOCK
  const originalApiKey = process.env.GEMINI_API_KEY

  afterEach(() => {
    vi.clearAllMocks()
    process.env.AI_MOCK = originalEnv
    process.env.GEMINI_API_KEY = originalApiKey
  })

  describe('AI_MOCK mode', () => {
    beforeEach(() => {
      process.env.AI_MOCK = 'true'
    })

    let generateCareerDirectionJSON
    let generateStructuredJSON
    let generateInterviewPreparationJSON
    let generateAnswerEvaluationJSON
    let generateResumeParseJSON
    let geminiGenerateStructuredText

    beforeEach(async () => {
      vi.resetModules()
      const aiService = await import('./ai.service.js')
      const geminiProvider = await import('./providers/gemini.provider.js')
      generateCareerDirectionJSON = aiService.generateCareerDirectionJSON
      generateStructuredJSON = aiService.generateStructuredJSON
      generateInterviewPreparationJSON = aiService.generateInterviewPreparationJSON
      generateAnswerEvaluationJSON = aiService.generateAnswerEvaluationJSON
      generateResumeParseJSON = aiService.generateResumeParseJSON
      geminiGenerateStructuredText = geminiProvider.generateStructuredText
    })

    it('generateCareerDirectionJSON returns deterministic valid output', async () => {
      const result = await generateCareerDirectionJSON('prompt', {})
      expect(result.title).toBe('Backend Developer')
      expect(result.focusSkills).toContain('Node.js')
      expect(result.targetRoles).toContain('Backend Developer')
      expect(result.careerLevel).toBe('junior')
      expect(result.primaryFocus).toContain('backend')
      expect(result.baseType).toBe('resume')
    })

    it('generateCareerDirectionJSON does not call real provider', async () => {
      await generateCareerDirectionJSON('prompt', {})
      expect(geminiGenerateStructuredText).not.toHaveBeenCalled()
    })

    it('generateStructuredJSON returns mock match result with dimension scores', async () => {
      const result = await generateStructuredJSON('prompt', {})
      expect(result.skillsScore).toBe(90)
      expect(result.experienceScore).toBe(85)
      expect(result.backgroundScore).toBe(85)
      expect(result.matchedSkills).toContain('Node.js')
    })

    it('generateInterviewPreparationJSON returns mock questions', async () => {
      const result = await generateInterviewPreparationJSON('prompt', {})
      expect(result.questions).toHaveLength(6)
      expect(result.questions[0]).toHaveProperty('question')
      expect(result.questions[0]).toHaveProperty('category')
    })

    it('generateAnswerEvaluationJSON returns deterministic evaluation', async () => {
      const result = await generateAnswerEvaluationJSON('prompt with "question": "test"', {})
      expect(result.score).toBeGreaterThanOrEqual(70)
      expect(result.score).toBeLessThanOrEqual(80)
    })

    it('generateResumeParseJSON returns mock resume', async () => {
      const result = await generateResumeParseJSON('prompt', {})
      expect(result.title).toBe('Backend Developer Resume')
      expect(result.skills).toContain('Node.js')
    })
  })

  describe('Real provider mode', () => {
    beforeEach(() => {
      process.env.AI_MOCK = 'false'
      process.env.GEMINI_API_KEY = 'test-key'
      process.env.DEFAULT_AI_PROVIDER = 'gemini'
    })

    let generateCareerDirectionJSON
    let geminiGenerateStructuredText

    beforeEach(async () => {
      vi.resetModules()
      const aiService = await import('./ai.service.js')
      const geminiProvider = await import('./providers/gemini.provider.js')
      generateCareerDirectionJSON = aiService.generateCareerDirectionJSON
      geminiGenerateStructuredText = geminiProvider.generateStructuredText
    })

    it('generateCareerDirectionJSON calls provider with correct args', async () => {
      mockGenerateStructuredText.mockResolvedValue(JSON.stringify({
        title: 'Test',
        focusSkills: ['Node.js'],
        targetRoles: ['Backend'],
        baseType: 'resume',
      }))

      const result = await generateCareerDirectionJSON('test prompt', { type: 'object' })

      expect(mockGenerateStructuredText).toHaveBeenCalledWith('test prompt', { type: 'object' })
      expect(result.title).toBe('Test')
    })

    it('generateCareerDirectionJSON throws 503 when provider fails', async () => {
      mockGenerateStructuredText.mockRejectedValue(new Error('API Error'))

      await expect(generateCareerDirectionJSON('prompt', {})).rejects.toThrow('AI Service Unavailable')
    })

    it('generateCareerDirectionJSON throws 503 when no provider configured', async () => {
      const originalProvider = process.env.DEFAULT_AI_PROVIDER
      delete process.env.DEFAULT_AI_PROVIDER
      vi.resetModules()
      const aiService = await import('./ai.service.js')
      generateCareerDirectionJSON = aiService.generateCareerDirectionJSON

      await expect(generateCareerDirectionJSON('prompt', {})).rejects.toThrow('AI Service Unavailable')

      process.env.DEFAULT_AI_PROVIDER = originalProvider
    })

    it('generateCareerDirectionJSON parses JSON from markdown code fence', async () => {
      mockGenerateStructuredText.mockResolvedValue('```json\n{"title": "Test", "focusSkills": ["Node.js"], "targetRoles": ["Backend"], "baseType": "resume"}\n```')

      const result = await generateCareerDirectionJSON('prompt', {})
      expect(result.title).toBe('Test')
    })

    it('generateCareerDirectionJSON returns null on invalid JSON (validation happens in service layer)', async () => {
      mockGenerateStructuredText.mockResolvedValue('not valid json')

      const result = await generateCareerDirectionJSON('prompt', {})
      expect(result).toBeNull()
    })
  })
})