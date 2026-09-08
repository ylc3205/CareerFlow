import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import JobFitAnalysis from './JobFitAnalysis.jsx'

const baseMatch = {
  matchScore: 87,
  matchedSkills: ['Node.js', 'MongoDB'],
  missingSkills: ['Kubernetes'],
  strengths: ['Strong backend fundamentals'],
  weaknesses: ['No cloud experience'],
  recommendations: ['Learn Docker and Kubernetes'],
  careerDirectionTitle: null,
}

const renderAnalysis = (props = {}) => {
  const onAnalyze = vi.fn()
  render(
    <MemoryRouter>
      <JobFitAnalysis analysis={null} analyzing={false} error={null} onAnalyze={onAnalyze} {...props} />
    </MemoryRouter>
  )
  return { onAnalyze }
}

const renderResult = (analysis, props = {}) => {
  const onAnalyze = vi.fn()
  render(
    <MemoryRouter>
      <JobFitAnalysis analysis={analysis} analyzing={false} error={null} onAnalyze={onAnalyze} {...props} />
    </MemoryRouter>
  )
  return { onAnalyze }
}

describe('JobFitAnalysis', () => {
  it('renders an empty state with an Analyze Fit button when there is no analysis', async () => {
    const { onAnalyze } = renderAnalysis()
    const user = userEvent.setup()
    expect(screen.getByText('Job Fit Analysis')).toBeInTheDocument()
    expect(screen.getByText(/Run a Job Fit Analysis/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Analyze Fit' }))
    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('shows an analyzing loading state', () => {
    renderAnalysis({ analyzing: true })
    expect(screen.getByText('Analyzing job fit…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Analyze Fit' })).not.toBeInTheDocument()
  })

  it('shows a generic error with a Try again button', async () => {
    const { onAnalyze } = renderAnalysis({ error: { message: 'AI failed' } })
    const user = userEvent.setup()
    expect(screen.getByText('AI failed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('shows the missing profile/resume state with navigation links', async () => {
    renderAnalysis({
      error: { message: 'Please create a profile or resume to use AI matching', missingProfileResume: true },
    })
    expect(screen.getByText(/Create your profile or upload a resume/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('link', { name: 'Go to Resume' })).toHaveAttribute('href', '/resume')
  })

  it('renders a match result with score, skills, strengths, weaknesses, recommendations', () => {
    renderResult(baseMatch)
    expect(screen.getByLabelText('Score 87 out of 100')).toBeInTheDocument()
    expect(screen.getByText('Matched Skills')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('Missing Skills')).toBeInTheDocument()
    expect(screen.getByText('Kubernetes')).toBeInTheDocument()
    expect(screen.getByText('Strengths')).toBeInTheDocument()
    expect(screen.getByText('Strong backend fundamentals')).toBeInTheDocument()
    expect(screen.getByText('Weaknesses')).toBeInTheDocument()
    expect(screen.getByText('No cloud experience')).toBeInTheDocument()
    expect(screen.getByText('Recommendations')).toBeInTheDocument()
    expect(screen.getByText('Learn Docker and Kubernetes')).toBeInTheDocument()
  })

  it('shows the General lens label when no career direction was used', () => {
    renderResult(baseMatch)
    expect(screen.getByText('Analyzed using: General / Base Resume')).toBeInTheDocument()
  })

  it('shows the career direction lens label when a direction was used', () => {
    renderResult({ ...baseMatch, careerDirectionTitle: 'Backend Developer' })
    expect(screen.getByText('Analyzed using: Backend Developer')).toBeInTheDocument()
  })

  it('shows None for empty matched/missing skills', () => {
    renderResult({ ...baseMatch, matchedSkills: [], missingSkills: [] })
    expect(screen.getAllByText('None').length).toBeGreaterThanOrEqual(2)
  })

  it('re-analyzes via the Re-analyze Fit button when a result is shown', async () => {
    const { onAnalyze } = renderResult(baseMatch)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Re-analyze Fit' }))
    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })
})
