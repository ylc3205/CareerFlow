import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ResumePage from './ResumePage.jsx'
import * as resumeApi from '../api/resume.api.js'

vi.mock('../api/resume.api.js')
vi.mock('../api/profile.api.js', () => ({
  getProfileApi: vi.fn().mockResolvedValue({
    data: {
      profile: {
        skills: ['React', 'Node.js'],
        experience: [],
        education: [],
      },
    },
  }),
}))

const sampleResume = {
  title: 'Full Stack Engineer',
  summary: 'Experienced web developer',
  skills: ['JavaScript', 'React', 'Node.js'],
  languages: ['English'],
  experience: [
    {
      _id: 'exp_1',
      company: 'TechCorp',
      position: 'Senior Engineer',
      description: 'Building apps',
      startDate: '2022-01-01',
      endDate: '2024-01-01',
      current: false,
    },
  ],
  education: [],
  projects: [],
  certifications: [],
  importStatus: 'confirmed',
}

const sampleDraftResume = {
  title: 'Full Stack Engineer',
  summary: 'Experienced web developer',
  skills: ['JavaScript', 'React'],
  languages: ['English'],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  importStatus: 'draft',
  draft: {
    title: 'Extracted Engineer',
    summary: 'AI extracted summary',
    skills: ['Python', 'Django'],
    languages: ['English', 'Spanish'],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  },
}

describe('ResumePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders unique manual IDs and matching label htmlFor attributes', async () => {
    resumeApi.getResumeApi.mockResolvedValueOnce({
      data: { resume: sampleResume },
    })

    render(
      <MemoryRouter>
        <ResumePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveAttribute('id', 'manual-title')
      expect(screen.getByLabelText('Summary')).toHaveAttribute('id', 'manual-summary')
      expect(screen.getByLabelText('Skills')).toHaveAttribute('id', 'manual-skills')
      expect(screen.getByLabelText('Languages')).toHaveAttribute('id', 'manual-languages')
    })
  })

  it('renders unique draft IDs when in draft review mode', async () => {
    const user = userEvent.setup()
    resumeApi.getResumeApi.mockResolvedValueOnce({
      data: { resume: sampleDraftResume },
    })

    render(
      <MemoryRouter>
        <ResumePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Upload CV/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /Upload CV/i }))

    expect(await screen.findByText('AI-generated draft')).toBeInTheDocument()

    const titleInput = screen.getByDisplayValue('Extracted Engineer')
    expect(titleInput).toHaveAttribute('id', 'draft-title')

    const summaryInput = screen.getByDisplayValue('AI extracted summary')
    expect(summaryInput).toHaveAttribute('id', 'draft-summary')
  })

  it('deletes resume via ConfirmDialog', async () => {
    const user = userEvent.setup()
    resumeApi.getResumeApi.mockResolvedValueOnce({
      data: { resume: sampleResume },
    })
    resumeApi.deleteResumeApi.mockResolvedValueOnce({ status: 200 })

    render(
      <MemoryRouter>
        <ResumePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Full Stack Engineer')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByRole('button', { name: /Delete Resume/i })
    await user.click(deleteBtn)

    const dialog = screen.getByRole('dialog', { name: 'Delete your resume?' })
    expect(dialog).toBeInTheDocument()

    const dialogConfirmBtn = dialog.querySelector('button.bg-destructive, button:last-child')
    await user.click(dialogConfirmBtn)

    await waitFor(() => {
      expect(resumeApi.deleteResumeApi).toHaveBeenCalled()
    })
  })

  it('discards draft via ConfirmDialog', async () => {
    const user = userEvent.setup()
    resumeApi.getResumeApi.mockResolvedValueOnce({
      data: { resume: sampleDraftResume },
    })
    resumeApi.discardResumeApi.mockResolvedValueOnce({
      data: { resume: { ...sampleDraftResume, importStatus: 'none', draft: null } },
    })

    render(
      <MemoryRouter>
        <ResumePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Upload CV/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: /Upload CV/i }))

    expect(await screen.findByText('AI-generated draft')).toBeInTheDocument()

    const discardBtn = screen.getByRole('button', { name: /Discard Draft/i })
    await user.click(discardBtn)

    const dialog = screen.getByRole('dialog', { name: 'Discard AI draft?' })
    expect(dialog).toBeInTheDocument()

    const dialogConfirmBtn = dialog.querySelector('button.bg-destructive, button:last-child')
    await user.click(dialogConfirmBtn)

    await waitFor(() => {
      expect(resumeApi.discardResumeApi).toHaveBeenCalled()
    })
  })
})
