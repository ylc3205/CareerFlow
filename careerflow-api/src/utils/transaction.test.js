import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import mongoose from 'mongoose'
import { supportsTransactions, runInTransaction } from './transaction.js'
import Job from '../models/job.model.js'
import Application from '../models/application.model.js'
import Interview from '../models/interview.model.js'
import PracticeSession from '../models/practiceSession.model.js'
import AIAnalysis from '../models/aiAnalysis.model.js'

describe('Transaction Helper (src/utils/transaction.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('supportsTransactions()', () => {
    it('returns false when mongoose has no active client or topology', () => {
      vi.spyOn(mongoose.connection, 'getClient').mockReturnValue(null)
      expect(supportsTransactions()).toBe(false)
    })

    it('returns false when client topology type is Single (standalone MongoDB)', () => {
      vi.spyOn(mongoose.connection, 'getClient').mockReturnValue({
        topology: { description: { type: 'Single' } },
      })
      expect(supportsTransactions()).toBe(false)
    })

    it('returns false when client topology type is Unknown', () => {
      vi.spyOn(mongoose.connection, 'getClient').mockReturnValue({
        topology: { description: { type: 'Unknown' } },
      })
      expect(supportsTransactions()).toBe(false)
    })

    it('returns true when client topology type is ReplicaSetWithPrimary (MongoDB Atlas / Replica Set)', () => {
      vi.spyOn(mongoose.connection, 'getClient').mockReturnValue({
        topology: { description: { type: 'ReplicaSetWithPrimary' } },
      })
      expect(supportsTransactions()).toBe(true)
    })

    it('returns true when client topology type is Sharded', () => {
      vi.spyOn(mongoose.connection, 'getClient').mockReturnValue({
        topology: { description: { type: 'Sharded' } },
      })
      expect(supportsTransactions()).toBe(true)
    })

    it('returns false safely if inspecting client throws an exception', () => {
      vi.spyOn(mongoose.connection, 'getClient').mockImplementation(() => {
        throw new Error('Connection closed')
      })
      expect(supportsTransactions()).toBe(false)
    })
  })

  describe('runInTransaction()', () => {
    it('executes callback with null session when transactions are not supported (standalone fallback)', async () => {
      vi.spyOn(mongoose.connection, 'getClient').mockReturnValue({
        topology: { description: { type: 'Single' } },
      })
      const startSessionSpy = vi.spyOn(mongoose, 'startSession')

      const result = await runInTransaction(async (session) => {
        expect(session).toBeNull()
        return 'fallback-result'
      })

      expect(result).toBe('fallback-result')
      expect(startSessionSpy).not.toHaveBeenCalled()
    })

    it('starts session and commits transaction when topology supports transactions', async () => {
      vi.spyOn(mongoose.connection, 'getClient').mockReturnValue({
        topology: { description: { type: 'ReplicaSetWithPrimary' } },
      })

      const mockSession = {
        withTransaction: vi.fn(async (cb) => {
          return await cb()
        }),
        endSession: vi.fn().mockResolvedValue(undefined),
      }

      vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession)

      const result = await runInTransaction(async (session) => {
        expect(session).toBe(mockSession)
        return 'transaction-committed'
      })

      expect(result).toBe('transaction-committed')
      expect(mockSession.withTransaction).toHaveBeenCalled()
      expect(mockSession.endSession).toHaveBeenCalled()
    })

    it('ensures session.endSession is called and throws error when transaction fails (rollback behavior)', async () => {
      vi.spyOn(mongoose.connection, 'getClient').mockReturnValue({
        topology: { description: { type: 'ReplicaSetWithPrimary' } },
      })

      const mockSession = {
        withTransaction: vi.fn(async (cb) => {
          return await cb()
        }),
        endSession: vi.fn().mockResolvedValue(undefined),
      }

      vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession)

      await expect(
        runInTransaction(async () => {
          throw new Error('Database write collision')
        })
      ).rejects.toThrow('Database write collision')

      expect(mockSession.endSession).toHaveBeenCalled()
    })
  })

  describe('Model Compound Indexes Verification', () => {
    it('Job schema defines expected ESR compound indexes without redundant single user index', () => {
      const indexes = Job.schema.indexes()
      const indexKeys = indexes.map(([fields]) => fields)

      // Compound indexes exist
      expect(indexKeys).toContainEqual({ user: 1, isDeleted: 1, createdAt: -1 })
      expect(indexKeys).toContainEqual({ user: 1, isDeleted: 1, status: 1, createdAt: -1 })
      expect(indexKeys).toContainEqual({ user: 1, sourceUrl: 1 })

      // Redundant standalone { user: 1 } should NOT exist
      expect(indexKeys).not.toContainEqual({ user: 1 })
    })

    it('Application schema defines expected compound indexes', () => {
      const indexes = Application.schema.indexes()
      const indexKeys = indexes.map(([fields]) => fields)

      expect(indexKeys).toContainEqual({ user: 1, job: 1 })
      expect(indexKeys).toContainEqual({ user: 1, createdAt: -1 })
      expect(indexKeys).toContainEqual({ user: 1, status: 1, createdAt: -1 })
    })

    it('Interview schema defines expected ESR compound indexes without redundant single user index', () => {
      const indexes = Interview.schema.indexes()
      const indexKeys = indexes.map(([fields]) => fields)

      expect(indexKeys).toContainEqual({ user: 1, createdAt: -1 })
      expect(indexKeys).toContainEqual({ user: 1, status: 1, createdAt: -1 })
      expect(indexKeys).toContainEqual({ user: 1, application: 1, createdAt: -1 })

      // Redundant standalone { user: 1 } should NOT exist
      expect(indexKeys).not.toContainEqual({ user: 1 })
    })

    it('PracticeSession schema defines upgraded reverse-chronological compound index', () => {
      const indexes = PracticeSession.schema.indexes()
      const indexKeys = indexes.map(([fields]) => fields)

      expect(indexKeys).toContainEqual({ user: 1, interview: 1, createdAt: -1 })
      expect(indexKeys).toContainEqual({ user: 1, status: 1, createdAt: -1 })
      expect(indexKeys).toContainEqual({ user: 1, status: 1, completedAt: -1 })

      // Old index without createdAt should NOT exist
      expect(indexKeys).not.toContainEqual({ user: 1, interview: 1 })
    })

    it('AIAnalysis schema defines user + createdAt compound index', () => {
      const indexes = AIAnalysis.schema.indexes()
      const indexKeys = indexes.map(([fields]) => fields)

      expect(indexKeys).toContainEqual({ user: 1, job: 1 })
      expect(indexKeys).toContainEqual({ user: 1, createdAt: -1 })
      expect(indexKeys).toContainEqual({ job: 1 })
    })
  })
})
