import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import {
  generateMatch,
  calculateFinalScore,
  validateDimensionScore,
  buildCandidatePayload,
  buildDirectionalCandidatePayload,
  buildJobPayload,
  SCORING_WEIGHTS,
} from './match.service.js'
import Job from '../models/job.model.js'
import Profile from '../models/profile.model.js'
import Resume from '../models/resume.model.js'
import CareerDirection from '../models/careerDirection.model.js'
import AIAnalysis from '../models/aiAnalysis.model.js'
import * as aiService from './ai.service.js'

vi.mock('../models/job.model.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}))

vi.mock('../models/profile.model.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}))

vi.mock('../models/resume.model.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}))

vi.mock('../models/careerDirection.model.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}))

vi.mock('../models/aiAnalysis.model.js', () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}))

vi.mock('./ai.service.js', () => ({
  generateStructuredJSON: vi.fn(),
}))

describe('Hybrid AI Job Match Scoring (match.service)', () => {
  const userId = new mongoose.Types.ObjectId().toString()
  const jobId = new mongoose.Types.ObjectId().toString()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Deterministic Scoring Rubric & Weights (Phase 5)', () => {
    it('uses configured weights summing to 1.0', () => {
      expect(SCORING_WEIGHTS.SKILLS).toBe(0.40)
      expect(SCORING_WEIGHTS.EXPERIENCE).toBe(0.40)
      expect(SCORING_WEIGHTS.BACKGROUND).toBe(0.20)
      expect(SCORING_WEIGHTS.SKILLS + SCORING_WEIGHTS.EXPERIENCE + SCORING_WEIGHTS.BACKGROUND).toBeCloseTo(1.0)
    })

    it('calculates deterministic final score correctly', () => {
      // 90 * 0.4 + 85 * 0.4 + 85 * 0.2 = 36 + 34 + 17 = 87
      const score = calculateFinalScore({ skillsScore: 90, experienceScore: 85, backgroundScore: 85 })
      expect(score).toBe(87)
    })

    it('clamps final score between 0 and 100', () => {
      expect(calculateFinalScore({ skillsScore: 0, experienceScore: 0, backgroundScore: 0 })).toBe(0)
      expect(calculateFinalScore({ skillsScore: 100, experienceScore: 100, backgroundScore: 100 })).toBe(100)
    })
  })

  describe('Validation of Dimension Scores (Phase 8 & Test 6)', () => {
    it('accepts valid integer scores 0 to 100', () => {
      expect(validateDimensionScore(0, 'skills')).toBe(0)
      expect(validateDimensionScore(50, 'experience')).toBe(50)
      expect(validateDimensionScore(100, 'background')).toBe(100)
      expect(validateDimensionScore('75', 'skills')).toBe(75)
    })

    it.each([null, undefined, '', NaN, -10, 150, 'abc'])('rejects invalid score %s with ApiError 502', (val) => {
      expect(() => validateDimensionScore(val, 'test')).toThrowError(/AI.*invalid test score|missing/)
    })
  })

  describe('Candidate Context Enrichment (Phase 2 & Tests 1, 9)', () => {
    it('preserves yearsOfExperience = 0 explicitly without turning into undefined', () => {
      const profile = {
        yearsOfExperience: 0,
        skills: ['Node.js', 'MongoDB'],
        education: [{ school: 'HCMUT', degree: 'BS', fieldOfStudy: 'CS' }],
        experience: [],
      }
      const resume = {
        skills: ['Node.js', 'Express.js'],
        summary: 'Junior developer',
        experience: [],
      }

      const payload = buildCandidatePayload(profile, resume)

      expect(payload.yearsOfExperience).toBe(0)
      expect(payload.skills).toEqual(expect.arrayContaining(['Node.js', 'MongoDB', 'Express.js']))
      expect(payload.education).toHaveLength(1)
      expect(payload.education[0].school).toBe('HCMUT')
      expect(payload.experience).toEqual([])
    })

    it('extracts projects from resume when available', () => {
      const profile = { yearsOfExperience: 1, skills: ['Node.js'] }
      const resume = {
        skills: ['Node.js'],
        projects: [
          { name: 'CareerFlow', description: 'AI platform', techStack: ['React', 'Node.js'] },
        ],
      }

      const payload = buildCandidatePayload(profile, resume)
      expect(payload.projects).toHaveLength(1)
      expect(payload.projects[0].name).toBe('CareerFlow')
      expect(payload.projects[0].techStack).toEqual(['React', 'Node.js'])
    })

    it('enriches directional candidate payload with profile and experience context', () => {
      const profile = {
        yearsOfExperience: 2,
        skills: ['Python', 'Django'],
        bio: 'Backend developer',
        education: [{ school: 'NEU', degree: 'BA' }],
        experience: [{ company: 'Corp', position: 'Dev' }],
      }
      const direction = {
        focusSkills: ['Python', 'FastAPI'],
        description: 'Focus on FastAPI',
        targetRoles: ['Backend Engineer'],
      }

      const payload = buildDirectionalCandidatePayload(profile, null, direction)
      expect(payload.yearsOfExperience).toBe(2)
      expect(payload.skills).toEqual(['Python', 'FastAPI'])
      expect(payload.summary).toBe('Focus on FastAPI')
      expect(payload.targetRoles).toEqual(['Backend Engineer'])
      expect(payload.education).toHaveLength(1)
      expect(payload.experience).toHaveLength(1)
    })
  })

  describe('Full generateMatch scenarios (Phase 12)', () => {
    const jobMock = {
      _id: jobId,
      user: userId,
      title: 'Junior Backend Developer',
      company: 'Tech Corp',
      description: 'Looking for a junior backend developer. Fresh graduates welcome.',
      requirements: 'Node.js, Express, MongoDB. No prior commercial experience strictly required.',
      skills: ['Node.js', 'Express', 'MongoDB'],
      isDeleted: false,
    }

    it('Test 1 — Problematic scenario: Junior Job + 0 year candidate with matching skills', async () => {
      Job.findOne.mockResolvedValue(jobMock)
      Profile.findOne.mockResolvedValue({
        yearsOfExperience: 0,
        skills: ['Node.js', 'Express', 'MongoDB', 'JavaScript'],
        experience: [],
        education: [{ school: 'University', degree: 'BS', fieldOfStudy: 'IT' }],
      })
      Resume.findOne.mockResolvedValue({
        summary: 'Enthusiastic fresh graduate seeking backend role.',
        skills: ['Node.js', 'Express', 'MongoDB'],
        experience: [],
      })

      // Gemini evaluates dimension scores instead of arbitrary matchScore
      aiService.generateStructuredJSON.mockResolvedValue({
        skillsScore: 95,
        experienceScore: 70, // Not heavily penalized because fresh graduates are welcome
        backgroundScore: 80,
        matchedSkills: ['Node.js', 'Express', 'MongoDB'],
        missingSkills: [],
        strengths: ['Strong match on required stack', 'Relevant IT education'],
        weaknesses: ['No prior commercial experience'],
        recommendations: ['Build production-grade pet projects'],
      })

      AIAnalysis.findOneAndUpdate.mockImplementation((filter, update) => ({
        ...update.$set,
        _id: new mongoose.Types.ObjectId(),
      }))

      const result = await generateMatch(userId, jobId)

      // Expected finalScore = Math.round(95 * 0.40 + 70 * 0.40 + 80 * 0.20) = 38 + 28 + 16 = 82
      expect(result.skillsScore).toBe(95)
      expect(result.experienceScore).toBe(70)
      expect(result.backgroundScore).toBe(80)
      expect(result.matchScore).toBe(82)
      expect(result.matchScore).not.toBe(95) // Not copied from skillsScore or arbitrary 95
      expect(AIAnalysis.findOneAndUpdate).toHaveBeenCalledTimes(1)
    })

    it('Test 2 — 0 years experience + explicit commercial experience required', async () => {
      const seniorJobMock = {
        _id: jobId,
        user: userId,
        title: 'Backend Developer',
        company: 'ScaleCo',
        requirements: 'At least 2 years of commercial Node.js experience required.',
        skills: ['Node.js', 'Express', 'MongoDB'],
        isDeleted: false,
      }
      Job.findOne.mockResolvedValue(seniorJobMock)
      Profile.findOne.mockResolvedValue({
        yearsOfExperience: 0,
        skills: ['Node.js', 'Express'],
        experience: [],
      })
      Resume.findOne.mockResolvedValue({
        summary: 'Fresh graduate',
        skills: ['Node.js'],
        experience: [],
      })

      // Gemini penalizes experience dimension meaningfully
      aiService.generateStructuredJSON.mockResolvedValue({
        skillsScore: 85,
        experienceScore: 25, // Significantly lower due to mismatch
        backgroundScore: 60,
        matchedSkills: ['Node.js'],
        missingSkills: ['MongoDB'],
        strengths: ['Familiar with Node.js'],
        weaknesses: ['Job requires 2+ years commercial experience; candidate has 0'],
        recommendations: ['Gain commercial experience or apply for junior positions'],
      })

      AIAnalysis.findOneAndUpdate.mockImplementation((filter, update) => ({
        ...update.$set,
      }))

      const result = await generateMatch(userId, jobId)

      // Expected finalScore = Math.round(85 * 0.4 + 25 * 0.4 + 60 * 0.2) = 34 + 10 + 12 = 56
      expect(result.experienceScore).toBe(25)
      expect(result.matchScore).toBe(56)
    })

    it('Test 3 — Candidate with relevant internship experience', async () => {
      Job.findOne.mockResolvedValue(jobMock)
      Profile.findOne.mockResolvedValue({
        yearsOfExperience: 0,
        skills: ['Node.js', 'Express'],
        experience: [
          { company: 'TechLabs', position: 'Backend Intern', description: 'Built REST APIs' },
        ],
      })
      Resume.findOne.mockResolvedValue({
        summary: 'Backend intern',
        skills: ['Node.js', 'Express', 'MongoDB'],
        experience: [
          { company: 'TechLabs', position: 'Backend Intern', description: 'Built REST APIs' },
        ],
      })

      aiService.generateStructuredJSON.mockResolvedValue({
        skillsScore: 90,
        experienceScore: 78, // Internship experience rewarded
        backgroundScore: 80,
        matchedSkills: ['Node.js', 'Express', 'MongoDB'],
        missingSkills: [],
        strengths: ['Relevant backend internship experience'],
        weaknesses: [],
        recommendations: ['Continue growing API design skills'],
      })

      AIAnalysis.findOneAndUpdate.mockImplementation((filter, update) => ({
        ...update.$set,
      }))

      const result = await generateMatch(userId, jobId)
      // Math.round(90 * 0.4 + 78 * 0.4 + 80 * 0.2) = 36 + 31.2 + 16 = 83.2 -> 83
      expect(result.experienceScore).toBe(78)
      expect(result.matchScore).toBe(83)
    })

    it('Test 4 — Missing required skills penalizes skillsScore and finalScore consistently', async () => {
      Job.findOne.mockResolvedValue(jobMock)
      Profile.findOne.mockResolvedValue({
        yearsOfExperience: 1,
        skills: ['HTML', 'CSS'],
        experience: [],
      })
      Resume.findOne.mockResolvedValue({
        summary: 'Frontend beginner',
        skills: ['HTML', 'CSS'],
        experience: [],
      })

      aiService.generateStructuredJSON.mockResolvedValue({
        skillsScore: 20,
        experienceScore: 40,
        backgroundScore: 30,
        matchedSkills: [],
        missingSkills: ['Node.js', 'Express', 'MongoDB'],
        strengths: [],
        weaknesses: ['Missing all core backend requirements'],
        recommendations: ['Learn Node.js, Express and MongoDB'],
      })

      AIAnalysis.findOneAndUpdate.mockImplementation((filter, update) => ({
        ...update.$set,
      }))

      const result = await generateMatch(userId, jobId)
      // Math.round(20 * 0.4 + 40 * 0.4 + 30 * 0.2) = 8 + 16 + 6 = 30
      expect(result.skillsScore).toBe(20)
      expect(result.missingSkills).toHaveLength(3)
      expect(result.matchScore).toBe(30)
    })

    it('Test 5 — Strong candidate with relevant experience and skills', async () => {
      Job.findOne.mockResolvedValue(jobMock)
      Profile.findOne.mockResolvedValue({
        yearsOfExperience: 3,
        skills: ['Node.js', 'Express', 'MongoDB', 'Docker', 'AWS'],
        experience: [
          { company: 'Fintech', position: 'Backend Engineer', description: 'Scaled microservices' },
        ],
      })
      Resume.findOne.mockResolvedValue({
        summary: 'Experienced backend engineer',
        skills: ['Node.js', 'Express', 'MongoDB'],
        experience: [
          { company: 'Fintech', position: 'Backend Engineer', description: 'Scaled microservices' },
        ],
      })

      aiService.generateStructuredJSON.mockResolvedValue({
        skillsScore: 98,
        experienceScore: 95,
        backgroundScore: 92,
        matchedSkills: ['Node.js', 'Express', 'MongoDB'],
        missingSkills: [],
        strengths: ['Exceeds technical requirements', '3 years production experience'],
        weaknesses: [],
        recommendations: ['Great candidate for this role'],
      })

      AIAnalysis.findOneAndUpdate.mockImplementation((filter, update) => ({
        ...update.$set,
      }))

      const result = await generateMatch(userId, jobId)
      // Math.round(98 * 0.4 + 95 * 0.4 + 92 * 0.2) = 39.2 + 38 + 18.4 = 95.6 -> 96
      expect(result.matchScore).toBe(96)
      expect(result.skillsScore).toBe(98)
      expect(result.experienceScore).toBe(95)
      expect(result.backgroundScore).toBe(92)
    })

    it('Test 7 — AI_MOCK returns valid dimension scores and uses same final score calculation', async () => {
      Job.findOne.mockResolvedValue(jobMock)
      Profile.findOne.mockResolvedValue({
        yearsOfExperience: 2,
        skills: ['Node.js'],
      })
      Resume.findOne.mockResolvedValue({
        summary: 'Mock developer',
        skills: ['Node.js'],
      })

      // Simulate what aiService in AI_MOCK=true returns
      aiService.generateStructuredJSON.mockResolvedValue({
        skillsScore: 90,
        experienceScore: 85,
        backgroundScore: 85,
        matchedSkills: ['Node.js', 'Express.js', 'MongoDB'],
        missingSkills: ['Redis', 'Docker'],
        strengths: ['Backend experience', 'REST API design'],
        weaknesses: ['Limited cloud infrastructure experience'],
        recommendations: ['Learn Docker basics', 'Add Redis caching layer'],
      })

      AIAnalysis.findOneAndUpdate.mockImplementation((filter, update) => ({
        ...update.$set,
      }))

      const result = await generateMatch(userId, jobId)
      expect(result.matchScore).toBe(87) // Calculated by backend formula: 90*0.4 + 85*0.4 + 85*0.2
      expect(result.skillsScore).toBe(90)
      expect(result.experienceScore).toBe(85)
      expect(result.backgroundScore).toBe(85)
    })

    it('Test 8 — Career Direction mode uses direction focusSkills and context', async () => {
      const directionId = new mongoose.Types.ObjectId().toString()
      Job.findOne.mockResolvedValue(jobMock)
      Profile.findOne.mockResolvedValue({
        yearsOfExperience: 1,
        skills: ['Python', 'Django'],
      })
      Resume.findOne.mockResolvedValue({
        summary: 'Python dev',
        skills: ['Python'],
      })
      CareerDirection.findOne.mockResolvedValue({
        _id: directionId,
        user: userId,
        title: 'Backend Specialist',
        baseType: 'profile',
        focusSkills: ['Node.js', 'MongoDB'],
        description: 'Direction to Node.js backend',
      })

      aiService.generateStructuredJSON.mockResolvedValue({
        skillsScore: 88,
        experienceScore: 75,
        backgroundScore: 80,
        matchedSkills: ['Node.js', 'MongoDB'],
        missingSkills: ['Express'],
        strengths: ['Clear directional focus'],
        weaknesses: [],
        recommendations: ['Study Express.js'],
      })

      AIAnalysis.findOneAndUpdate.mockImplementation((filter, update) => ({
        ...update.$set,
      }))

      const result = await generateMatch(userId, jobId, directionId)
      expect(result.careerDirectionId).toBe(directionId)
      expect(result.candidateSourceType).toBe('profile')
      // Math.round(88 * 0.4 + 75 * 0.4 + 80 * 0.2) = 35.2 + 30 + 16 = 81.2 -> 81
      expect(result.matchScore).toBe(81)
    })
  })
})
