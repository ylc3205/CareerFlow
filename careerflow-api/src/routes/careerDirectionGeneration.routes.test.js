import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'

// Set AI_MOCK to prevent real AI provider calls
process.env.AI_MOCK = 'true'

const mockGenerateCareerDirection = vi.fn()
const mockCareerDirectionFind = vi.fn().mockReturnValue({
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
})
const mockCareerDirectionCountDocuments = vi.fn().mockResolvedValue(0)
const mockCareerDirectionCreate = vi.fn()
const mockCareerDirectionFindOne = vi.fn()
const mockCareerDirectionFindOneAndUpdate = vi.fn()
const mockCareerDirectionFindOneAndDelete = vi.fn()

// Mock the service BEFORE importing routes
vi.mock('./services/careerDirectionGeneration.service.js', () => ({
  generateCareerDirection: mockGenerateCareerDirection,
}))

vi.mock('./models/careerDirection.model.js', () => ({
  default: {
    find: mockCareerDirectionFind,
    countDocuments: mockCareerDirectionCountDocuments,
    create: mockCareerDirectionCreate,
    findOne: mockCareerDirectionFindOne,
    findOneAndUpdate: mockCareerDirectionFindOneAndUpdate,
    findOneAndDelete: mockCareerDirectionFindOneAndDelete,
  },
}))

vi.mock('../middlewares/auth.middleware.js', () => ({
  default: (req, res, next) => {
    req.user = { userId: new mongoose.Types.ObjectId().toString() }
    next()
  }
}))

// Also mock ai.service to prevent any real AI calls
vi.mock('../services/ai.service.js', () => ({
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

import generateRoutes from './careerDirectionGeneration.routes.js'
import careerDirectionRoutes from './careerDirection.routes.js'
import CareerDirection from '../models/careerDirection.model.js'

const app = express()
app.use(express.json())
app.use('/api/career-directions', careerDirectionRoutes)
app.use('/api/career-directions/generate', generateRoutes)

describe('careerDirectionGeneration routes', () => {
  const userId = new mongoose.Types.ObjectId().toString()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/career-directions/generate', () => {
    it('returns 422 for ai_from_idea without userIdea', async () => {
      const res = await request(app)
        .post('/api/career-directions/generate')
        .send({
          mode: 'ai_from_idea',
          contextSources: { resume: false, profile: false, existingDirections: false },
        })
      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
    })

    it('returns 422 for template_based without templateRole', async () => {
      const res = await request(app)
        .post('/api/career-directions/generate')
        .send({
          mode: 'template_based',
          contextSources: { resume: false, profile: false, existingDirections: false },
        })
      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
    })

    it('returns 422 for ai_from_background without context or userIdea', async () => {
      const res = await request(app)
        .post('/api/career-directions/generate')
        .send({
          mode: 'ai_from_background',
          contextSources: { resume: false, profile: false, existingDirections: false },
        })
      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
    })

    it('returns 200 for valid ai_from_idea request', async () => {
      mockGenerateCareerDirection.mockResolvedValue({
        generatedDirection: {
          title: 'Backend Developer',
          description: 'Test',
          focusSkills: ['Node.js'],
          targetRoles: ['Backend Developer'],
          careerLevel: 'junior',
          primaryFocus: ['backend'],
          secondaryFocus: [],
          learningPriorities: [],
          rationale: 'Test',
          suggestedNextSteps: [],
          baseType: 'resume',
        },
        metadata: {
          mode: 'ai_from_idea',
          userIdea: 'I want to become a backend developer',
          contextSources: [],
          modelVersion: 'gemini-2.5-flash',
          generatedAt: new Date(),
          requestId: 'test-id',
        },
      })

      const res = await request(app)
        .post('/api/career-directions/generate')
        .send({
          mode: 'ai_from_idea',
          userIdea: 'I want to become a backend developer',
          contextSources: { resume: false, profile: false, existingDirections: false },
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.generatedDirection.title).toBe('Backend Developer')
      expect(res.body.data.metadata.mode).toBe('ai_from_idea')
      expect(res.body.data.metadata.userIdea).toBe('I want to become a backend developer')
      expect(res.body.data.metadata.contextSources).toEqual([])
    })

    it('returns 200 for valid template_based request', async () => {
      mockGenerateCareerDirection.mockResolvedValue({
        generatedDirection: {
          title: 'Backend Developer',
          description: 'Test',
          focusSkills: ['Node.js'],
          targetRoles: ['Backend Developer'],
          careerLevel: 'junior',
          primaryFocus: ['backend'],
          secondaryFocus: [],
          learningPriorities: [],
          rationale: 'Test',
          suggestedNextSteps: [],
          baseType: 'resume',
        },
        metadata: {
          mode: 'template_based',
          userIdea: undefined,
          contextSources: [],
          modelVersion: 'gemini-2.5-flash',
          generatedAt: new Date(),
          requestId: 'test-id',
        },
      })

      const res = await request(app)
        .post('/api/career-directions/generate')
        .send({
          mode: 'template_based',
          templateRole: 'Backend Developer',
          contextSources: { resume: false, profile: false, existingDirections: false },
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('CareerDirection CRUD regression', () => {
    it('GET /api/career-directions works', async () => {
      mockCareerDirectionFind.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      })
      mockCareerDirectionCountDocuments.mockResolvedValue(0)

      const res = await request(app).get('/api/career-directions')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('POST /api/career-directions (create) works', async () => {
      const mockDirection = {
        _id: new mongoose.Types.ObjectId(),
        user: userId,
        title: 'Manual Direction',
        focusSkills: ['Node.js'],
        targetRoles: ['Backend'],
        baseType: 'resume',
      }
      mockCareerDirectionCreate.mockResolvedValue(mockDirection)

      const res = await request(app)
        .post('/api/career-directions')
        .send({ title: 'Manual Direction', focusSkills: ['Node.js'], targetRoles: ['Backend'] })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
    })
  })
})