import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileRow from './FileRow.jsx'
import SuccessBanner from './SuccessBanner.jsx'
import ResumeFormCards from './ResumeFormCards.jsx'
import ResumeUploadTab from './ResumeUploadTab.jsx'

describe('Resume Modular Components', () => {
  describe('FileRow', () => {
    it('renders file title, name, and size', () => {
      render(<FileRow title="Uploaded CV" name="resume_2026.pdf" size="1.2 MB" />)
      expect(screen.getByText('Uploaded CV')).toBeInTheDocument()
      expect(screen.getByText('resume_2026.pdf')).toBeInTheDocument()
      expect(screen.getByText('1.2 MB')).toBeInTheDocument()
    })
  })

  describe('SuccessBanner', () => {
    it('renders message with role status and supports dismiss', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      render(<SuccessBanner onDismiss={onDismiss}>Resume saved!</SuccessBanner>)

      const banner = screen.getByRole('status')
      expect(banner).toHaveTextContent('Resume saved!')

      const dismissBtn = screen.getByRole('button', { name: /Dismiss banner/i })
      await user.click(dismissBtn)
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('ResumeFormCards', () => {
    it('renders input fields with provided idPrefix and updates on change', async () => {
      const user = userEvent.setup()
      const onChangeField = vi.fn()
      const form = {
        title: 'Tech Lead',
        summary: 'Experienced developer',
        skills: 'React, Node',
        languages: 'English',
        experience: [],
        education: [],
        projects: [],
        certifications: [],
      }

      render(
        <ResumeFormCards
          form={form}
          onChangeField={onChangeField}
          idPrefix="test"
        />
      )

      const titleInput = screen.getByLabelText('Title')
      expect(titleInput).toHaveAttribute('id', 'test-title')
      expect(titleInput).toHaveValue('Tech Lead')

      await user.type(titleInput, 'x')
      expect(onChangeField).toHaveBeenCalled()
    })
  })

  describe('ResumeUploadTab', () => {
    it('renders dropzone in upload mode', () => {
      render(
        <ResumeUploadTab
          uploadViewMode="upload"
          selectedFile={null}
        />
      )
      expect(screen.getByText(/Drop your CV here/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Browse files/i })).toBeInTheDocument()
    })

    it('renders uploaded state with Parse button', async () => {
      const user = userEvent.setup()
      const onParse = vi.fn()
      render(
        <ResumeUploadTab
          uploadViewMode="uploaded"
          onParse={onParse}
        />
      )
      const parseBtn = screen.getByRole('button', { name: /Parse CV with AI/i })
      expect(parseBtn).toBeInTheDocument()
      await user.click(parseBtn)
      expect(onParse).toHaveBeenCalledTimes(1)
    })
  })
})
