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

  // =========================================================================
  // 7. IMP-01: JOB SOURCEURL UNIQUENESS & SOFT-DELETE RE-SAVING
  // =========================================================================
  describe('IMP-01: Job sourceUrl Uniqueness & Soft-Delete Re-Saving', () => {
    it('createJob throws 409 when saving an active duplicate sourceUrl (E11000)', async () => {
      const duplicateError = new Error('E11000 duplicate key error')
      duplicateError.code = 11000
      Job.create.mockRejectedValue(duplicateError)

      await expect(
        jobService.createJob(userId, {
          title: 'Backend Dev',
          company: 'VNG',
          sourceUrl: 'https://example.com/job/1',
        })
      ).rejects.toThrow('You have already saved a job from this URL')
    })

    it('createJob succeeds when saving the same sourceUrl after previous job was soft-deleted', async () => {
      // In MongoDB with partialFilterExpression { isDeleted: false },
      // creating a new active document with the same sourceUrl succeeds (no E11000)
      const newJobDoc = {
        _id: new mongoose.Types.ObjectId().toString(),
        user: userId,
        title: 'Backend Dev Re-saved',
        company: 'VNG',
        sourceUrl: 'https://example.com/job/1',
        isDeleted: false,
      }
      Job.create.mockResolvedValue(newJobDoc)

      const res = await jobService.createJob(userId, {
        title: 'Backend Dev Re-saved',
        company: 'VNG',
        sourceUrl: 'https://example.com/job/1',
      })

      expect(res).toBeDefined()
      expect(res.sourceUrl).toBe('https://example.com/job/1')
      expect(Job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: userId,
          sourceUrl: 'https://example.com/job/1',
        })
      )
    })

    it('allows different users to save the same sourceUrl', async () => {
      const user2Id = new mongoose.Types.ObjectId().toString()
      const jobUser2 = {
        _id: new mongoose.Types.ObjectId().toString(),
        user: user2Id,
        title: 'Backend Dev',
        company: 'VNG',
        sourceUrl: 'https://example.com/job/1',
        isDeleted: false,
      }
      Job.create.mockResolvedValue(jobUser2)

      const res = await jobService.createJob(user2Id, {
        title: 'Backend Dev',
        company: 'VNG',
        sourceUrl: 'https://example.com/job/1',
      })

      expect(res.user).toBe(user2Id)
      expect(res.sourceUrl).toBe('https://example.com/job/1')
    })
  })

  // =========================================================================
  // 8. IMP-02: AI ANALYSIS SUMMARY FILTERING (EXCLUDES NULL / SOFT-DELETED JOBS)
  // =========================================================================
  describe('IMP-02: AI Analysis Summary Filtering', () => {
    it('getSummary filters out analyses with null job reference or soft-deleted job', async () => {
      const activeJobId = new mongoose.Types.ObjectId().toString()
      const deletedJobId = new mongoose.Types.ObjectId().toString()

      // 3 analyses in DB:
      // 1. Populated with an active job (isDeleted: false) -> score 90
      // 2. Populated with a soft-deleted job (isDeleted: true) -> score 40 (must be ignored)
      // 3. Populated with null job (job was deleted) -> score 50 (must be ignored)
      const mockAnalyses = [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          user: userId,
          matchScore: 90,
          job: { _id: activeJobId, title: 'Active Job', company: 'Acme', isDeleted: false },
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          user: userId,
          matchScore: 40,
          job: { _id: deletedJobId, title: 'Deleted Job', company: 'Old Corp', isDeleted: true },
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          user: userId,
          matchScore: 50,
          job: null,
        },
      ]

      AIAnalysis.find.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockAnalyses),
      })
      Job.countDocuments.mockResolvedValue(2) // 2 active jobs total in DB

      const summary = await aiAnalysisService.getSummary(userId)

      // Only activeJobId should be counted in summary metrics
      expect(summary.totalAnalyses).toBe(1)
      expect(summary.averageMatchScore).toBe(90)
      expect(summary.highestMatch.matchScore).toBe(90)
      expect(summary.highestMatch.job._id).toBe(activeJobId)
      expect(summary.lowestMatch.matchScore).toBe(90)
      expect(summary.matchedJobs).toBe(1)
      expect(summary.unmatchedJobs).toBe(1) // 2 active jobs - 1 matched = 1 unmatched
    })

    it('getSummary does not inflate matchedJobs with undefined when all jobs are null/deleted', async () => {
      const mockAnalyses = [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          user: userId,
          matchScore: 40,
          job: null,
        },
      ]

      AIAnalysis.find.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockAnalyses),
      })
      Job.countDocuments.mockResolvedValue(0)

      const summary = await aiAnalysisService.getSummary(userId)

      expect(summary.totalAnalyses).toBe(0)
      expect(summary.averageMatchScore).toBe(0)
      expect(summary.matchedJobs).toBe(0)
      expect(summary.unmatchedJobs).toBe(0)
      expect(summary.highestMatch).toBeNull()
      expect(summary.lowestMatch).toBeNull()
    })
  })

  // =========================================================================
  // 9. IMP-03: EXCLUDE SOFT-DELETED JOBS FROM APPLICATION & INTERVIEW SEARCH
  // =========================================================================
  describe('IMP-03: Search Subqueries Exclude Soft-Deleted Jobs', () => {
    it('listApplications search filters Job.find with isDeleted: { $ne: true }', async () => {
      Job.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: jobId }]),
      })
      Application.countDocuments.mockResolvedValue(1)
      Application.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue([{ _id: appId, job: { _id: jobId, title: 'Node Dev' } }]),
      })

      await applicationService.listApplications(userId, { search: 'Node' })

      expect(Job.find).toHaveBeenCalledWith({
        user: userId,
        isDeleted: { $ne: true },
        $or: [{ title: expect.any(RegExp) }, { company: expect.any(RegExp) }],
      })
    })

    it('listInterviews search filters Job.find with isDeleted: { $ne: true }', async () => {
      Job.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: jobId }]),
      })
      Application.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: appId }]),
      })
      Interview.countDocuments.mockResolvedValue(1)
      Interview.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue([{ _id: 'int-1', application: { _id: appId } }]),
      })

      await interviewService.listInterviews(userId, { search: 'Node' })

      expect(Job.find).toHaveBeenCalledWith({
        user: userId,
        isDeleted: { $ne: true },
        $or: [{ title: expect.any(RegExp) }, { company: expect.any(RegExp) }],
      })
    })
  })

  // =========================================================================
  // 10. IMP-06: TARGETED AI ANALYSIS QUERY BY JOB ID
  // =========================================================================
  describe('IMP-06: Targeted AI Analysis Query', () => {
    it('listAnalyses queries by user and job when filter.job is provided', async () => {
      const targetJobId = new mongoose.Types.ObjectId().toString()
      const mockAnalyses = [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          user: userId,
          matchScore: 92,
          job: { _id: targetJobId, title: 'Node Dev', company: 'Tech Corp', isDeleted: false },
        },
      ]

      AIAnalysis.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(mockAnalyses),
      })

      const results = await aiAnalysisService.listAnalyses(userId, { job: targetJobId })

      expect(AIAnalysis.find).toHaveBeenCalledWith({ user: userId, job: targetJobId })
      expect(results).toHaveLength(1)
      expect(results[0].job._id).toBe(targetJobId)
    })

    it('listAnalyses returns empty array without DB query if filter.job is invalid ObjectId', async () => {
      AIAnalysis.find.mockClear()
      const results = await aiAnalysisService.listAnalyses(userId, { job: 'invalid-id' })
      expect(results).toEqual([])
      expect(AIAnalysis.find).not.toHaveBeenCalled()
    })

    it('listAnalyses excludes analyses referencing soft-deleted jobs', async () => {
      const targetJobId = new mongoose.Types.ObjectId().toString()
      const mockAnalyses = [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          user: userId,
          matchScore: 85,
          job: { _id: targetJobId, title: 'Deleted Job', isDeleted: true },
        },
      ]

      AIAnalysis.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue(mockAnalyses),
      })

      const results = await aiAnalysisService.listAnalyses(userId, { job: targetJobId })
      expect(results).toHaveLength(0)
    })
  })
})
