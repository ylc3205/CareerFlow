import ApiError from '../utils/ApiError.js'

/**
 * Lightweight in-memory sliding-window / reset-window rate limiter.
 * Designed for single-instance Node/Express deployments without external dependencies.
 */
export const createRateLimiter = (options = {}) => {
  const windowMs = Number(options.windowMs) || 60 * 1000
  const max = Number(options.max) || 30
  const message = options.message || 'Too many requests, please try again later.'
  const keyGenerator =
    options.keyGenerator ||
    ((req) => {
      const ip =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        'unknown'
      return req.user?.userId ? `user:${req.user.userId}` : `ip:${ip}`
    })

  const hits = new Map()

  const interval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of hits.entries()) {
      if (record.resetTime <= now) {
        hits.delete(key)
      }
    }
  }, Math.min(windowMs, 60000))
  if (interval.unref) interval.unref()

  const middleware = (req, res, next) => {
    const now = Date.now()
    const key = keyGenerator(req)
    let record = hits.get(key)

    if (!record || record.resetTime <= now) {
      record = { count: 1, resetTime: now + windowMs }
      hits.set(key, record)
      return next()
    }

    if (record.count < max) {
      record.count += 1
      return next()
    }

    const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000))
    res.setHeader('Retry-After', retryAfterSec)
    return res.status(429).json({
      success: false,
      message,
    })
  }

  middleware.reset = () => {
    hits.clear()
  }

  middleware._hits = hits

  return middleware
}

export const authLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  message: 'Too many authentication attempts. Please try again later.',
  keyGenerator: (req) =>
    req.ip ||
    req.headers['x-forwarded-for'] ||
    req.socket?.remoteAddress ||
    'unknown',
})

export const aiLimiter = createRateLimiter({
  windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_MAX) || 30,
  message: 'Too many AI requests. Please slow down and try again later.',
})
