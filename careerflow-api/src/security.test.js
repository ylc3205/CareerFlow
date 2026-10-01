import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from './app.js'

describe('Security Headers (Helmet)', () => {
  it('sets expected HTTP security headers on responses', async () => {
    const res = await request(app).get('/api/health')

    // Helmet default headers
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBeDefined()
    expect(res.headers['x-dns-prefetch-control']).toBe('off')
    expect(res.headers['x-download-options']).toBe('noopen')
    expect(res.headers['x-permitted-cross-domain-policies']).toBe('none')

    // Express signature should not be leaked
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('sets Content-Security-Policy header', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['content-security-policy']).toBeDefined()
  })
})
