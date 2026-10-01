import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useResume } from './useResume.js'
import * as resumeApi from '../api/resume.api.js'
import * as profileApi from '../api/profile.api.js'

vi.mock('../api/resume.api.js')
vi.mock('../api/profile.api.js')

describe('useResume', () => {
  const mockResumeData = {
    title: 'Senior Developer',
    summary: 'Building awesome apps',
    skills: ['React', 'TypeScript'],
    languages: ['English'],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    importStatus: 'none',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads resume on mount', async () => {
    resumeApi.getResumeApi.mockResolvedValueOnce({
      data: { resume: mockResumeData },
    })

    const { result } = renderHook(() => useResume())
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.resume).toEqual(mockResumeData)
    expect(result.current.manualForm.title).toBe('Senior Developer')
  })

  it('handles 404 cleanly by setting empty resume defaults', async () => {
    resumeApi.getResumeApi.mockRejectedValueOnce({ status: 404, message: 'Not found' })

    const { result } = renderHook(() => useResume())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.resume).toBeNull()
    expect(result.current.manualForm.title).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('updates form fields and list items', async () => {
    resumeApi.getResumeApi.mockResolvedValueOnce({
      data: { resume: mockResumeData },
    })

    const { result } = renderHook(() => useResume())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.updateManualField({ target: { name: 'title', value: 'Lead Architect' } })
    })
    expect(result.current.manualForm.title).toBe('Lead Architect')

    act(() => {
      result.current.addManualListItem('experience', { company: 'Acme', position: 'Lead' })
    })
    expect(result.current.manualForm.experience).toHaveLength(1)

    act(() => {
      result.current.updateManualListItem('experience', 0, { position: 'Principal' })
    })
    expect(result.current.manualForm.experience[0].position).toBe('Principal')

    act(() => {
      result.current.removeManualListItem('experience', 0)
    })
    expect(result.current.manualForm.experience).toHaveLength(0)
  })

  it('syncs data from profile', async () => {
    resumeApi.getResumeApi.mockResolvedValueOnce({
      data: { resume: null },
    })
    profileApi.getProfileApi.mockResolvedValueOnce({
      data: {
        profile: {
          skills: ['Python', 'FastAPI'],
          experience: [{ company: 'DataCorp', position: 'Engineer' }],
          education: [],
        },
      },
    })

    const { result } = renderHook(() => useResume())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleSyncFromProfile(true)
    })

    expect(result.current.manualForm.skills).toContain('Python')
    expect(result.current.manualForm.experience).toHaveLength(1)
    expect(result.current.manualForm.experience[0].company).toBe('DataCorp')
  })
})
