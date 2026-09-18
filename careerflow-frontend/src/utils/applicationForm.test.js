import { describe, it, expect } from 'vitest'
import {
  emptyApplicationForm,
  hydrateApplicationForm,
  buildApplicationPayload,
} from './applicationForm.js'

describe('applicationForm utils', () => {
  it('emptyApplicationForm returns initial defaults', () => {
    const empty = emptyApplicationForm()
    expect(empty).toEqual({
      status: 'applied',
      appliedAt: '',
      coverLetter: '',
      notes: '',
    })
  })

  it('hydrateApplicationForm correctly hydrates from raw application model', () => {
    const raw = {
      _id: 'app_1',
      status: 'interviewing',
      appliedAt: '2026-09-10T14:30:00.000Z',
      coverLetter: 'Dear Hiring Manager...',
      notes: 'Passed initial screening',
    }

    const hydrated = hydrateApplicationForm(raw)
    expect(hydrated).toEqual({
      status: 'interviewing',
      appliedAt: '2026-09-10',
      coverLetter: 'Dear Hiring Manager...',
      notes: 'Passed initial screening',
    })
  })

  it('hydrateApplicationForm provides safe defaults when fields are missing or null', () => {
    const raw = { _id: 'app_2' }
    const hydrated = hydrateApplicationForm(raw)
    expect(hydrated).toEqual({
      status: 'applied',
      appliedAt: '',
      coverLetter: '',
      notes: '',
    })
  })

  it('buildApplicationPayload constructs cleaned payload with appliedAt', () => {
    const form = {
      status: 'offered',
      appliedAt: '2026-09-01',
      coverLetter: '  Cover letter text  ',
      notes: '  Offer received  ',
    }

    const payload = buildApplicationPayload(form)
    expect(payload).toEqual({
      status: 'offered',
      appliedAt: '2026-09-01',
      coverLetter: 'Cover letter text',
      notes: 'Offer received',
    })
  })

  it('buildApplicationPayload omits appliedAt when empty and retains cleared strings', () => {
    const form = {
      status: 'rejected',
      appliedAt: '',
      coverLetter: '',
      notes: '   ',
    }

    const payload = buildApplicationPayload(form)
    expect(payload).toEqual({
      status: 'rejected',
      coverLetter: '',
      notes: '',
    })
    expect(payload).not.toHaveProperty('appliedAt')
  })
})
