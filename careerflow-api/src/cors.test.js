import { describe, it, expect } from 'vitest'
import { parseAllowedOrigins, getCorsOriginDelegate } from './app.js'

describe('CORS Configuration', () => {
  it('parses single origin and defaults', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(['http://localhost:5173'])
    expect(parseAllowedOrigins('')).toEqual(['http://localhost:5173'])
    expect(parseAllowedOrigins('http://localhost:3000')).toEqual(['http://localhost:3000'])
  })

  it('parses multiple comma-separated origins', () => {
    const raw = 'http://localhost:5173, https://app.careerflow.com, https://staging.careerflow.com '
    expect(parseAllowedOrigins(raw)).toEqual([
      'http://localhost:5173',
      'https://app.careerflow.com',
      'https://staging.careerflow.com',
    ])
  })

  it('allows requests without origin (non-browser/server-to-server)', () => {
    const delegate = getCorsOriginDelegate('http://localhost:5173')
    let allowed = false
    let err = null
    delegate(undefined, (e, res) => {
      err = e
      allowed = res
    })
    expect(err).toBeNull()
    expect(allowed).toBe(true)
  })

  it('allows trusted origin in single-origin configuration', () => {
    const delegate = getCorsOriginDelegate('http://localhost:5173')
    let allowed = false
    let err = null
    delegate('http://localhost:5173', (e, res) => {
      err = e
      allowed = res
    })
    expect(err).toBeNull()
    expect(allowed).toBe(true)
  })

  it('allows any trusted origin in multi-origin configuration', () => {
    const delegate = getCorsOriginDelegate('http://localhost:5173,https://app.careerflow.com')
    let allowedA = false
    let allowedB = false
    delegate('http://localhost:5173', (e, res) => {
      allowedA = res
    })
    delegate('https://app.careerflow.com', (e, res) => {
      allowedB = res
    })
    expect(allowedA).toBe(true)
    expect(allowedB).toBe(true)
  })

  it('rejects untrusted origins with an error', () => {
    const delegate = getCorsOriginDelegate('http://localhost:5173')
    let allowed = false
    let err = null
    delegate('http://malicious-site.com', (e, res) => {
      err = e
      allowed = res
    })
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Not allowed by CORS')
    expect(allowed).toBeUndefined()
  })
})
