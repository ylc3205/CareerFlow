import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import ApiError from '../utils/ApiError.js'

vi.mock('../models/resume.model.js', () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}))

vi.mock('../models/profile.model.js', () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}))

vi.mock('../models/careerDirection.model.js', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  CAREER_LEVELS: ['intern', 'junior', 'mid', 'senior', 'unspecified'],
  FOCUS_AREAS: ['backend', 'frontend', 'apis', 'databases', 'cloud', 'system_design', 'ai', 'devops', 'mobile', 'data', 'security', 'qa'],
  GENERATION_MODES: ['manual', 'ai_from_idea', 'ai_from_background', 'template_based'],
}))

vi.mock('./ai.service.js', () => ({
  generateCareerDirectionJSON: vi.fn().mockResolvedValue({
    title: 'Backend Developer',
    description: 'Transition to backend development',
    focusSkills: ['Node.js', 'Express', 'MongoDB'],
    targetRoles: ['Backend Developer', 'Node.js Developer'],
    careerLevel: 'junior',
    primaryFocus: ['backend', 'apis', 'databases'],
    secondaryFocus: ['cloud'],
    learningPriorities: ['Node.js internals', 'Database optimization'],
    rationale: 'Based on your goal...',
    suggestedNextSteps: ['Build a REST API', 'Learn PostgreSQL'],
    baseType: 'resume',
  }),
}))

import { generateCareerDirection, assembleContext, normalizeGeneratedDirection, validateGeneratedDirection } from './careerDirectionGeneration.service.js'
import { generateCareerDirectionJSON } from './ai.service.js'
import CareerDirection from '../models/careerDirection.model.js'
import Resume from '../models/resume.model.js'
import Profile from '../models/profile.model.js'

