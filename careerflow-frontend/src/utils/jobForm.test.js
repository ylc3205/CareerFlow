import { describe, it, expect, vi, beforeEach } from 'vitest'
import { emptyJobForm, hydrateJobForm, buildJobPayload } from './jobForm.js'

describe('jobForm model helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emptyJobForm returns an empty form with defaults', () => {
    const form = emptyJobForm()
    expect(form).toEqual({
      title: '',
      company: '',
      location: '',
      employmentType: '',
      workplaceType: '',
      status: 'saved',
      description: '',
      requirements: '',
      responsibilities: '',
      skills: '',
      salaryMin: '',
      salaryMax: '',
      salaryCurrency: 'USD',
      salaryPeriod: '',
      source: '',
      sourceUrl: '',
      postedAt: '',
      deadline: '',
      notes: '',
    })
  })

  it('emptyJobForm returns a fresh object each call', () => {
    const a = emptyJobForm()
    const b = emptyJobForm()
    expect(a).not.toBe(b)
    a.title = 'changed'
    expect(b.title).toBe('')
  })

  it('hydrateJobForm maps a backend job into form fields', () => {
    const job = {
      _id: 'job_1',
      title: 'Backend Developer',
      company: 'VNG',
      location: 'HCM',
      employmentType: 'full-time',
      workplaceType: 'remote',
      status: 'applied',
      skills: ['Node.js', 'MongoDB'],
      salary: { min: 1500, max: 2500, currency: 'USD', period: 'monthly' },
      source: 'LinkedIn',
      sourceUrl: 'https://linkedin.com/jobs/1',
      postedAt: '2026-08-01T00:00:00.000Z',
      deadline: '2026-09-01T00:00:00.000Z',
      notes: 'a note',
    }
    const form = hydrateJobForm(job)
    expect(form.title).toBe('Backend Developer')
    expect(form.company).toBe('VNG')
    expect(form.status).toBe('applied')
    expect(form.skills).toBe('Node.js, MongoDB')
    expect(form.salaryMin).toBe(1500)
    expect(form.salaryMax).toBe(2500)
    expect(form.salaryCurrency).toBe('USD')
    expect(form.salaryPeriod).toBe('monthly')
    expect(form.postedAt).toBe('2026-08-01')
    expect(form.deadline).toBe('2026-09-01')
  })

  it('hydrateJobForm handles missing optional fields gracefully', () => {
    const form = hydrateJobForm({ title: 'X', company: 'Y' })
    expect(form.location).toBe('')
    expect(form.salaryMin).toBe('')
    expect(form.salaryMax).toBe('')
    expect(form.salaryCurrency).toBe('USD')
    expect(form.skills).toBe('')
    expect(form.postedAt).toBe('')
  })

  it('buildJobPayload converts form skills list to an array and trims strings', () => {
    const payload = buildJobPayload({
      ...emptyJobForm(),
      title: '  Backend Developer ',
      company: ' VNG ',
      skills: ' Node.js , MongoDB, ',
    })
    expect(payload.title).toBe('Backend Developer')
    expect(payload.company).toBe('VNG')
    expect(payload.skills).toEqual(['Node.js', 'MongoDB'])
  })

  it('buildJobPayload transforms salary into a nested object', () => {
    const payload = buildJobPayload({
      ...emptyJobForm(),
      salaryMin: '1500',
      salaryMax: '2500',
      salaryCurrency: 'USD',
      salaryPeriod: 'monthly',
    })
    expect(payload.salary).toEqual({ min: 1500, max: 2500, currency: 'USD', period: 'monthly' })
  })

  it('buildJobPayload omits empty salary numbers/period but keeps the default currency', () => {
    const payload = buildJobPayload(emptyJobForm())
    expect(payload.salary).toEqual({ currency: 'USD' })
  })

  it('buildJobPayload always includes free-text optional fields as empty strings so they can be cleared', () => {
    const payload = buildJobPayload(emptyJobForm())
    expect(payload.description).toBe('')
    expect(payload.notes).toBe('')
    expect(payload.location).toBe('')
  })

  it('buildJobPayload omits undefined enum fields', () => {
    const payload = buildJobPayload(emptyJobForm())
    expect(payload.employmentType).toBeUndefined()
    expect(payload.workplaceType).toBeUndefined()
    expect(payload.postedAt).toBeUndefined()
  })
})
