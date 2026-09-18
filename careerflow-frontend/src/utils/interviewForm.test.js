import { describe, it, expect } from 'vitest'
import {
  emptyInterviewForm,
  hydrateInterviewForm,
  buildInterviewPayload,
} from './interviewForm.js'

describe('interviewForm utils', () => {
  it('emptyInterviewForm returns initial defaults', () => {
    const empty = emptyInterviewForm()
    expect(empty).toEqual({
      title: '',
      type: 'video',
      scheduledDate: '',
      status: 'scheduled',
      interviewerNames: '',
      meetingLink: '',
      location: '',
      notes: '',
      feedback: '',
    })
  })

  it('hydrateInterviewForm correctly maps fields and converts date', () => {
    const raw = {
      _id: 'int_1',
      title: 'Final Round Interview',
      type: 'onsite',
      scheduledDate: '2026-09-22T09:00:00.000Z',
      status: 'completed',
      interviewerNames: 'Jane Doe (VP)',
      meetingLink: 'https://maps.google.com/?q=HQ',
      location: 'Floor 12, Meeting Room 4',
      notes: 'Prepare presentation deck',
      feedback: 'Excellent presentation',
    }

    const hydrated = hydrateInterviewForm(raw)
    expect(hydrated).toEqual({
      title: 'Final Round Interview',
      type: 'onsite',
      scheduledDate: '2026-09-22',
      status: 'completed',
      interviewerNames: 'Jane Doe (VP)',
      meetingLink: 'https://maps.google.com/?q=HQ',
      location: 'Floor 12, Meeting Room 4',
      notes: 'Prepare presentation deck',
      feedback: 'Excellent presentation',
    })
  })

  it('hydrateInterviewForm provides fallback defaults when fields are missing', () => {
    const raw = { _id: 'int_2' }
    const hydrated = hydrateInterviewForm(raw)
    expect(hydrated).toEqual({
      title: '',
      type: 'video',
      scheduledDate: '',
      status: 'scheduled',
      interviewerNames: '',
      meetingLink: '',
      location: '',
      notes: '',
      feedback: '',
    })
  })

  it('buildInterviewPayload compacts values and handles optional applicationId', () => {
    const form = {
      title: '  Phone Screen  ',
      type: 'phone',
      scheduledDate: '2026-09-25',
      status: 'scheduled',
      interviewerNames: '  Recruiter John  ',
      meetingLink: '',
      location: 'Phone Call',
      notes: 'Initial discussion',
      feedback: '',
    }

    const payload = buildInterviewPayload(form, {
      includeApplicationId: true,
      applicationId: 'app_999',
    })

    expect(payload).toEqual({
      title: 'Phone Screen',
      type: 'phone',
      scheduledDate: '2026-09-25',
      status: 'scheduled',
      interviewerNames: 'Recruiter John',
      meetingLink: '',
      location: 'Phone Call',
      notes: 'Initial discussion',
      feedback: '',
      application: 'app_999',
    })
  })

  it('buildInterviewPayload ignores applicationId when includeApplicationId is false', () => {
    const form = {
      title: 'Update Notes Only',
      type: 'video',
      scheduledDate: '2026-09-26',
      status: 'scheduled',
      interviewerNames: '',
      meetingLink: '',
      location: '',
      notes: 'Updated notes',
      feedback: '',
    }

    const payload = buildInterviewPayload(form, {
      includeApplicationId: false,
      applicationId: 'app_999',
    })

    expect(payload).not.toHaveProperty('application')
    expect(payload.title).toBe('Update Notes Only')
  })
})
