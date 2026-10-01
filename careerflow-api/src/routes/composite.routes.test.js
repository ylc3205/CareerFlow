import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import express from 'express'
import app from '../app.js'

// Mock services/models to test route handling and contract integrity
const mockUserId = new mongoose.Types.ObjectId().toString()
const mockJobId = new mongoose.Types.ObjectId().toString()

vi.mock('../middlewares/auth.middleware.js', () => ({
  default: (req, res, next) => {
    req.user = { userId: mockUserId }
    next()
  },
}))

describe('Composite Endpoints & Performance Routes', () => {
  describe('GET /api/dashboard/overview', () => {
    it('returns 200 with composite overview payload', async () => {
      const res = await request(app).get('/api/dashboard/overview')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('overview')
      expect(res.body.data).toHaveProperty('pipeline')
      expect(res.body.data).toHaveProperty('nextInterview')
      expect(res.body.data).toHaveProperty('practice')
      expect(res.body.data.overview).toHaveProperty('jobs')
      expect(res.body.data.overview).toHaveProperty('applications')
      expect(res.body.data.overview).toHaveProperty('interviews')
      expect(res.body.data.overview).toHaveProperty('offers')
    })
  })

  describe('GET /api/jobs/:id/context', () => {
    it('returns 400 for invalid jobId', async () => {
      const res = await request(app).get('/api/jobs/invalid-id/context')
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('returns 404 for non-existent job', async () => {
      const randomId = new mongoose.Types.ObjectId().toString()
      const res = await request(app).get(`/api/jobs/${randomId}/context`)
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })
})