describe('careerDirectionGeneration service', () => {
  const userId = new mongoose.Types.ObjectId().toString()
  const mockResume = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    title: 'Frontend Developer',
    summary: 'Experienced frontend developer',
    skills: ['React', 'TypeScript', 'CSS'],
    experience: [{ company: 'TechCorp', position: 'Frontend Developer', description: 'Built UIs', startDate: '2022-01-01', current: true }],
    education: [],
    projects: [],
    certifications: [],
    languages: ['English'],
  }
  const mockProfile = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    headline: 'Frontend Developer',
    bio: 'Passionate about UI',
    skills: ['React', 'Vue'],
    yearsOfExperience: 3,
    experience: [{ company: 'Startup', position: 'Junior Developer', description: 'Learned basics', startDate: '2020-01-01', endDate: '2022-01-01' }],
    education: [],
  }
  const mockDirections = [
    { _id: new mongoose.Types.ObjectId(), title: 'Previous Direction', description: 'Old', focusSkills: [], targetRoles: [], careerLevel: 'junior', primaryFocus: [], secondaryFocus: [] },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('assembleContext', () => {
    it('fetches resume when resume source is selected', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockResume) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const context = await assembleContext(userId, { resume: true, profile: false, existingDirections: false })

      expect(Resume.findOne).toHaveBeenCalledWith({ user: userId })
      expect(context.resume).toBeDefined()
      expect(context.resume.title).toBe('Frontend Developer')
      expect(context.profile).toBeUndefined()
    })

    it('fetches profile when profile source is selected', async () => {
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockProfile) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const context = await assembleContext(userId, { resume: false, profile: true, existingDirections: false })

      expect(Resume.findOne).not.toHaveBeenCalled()
      expect(Profile.findOne).toHaveBeenCalledTimes(1)
      expect(context.profile).toBeDefined()
      expect(context.profile.headline).toBe('Frontend Developer')
    })

    it('fetches both resume and profile in parallel when both selected', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockResume) })
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockProfile) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const context = await assembleContext(userId, { resume: true, profile: true, existingDirections: false })

      expect(Resume.findOne).toHaveBeenCalledTimes(1)
      expect(Profile.findOne).toHaveBeenCalledTimes(1)
      expect(context.resume).toBeDefined()
      expect(context.profile).toBeDefined()
    })

    it('does not crash when resume is missing', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const context = await assembleContext(userId, { resume: true, profile: false, existingDirections: false })

      expect(context.resume).toBeUndefined()
      expect(context.profile).toBeUndefined()
    })

    it('does not crash when profile is missing', async () => {
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const context = await assembleContext(userId, { resume: false, profile: true, existingDirections: false })

      expect(context.resume).toBeUndefined()
      expect(context.profile).toBeUndefined()
    })

    it('fetches existing directions when selected', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockDirections),
      })

      const context = await assembleContext(userId, { resume: false, profile: false, existingDirections: true })

      expect(CareerDirection.find).toHaveBeenCalled()
      expect(context.existingDirections).toHaveLength(1)
    })

    it('does not query DB when no sources selected', async () => {
      const context = await assembleContext(userId, { resume: false, profile: false, existingDirections: false })

      expect(Resume.findOne).not.toHaveBeenCalled()
      expect(Profile.findOne).not.toHaveBeenCalled()
      expect(CareerDirection.find).not.toHaveBeenCalled()
      expect(context).toEqual({})
    })

    it('includes skills and experience within resume context', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockResume) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const context = await assembleContext(userId, { resume: true, profile: false, existingDirections: false })

      expect(context.resume.skills).toEqual(['React', 'TypeScript', 'CSS'])
      expect(context.resume.experience).toHaveLength(1)
    })

    it('includes skills and experience within profile context', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockProfile) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const context = await assembleContext(userId, { resume: false, profile: true, existingDirections: false })

      expect(context.profile.skills).toEqual(['React', 'Vue'])
      expect(context.profile.experience).toHaveLength(1)
    })
  })

  describe('normalizeGeneratedDirection', () => {
    it('sanitizes and truncates title', () => {
      const raw = { title: '  Backend Developer  ', focusSkills: ['Node.js'], targetRoles: ['Backend Dev'] }
      const normalized = normalizeGeneratedDirection(raw)
      expect(normalized.title).toBe('Backend Developer')
    })

    it('sanitizes focusSkills and removes duplicates', () => {
      const raw = { title: 'Test', focusSkills: ['Node.js', 'node.js', 'Express', 'Express', ''], targetRoles: ['Backend'] }
      const normalized = normalizeGeneratedDirection(raw)
      expect(normalized.focusSkills).toEqual(['Node.js', 'Express'])
    })

    it('sanitizes targetRoles and removes duplicates', () => {
      const raw = { title: 'Test', focusSkills: ['Node.js'], targetRoles: ['Backend Dev', 'backend dev', 'Node.js Dev'] }
      const normalized = normalizeGeneratedDirection(raw)
      expect(normalized.targetRoles).toEqual(['Backend Dev', 'Node.js Dev'])
    })

    it('filters invalid careerLevel to unspecified', () => {
      const raw = { title: 'Test', focusSkills: ['Node.js'], targetRoles: ['Backend'], careerLevel: 'invalid' }
      const normalized = normalizeGeneratedDirection(raw)
      expect(normalized.careerLevel).toBe('unspecified')
    })

    it('filters invalid primaryFocus values', () => {
      const raw = { title: 'Test', focusSkills: ['Node.js'], targetRoles: ['Backend'], primaryFocus: ['backend', 'invalid_focus', 'apis'] }
      const normalized = normalizeGeneratedDirection(raw)
      expect(normalized.primaryFocus).toEqual(['backend', 'apis'])
    })

    it('filters invalid secondaryFocus values', () => {
      const raw = { title: 'Test', focusSkills: ['Node.js'], targetRoles: ['Backend'], secondaryFocus: ['cloud', 'invalid', 'system_design'] }
      const normalized = normalizeGeneratedDirection(raw)
      expect(normalized.secondaryFocus).toEqual(['cloud', 'system_design'])
    })

    it('defaults baseType to resume when invalid', () => {
      const raw = { title: 'Test', focusSkills: ['Node.js'], targetRoles: ['Backend'], baseType: 'invalid' }
      const normalized = normalizeGeneratedDirection(raw)
      expect(normalized.baseType).toBe('resume')
    })

    it('handles missing optional fields gracefully', () => {
      const raw = { title: 'Test', focusSkills: ['Node.js'], targetRoles: ['Backend'] }
      const normalized = normalizeGeneratedDirection(raw)
      expect(normalized.description).toBeUndefined()
      expect(normalized.learningPriorities).toEqual([])
      expect(normalized.rationale).toBeUndefined()
      expect(normalized.suggestedNextSteps).toEqual([])
    })
  })

  describe('validateGeneratedDirection', () => {
    it('throws 502 when title is missing', () => {
      const normalized = { title: undefined, focusSkills: ['Node.js'], targetRoles: ['Backend'] }
      expect(() => validateGeneratedDirection(normalized)).toThrow(ApiError)
      expect(() => validateGeneratedDirection(normalized)).toThrow('title is required')
    })

    it('throws 502 when title is empty string', () => {
      const normalized = { title: '', focusSkills: ['Node.js'], targetRoles: ['Backend'] }
      expect(() => validateGeneratedDirection(normalized)).toThrow('title is required')
    })

    it('throws 502 when focusSkills is empty array', () => {
      const normalized = { title: 'Test', focusSkills: [], targetRoles: ['Backend'] }
      expect(() => validateGeneratedDirection(normalized)).toThrow('focusSkills must be a non-empty array')
    })

    it('throws 502 when focusSkills is not an array', () => {
      const normalized = { title: 'Test', focusSkills: 'Node.js', targetRoles: ['Backend'] }
      expect(() => validateGeneratedDirection(normalized)).toThrow('focusSkills must be a non-empty array')
    })

    it('throws 502 when targetRoles is empty array', () => {
      const normalized = { title: 'Test', focusSkills: ['Node.js'], targetRoles: [] }
      expect(() => validateGeneratedDirection(normalized)).toThrow('targetRoles must be a non-empty array')
    })

    it('throws 502 when targetRoles is not an array', () => {
      const normalized = { title: 'Test', focusSkills: ['Node.js'], targetRoles: 'Backend' }
      expect(() => validateGeneratedDirection(normalized)).toThrow('targetRoles must be a non-empty array')
    })

    it('returns normalized when all required fields are valid', () => {
      const normalized = { title: 'Test', focusSkills: ['Node.js'], targetRoles: ['Backend'] }
      const result = validateGeneratedDirection(normalized)
      expect(result).toBe(normalized)
    })
  })

  describe('generateCareerDirection', () => {
    it('generates direction for ai_from_idea mode', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const result = await generateCareerDirection(userId, {
        mode: 'ai_from_idea',
        userIdea: 'I want to become a backend developer',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })

      expect(result.generatedDirection.title).toBe('Backend Developer')
      expect(result.metadata.mode).toBe('ai_from_idea')
      expect(result.metadata.userIdea).toBe('I want to become a backend developer')
      expect(result.metadata.contextSources).toEqual([])
    })

    it('generates direction for ai_from_background mode with resume', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(mockResume) })
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const result = await generateCareerDirection(userId, {
        mode: 'ai_from_background',
        contextSources: { resume: true, profile: false, existingDirections: false },
      })

      expect(result.generatedDirection.title).toBe('Backend Developer')
      expect(result.metadata.mode).toBe('ai_from_background')
      expect(result.metadata.contextSources).toContain('resume')
    })

    it('generates direction for template_based mode', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const result = await generateCareerDirection(userId, {
        mode: 'template_based',
        templateRole: 'Backend Developer',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })

      expect(result.generatedDirection.title).toBe('Backend Developer')
      expect(result.metadata.mode).toBe('template_based')
    })

    it('includes userIdea in metadata for ai_from_background mode', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      const result = await generateCareerDirection(userId, {
        mode: 'ai_from_background',
        userIdea: 'prefer backend',
        contextSources: { resume: true, profile: false, existingDirections: false },
      })

      expect(result.metadata.userIdea).toBe('prefer backend')
    })

    it('does not call CareerDirection.create (no persistence)', async () => {
      Resume.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      Profile.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      CareerDirection.find.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      })

      await generateCareerDirection(userId, {
        mode: 'ai_from_idea',
        userIdea: 'I want to become a backend developer',
        contextSources: { resume: false, profile: false, existingDirections: false },
      })

      expect(CareerDirection.create).not.toHaveBeenCalled()
      expect(CareerDirection.findOneAndUpdate).not.toHaveBeenCalled()
    })
  })
})