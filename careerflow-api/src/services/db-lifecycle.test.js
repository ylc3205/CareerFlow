import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import * as jobService from './job.service.js'
import * as applicationService from './application.service.js'
import * as interviewService from './interview.service.js'
import * as aiAnalysisService from './aiAnalysis.service.js'
import Job from '../models/job.model.js'
import Application from '../models/application.model.js'
import Interview from '../models/interview.model.js'
import InterviewPreparation from '../models/interviewPreparation.model.js'
import PracticeSession from '../models/practiceSession.model.js'
import AIAnalysis from '../models/aiAnalysis.model.js'
import CareerDirection from '../models/careerDirection.model.js'

// Mock Mongoose models to prevent live MongoDB connections
vi.mock('../models/job.model.js', () => {
  const JobMock = {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  }
  return {
    default: JobMock,
    JOB_STATUSES: ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed'],
    EMPLOYMENT_TYPES: ['full-time', 'part-time', 'internship', 'contract', 'freelance'],
    WORKPLACE_TYPES: ['remote', 'hybrid', 'onsite'],
  }
})

vi.mock('../models/application.model.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  },
  APPLICATION_STATUSES: ['applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn'],
}))

vi.mock('../models/interview.model.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  },
  INTERVIEW_STATUSES: ['scheduled', 'completed', 'canceled', 'no-show'],
}))

vi.mock('../models/interviewPreparation.model.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../models/practiceSession.model.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    deleteMany: vi.fn(),
  },
  PRACTICE_STATUSES: ['not_started', 'in_progress', 'completed'],
}))

vi.mock('../models/aiAnalysis.model.js', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../models/careerDirection.model.js', () => ({
  default: {
    findOne: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}))

