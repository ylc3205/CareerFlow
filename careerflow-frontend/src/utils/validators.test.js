import { describe, it, expect } from 'vitest'
import { validateJob } from './validators.js'
import { emptyJobForm } from './jobForm.js'

describe('validateJob', () => {
  it('returns no errors for a valid form', () => {
    const errors = validateJob({ ...emptyJobForm(), title: 'Backend Dev', company: 'VNG' })
    expect(errors).toEqual({})
  })

  it('flags an empty title as required', () => {
    const errors = validateJob({ ...emptyJobForm(), company: 'VNG' })
    expect(errors.title).toBe('Title is required')
  })

  it('flags a title longer than 300 characters', () => {
    const errors = validateJob({ ...emptyJobForm(), title: 'x'.repeat(301), company: 'VNG' })
    expect(errors.title).toBe('Title must be 300 characters or fewer')
  })

  it('flags an empty company as required', () => {
    const errors = validateJob({ ...emptyJobForm(), title: 'Backend Dev' })
    expect(errors.company).toBe('Company is required')
  })

  it('flags a company longer than 200 characters', () => {
    const errors = validateJob({ ...emptyJobForm(), title: 'Backend Dev', company: 'x'.repeat(201) })
    expect(errors.company).toBe('Company must be 200 characters or fewer')
  })

  it('flags an invalid sourceUrl', () => {
    const errors = validateJob({ ...emptyJobForm(), title: 'Backend Dev', company: 'VNG', sourceUrl: 'not-a-url' })
    expect(errors.sourceUrl).toBe('Enter a valid URL')
  })

  it('accepts an empty sourceUrl (optional)', () => {
    const errors = validateJob({ ...emptyJobForm(), title: 'Backend Dev', company: 'VNG', sourceUrl: '' })
    expect(errors.sourceUrl).toBeUndefined()
  })

  it('accepts a valid sourceUrl', () => {
    const errors = validateJob({ ...emptyJobForm(), title: 'Backend Dev', company: 'VNG', sourceUrl: 'https://example.com/job' })
    expect(errors.sourceUrl).toBeUndefined()
  })
})
