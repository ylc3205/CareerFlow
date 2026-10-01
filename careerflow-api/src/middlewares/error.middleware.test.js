import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notFound, errorHandler } from './error.middleware.js'
import ApiError from '../utils/ApiError.js'

describe('error.middleware', () => {
  let req
  let res
  let originalEnv

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
    req = { method: 'GET', originalUrl: '/api/test' }
    res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code
        return this
      },
      json(data) {
        this.body = data
        return this
      },
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
  })

  it('notFound sends 404 with route info', () => {
    notFound(req, res, () => {})
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({
      success: false,
      message: 'Route not found: GET /api/test',
    })
  })

  it('handles operational ApiError correctly', () => {
    const err = new ApiError(404, 'Job not found')
    errorHandler(err, req, res, () => {})
    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({
      success: false,
      message: 'Job not found',
    })
  })

  it('handles Mongoose CastError as 400', () => {
    const err = new Error('Cast to ObjectId failed')
    err.name = 'CastError'
    errorHandler(err, req, res, () => {})
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      success: false,
      message: 'Invalid resource identifier',
    })
  })

  it('handles MulterError LIMIT_FILE_SIZE as 400', () => {
    const err = new Error('File too large')
    err.name = 'MulterError'
    err.code = 'LIMIT_FILE_SIZE'
    errorHandler(err, req, res, () => {})
    expect(res.statusCode).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toContain('File too large')
  })

  it('preserves message for unexpected 500 error in non-production', () => {
    process.env.NODE_ENV = 'development'
    const err = new Error('Secret DB connection failed')
    errorHandler(err, req, res, () => {})
    expect(res.statusCode).toBe(500)
    expect(res.body).toEqual({
      success: false,
      message: 'Secret DB connection failed',
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('masks unexpected 500 error in production', () => {
    process.env.NODE_ENV = 'production'
    const err = new Error('Secret DB connection failed')
    errorHandler(err, req, res, () => {})
    expect(res.statusCode).toBe(500)
    expect(res.body).toEqual({
      success: false,
      message: 'Internal Server Error',
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('keeps message for operational 502/503 errors even in production', () => {
    process.env.NODE_ENV = 'production'
    const err = new ApiError(503, 'AI provider temporarily unavailable', true)
    errorHandler(err, req, res, () => {})
    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({
      success: false,
      message: 'AI provider temporarily unavailable',
    })
    expect(console.error).toHaveBeenCalled()
  })
})