describe('DB Lifecycle — Job Soft Delete, Historical Retention & appliedAt', () => {
  const userId = new mongoose.Types.ObjectId().toString()
  const jobId = new mongoose.Types.ObjectId().toString()
  const appId = new mongoose.Types.ObjectId().toString()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // 1. JOB SOFT DELETE & RETENTION OF CHILDREN (Items A through O)
  // =========================================================================
  describe('Job Soft Delete & Children Retention', () => {
    it('soft deletes the job (sets isDeleted=true, deletedAt) and does NOT delete child records', async () => {
      // Mock active job document
      const mockJobDoc = {
        _id: jobId,
        user: userId,
        title: 'Senior Software Engineer',
        company: 'Acme Corp',
        isDeleted: false,
        deletedAt: null,
        save: vi.fn().mockResolvedValue(true),
        deleteOne: vi.fn(),
      }

      Job.findOne.mockResolvedValue(mockJobDoc)

      // Spies on child models to verify NO cascade deleteMany is called
      const aiAnalysisDeleteSpy = vi.spyOn(AIAnalysis, 'deleteMany')
      const appDeleteSpy = vi.spyOn(Application, 'deleteMany')
      const prepDeleteSpy = vi.spyOn(InterviewPreparation, 'deleteMany')
      const sessDeleteSpy = vi.spyOn(PracticeSession, 'deleteMany')

      // Execute delete
      await jobService.deleteJob(userId, jobId)

      // (H) Job still exists in database (save called, not deleteOne)
      expect(mockJobDoc.save).toHaveBeenCalled()
      expect(mockJobDoc.deleteOne).not.toHaveBeenCalled()

      // (I) Job.isDeleted === true
      expect(mockJobDoc.isDeleted).toBe(true)

      // (J) Job.deletedAt exists and is a valid Date
      expect(mockJobDoc.deletedAt).toBeInstanceOf(Date)
      expect(mockJobDoc.deletedAt.getTime()).toBeLessThanOrEqual(Date.now())

      // (K, L, N, O) Historical records are retained — no cascade deletes
      expect(aiAnalysisDeleteSpy).not.toHaveBeenCalled()
      expect(appDeleteSpy).not.toHaveBeenCalled()
      expect(prepDeleteSpy).not.toHaveBeenCalled()
      expect(sessDeleteSpy).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 2. NORMAL JOB QUERIES EXCLUDE SOFT-DELETED JOBS
  // =========================================================================
  describe('Normal Job Queries Exclusion', () => {
    it('listJobs excludes deleted jobs via isDeleted: { $ne: true }', async () => {
      Job.countDocuments.mockResolvedValue(1)
      Job.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ _id: jobId, title: 'Engineer' }]),
      })

      const res = await jobService.listJobs(userId, {})
      expect(res.jobs).toHaveLength(1)

      // Verify filter passed to countDocuments and find
      expect(Job.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ user: userId, isDeleted: { $ne: true } })
      )
      expect(Job.find).toHaveBeenCalledWith(
        expect.objectContaining({ user: userId, isDeleted: { $ne: true } })
      )
    })

    it('getJob returns 404 when querying a soft-deleted job', async () => {
      // Job.findOne returns null because query specifies isDeleted: { $ne: true }
      Job.findOne.mockResolvedValue(null)

      await expect(jobService.getJob(userId, jobId)).rejects.toThrow('Job not found')
      expect(Job.findOne).toHaveBeenCalledWith({
        _id: jobId,
        user: userId,
        isDeleted: { $ne: true },
      })
    })

    it('aiAnalysis getSummary excludes deleted jobs from total count', async () => {
      AIAnalysis.find.mockReturnValue({
        populate: vi.fn().mockResolvedValue([]),
      })
      Job.countDocuments.mockResolvedValue(5)

      const summary = await aiAnalysisService.getSummary(userId)
      expect(Job.countDocuments).toHaveBeenCalledWith({
        user: userId,
        isDeleted: { $ne: true },
      })
      expect(summary.unmatchedJobs).toBe(5)
    })
  })

  // =========================================================================
  // 3. APPLY & MATCH GUARDS ON DELETED JOBS
  // =========================================================================
  describe('Apply & AI Match Guards on Deleted Jobs', () => {
    it('createApplication rejects applying to a soft-deleted job with 404', async () => {
      // Mock Job.findOne with isDeleted: { $ne: true } -> returns null
      Job.findOne.mockResolvedValue(null)

      await expect(
        applicationService.createApplication(userId, { job: jobId })
      ).rejects.toThrow('Job not found')

      expect(Job.findOne).toHaveBeenCalledWith({
        _id: jobId,
        user: userId,
        isDeleted: { $ne: true },
      })
    })

    it('generateMatch rejects running AI match on a soft-deleted job with 404', async () => {
      Job.findOne.mockResolvedValue(null)
      const { generateMatch } = await import('./match.service.js')

      await expect(generateMatch(userId, jobId)).rejects.toThrow('Job not found')

      expect(Job.findOne).toHaveBeenCalledWith({
        _id: jobId,
        user: userId,
        isDeleted: { $ne: true },
      })
    })
  })

  // =========================================================================
  // 4. appliedAt AUTO-SET AND EDIT BEHAVIOR
  // =========================================================================
  describe('appliedAt Behavior', () => {
    it('auto-sets appliedAt to a valid current Date when creating an application without appliedAt', async () => {
      // Target job exists and is active
      Job.findOne.mockResolvedValue({ _id: jobId, user: userId })

      Application.create.mockImplementation((payload) => Promise.resolve({ ...payload, _id: appId }))

      const before = Date.now()
      const created = await applicationService.createApplication(userId, { job: jobId })
      const after = Date.now()

      expect(created).toBeDefined()
      expect(created.appliedAt).toBeInstanceOf(Date)
      expect(created.appliedAt.getTime()).toBeGreaterThanOrEqual(before)
      expect(created.appliedAt.getTime()).toBeLessThanOrEqual(after)
      expect(created.job).toBe(jobId)
      expect(created.user).toBe(userId)
    })

    it('respects explicitly provided appliedAt when provided', async () => {
      Job.findOne.mockResolvedValue({ _id: jobId, user: userId })
      Application.create.mockImplementation((payload) => Promise.resolve({ ...payload, _id: appId }))

      const explicitDate = '2026-08-15T00:00:00.000Z'
      const created = await applicationService.createApplication(userId, {
        job: jobId,
        appliedAt: explicitDate,
      })

      expect(created.appliedAt).toEqual(new Date(explicitDate))
    })

    it('editing an application via updateApplication preserves existing appliedAt when not passed', async () => {
      const existingAppliedAt = new Date('2026-08-10T12:00:00.000Z')
      const mockUpdated = {
        _id: appId,
        user: userId,
        status: 'interviewing',
        appliedAt: existingAppliedAt,
        notes: 'Had initial call',
      }

      Application.findOneAndUpdate.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUpdated),
      })

      const result = await applicationService.updateApplication(userId, appId, {
        status: 'interviewing',
        notes: 'Had initial call',
      })

      expect(Application.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: appId, user: userId },
        { $set: { status: 'interviewing', notes: 'Had initial call' } },
        { new: true, runValidators: true }
      )
      expect(result.appliedAt).toEqual(existingAppliedAt)
    })
  })

  // =========================================================================
  // 5. CAREER DIRECTION DELETION RETAINS AIANALYSIS
  // =========================================================================
  describe('CareerDirection Deletion Retains AIAnalysis', () => {
    it('deleting CareerDirection does not delete AIAnalysis documents', async () => {
      const cdId = new mongoose.Types.ObjectId().toString()
      const { deleteCareerDirection } = await import('./careerDirection.service.js')

      CareerDirection.findOneAndDelete.mockResolvedValue({ _id: cdId, user: userId })
      const aiAnalysisDeleteSpy = vi.spyOn(AIAnalysis, 'deleteMany')

      await deleteCareerDirection(userId, cdId)

      expect(CareerDirection.findOneAndDelete).toHaveBeenCalledWith({
        _id: cdId,
        user: userId,
      })
      // AIAnalysis is NOT touched
      expect(aiAnalysisDeleteSpy).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 6. DELETE CASCADE TESTS (APPLICATION & INTERVIEW)
  // =========================================================================
  describe('Delete Cascade Behavior', () => {
    it('deleteApplication cascades to child interviews, preparations, and practice sessions', async () => {
      const mockAppDoc = {
        _id: appId,
        user: userId,
        deleteOne: vi.fn().mockResolvedValue(true),
      }
      Application.findOne.mockResolvedValue(mockAppDoc)

      const intId1 = new mongoose.Types.ObjectId().toString()
      const intId2 = new mongoose.Types.ObjectId().toString()
      Interview.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: intId1 }, { _id: intId2 }]),
      })

      await applicationService.deleteApplication(userId, appId)

      expect(Application.findOne).toHaveBeenCalledWith({
        _id: appId,
        user: userId,
      })
      expect(Interview.find).toHaveBeenCalledWith({
        user: userId,
        application: appId,
      })
      expect(InterviewPreparation.deleteMany).toHaveBeenCalledWith({
        user: userId,
        interview: { $in: [intId1, intId2] },
      })
      expect(PracticeSession.deleteMany).toHaveBeenCalledWith({
        user: userId,
        interview: { $in: [intId1, intId2] },
      })
      expect(Interview.deleteMany).toHaveBeenCalledWith({
        _id: { $in: [intId1, intId2] },
        user: userId,
      })
      expect(mockAppDoc.deleteOne).toHaveBeenCalled()
    })

    it('deleteInterview cascades to child preparations and practice sessions', async () => {
      const interviewId = new mongoose.Types.ObjectId().toString()
      const mockIntDoc = {
        _id: interviewId,
        user: userId,
        deleteOne: vi.fn().mockResolvedValue(true),
      }
      Interview.findOne.mockResolvedValue(mockIntDoc)

      await interviewService.deleteInterview(userId, interviewId)

      expect(Interview.findOne).toHaveBeenCalledWith({
        _id: interviewId,
        user: userId,
      })
      expect(InterviewPreparation.deleteMany).toHaveBeenCalledWith({
        user: userId,
        interview: interviewId,
      })
      expect(PracticeSession.deleteMany).toHaveBeenCalledWith({
        user: userId,
        interview: interviewId,
      })
      expect(mockIntDoc.deleteOne).toHaveBeenCalled()
    })
  })
})
