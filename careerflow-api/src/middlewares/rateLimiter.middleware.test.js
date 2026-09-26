import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRateLimiter, authLimiter, aiLimiter } from './rateLimiter.middleware.js'

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    authLimiter.reset()
    aiLimiter.reset()
  })

  it('allows requests within max limits', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 5000 })
    const req = { ip: '192.168.1.1', headers: {} }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    }
    const next = vi.fn()

    // 1st request
    limiter(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()

    // 2nd request
    limiter(req, res, next)
    expect(next).toHaveBeenCalledTimes(2)

    // 3rd request
    limiter(req, res, next)
    expect(next).toHaveBeenCalledTimes(3)
  })

  it('blocks requests exceeding max limit and returns status 429 and Retry-After', () => {
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 10000,
      message: 'Rate limit exceeded',
    })
    const req = { ip: '10.0.0.1', headers: {} }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    }
    const next = vi.fn()

    limiter(req, res, next) // 1st: allowed
    limiter(req, res, next) // 2nd: allowed
    expect(next).toHaveBeenCalledTimes(2)

    limiter(req, res, next) // 3rd: blocked
    expect(next).toHaveBeenCalledTimes(2)
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number))
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Rate limit exceeded',
    })
  })

  it('isolates rate limits by IP or authenticated user', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 5000 })
    const reqA = { ip: '1.1.1.1', headers: {} }
    const reqB = { ip: '2.2.2.2', headers: {} }
    const userReq = { user: { userId: 'user-123' }, ip: '1.1.1.1', headers: {} }

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    }
    const next = vi.fn()

    limiter(reqA, res, next) // reqA first -> allowed
    expect(next).toHaveBeenCalledTimes(1)

    limiter(reqA, res, next) // reqA second -> blocked
    expect(res.status).toHaveBeenCalledWith(429)

    limiter(reqB, res, next) // reqB first -> allowed
    expect(next).toHaveBeenCalledTimes(2)

    limiter(userReq, res, next) // userReq first -> allowed
    expect(next).toHaveBeenCalledTimes(3)
  })

  it('resets hits when reset() is called', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 5000 })
    const req = { ip: '5.5.5.5', headers: {} }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    }
    const next = vi.fn()

    limiter(req, res, next) // 1
    limiter(req, res, next) // blocked
    expect(res.status).toHaveBeenCalledWith(429)

    limiter.reset()
    limiter(req, res, next) // after reset -> allowed
    expect(next).toHaveBeenCalledTimes(2)
  })
})
