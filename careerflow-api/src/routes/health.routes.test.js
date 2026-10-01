import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../app.js'
import { setShutdownStatus, resetShutdownStatus } from '../utils/lifecycle.js'

describe('Health Routes', () => {
  let originalReadyState

  beforeEach(() => {
    resetShutdownStatus()
    originalReadyState = mongoose.connection.readyState
  })

  afterEach(() => {
    resetShutdownStatus()
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: originalReadyState,
      writable: true,
      configurable: true,
    })
  })

  it('GET /api/health/live returns 200 regardless of DB state', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 0,
      writable: true,
      configurable: true,
    })
    const res = await request(app).get('/api/health/live')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.status).toBe('alive')
  })

  it('GET /api/health/ready returns 200 when DB is connected and not shutting down', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      writable: true,
      configurable: true,
    })
    const res = await request(app).get('/api/health/ready')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.status).toBe('ready')
    expect(res.body.db).toBe('connected')
  })

  it('GET /api/health/ready returns 503 when DB is disconnected', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 0,
      writable: true,
      configurable: true,
    })
    const res = await request(app).get('/api/health/ready')
    expect(res.status).toBe(503)
    expect(res.body.success).toBe(false)
    expect(res.body.status).toBe('unavailable')
    expect(res.body.db).toBe('disconnected')
  })

  it('GET /api/health/ready returns 503 during shutdown even if DB is connected', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      writable: true,
      configurable: true,
    })
    setShutdownStatus(true)
    const res = await request(app).get('/api/health/ready')
    expect(res.status).toBe(503)
    expect(res.body.success).toBe(false)
    expect(res.body.shuttingDown).toBe(true)
  })

  it('GET /api/health returns 200 when DB is connected', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      writable: true,
      configurable: true,
    })
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.status).toBe('healthy')
  })

  it('GET /api/health returns 503 when DB is disconnected', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 0,
      writable: true,
      configurable: true,
    })
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(503)
    expect(res.body.success).toBe(false)
    expect(res.body.status).toBe('unhealthy')
  })
})
