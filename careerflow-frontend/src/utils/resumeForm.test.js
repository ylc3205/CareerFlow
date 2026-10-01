import { describe, it, expect } from 'vitest'
import {
  emptyResume,
  hydrateResume,
  hydrateExperience,
  hydrateEducation,
  hydrateProject,
  hydrateCertification,
  cleanExperience,
  cleanEducation,
  cleanProject,
  cleanCertification,
  buildPayload,
  formatFileSize,
  isAllowedFile,
} from './resumeForm.js'

describe('resumeForm utilities', () => {
  it('emptyResume returns expected empty structure', () => {
    const r = emptyResume()
    expect(r.title).toBe('')
    expect(r.summary).toBe('')
    expect(r.skills).toBe('')
    expect(r.languages).toBe('')
    expect(r.experience).toEqual([])
    expect(r.education).toEqual([])
    expect(r.projects).toEqual([])
    expect(r.certifications).toEqual([])
  })

  it('hydrateResume converts array skills/languages and nested items', () => {
    const raw = {
      title: 'Senior Engineer',
      summary: 'Experienced developer',
      skills: ['React', 'Node.js'],
      languages: ['English', 'Vietnamese'],
      experience: [
        {
          _id: 'exp_1',
          company: 'TechCorp',
          position: 'Lead',
          description: 'Architecture',
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: '2024-01-01T00:00:00.000Z',
          current: false,
        },
      ],
      education: [],
      projects: [],
      certifications: [],
    }

    const hydrated = hydrateResume(raw)
    expect(hydrated.title).toBe('Senior Engineer')
    expect(hydrated.skills).toBe('React, Node.js')
    expect(hydrated.languages).toBe('English, Vietnamese')
    expect(hydrated.experience[0].company).toBe('TechCorp')
    expect(hydrated.experience[0].startDate).toBe('2023-01-01')
    expect(hydrated.experience[0]._cid).toBe('exp_1')
  })

  it('hydrateResume gracefully handles null or undefined', () => {
    expect(hydrateResume(null)).toEqual(emptyResume())
  })

  it('individual hydrators and cleaners sanitize fields accurately', () => {
    const exp = hydrateExperience({ company: 'Acme', position: 'Dev', current: 1 })
    expect(exp.current).toBe(true)
    expect(cleanExperience(exp)).toEqual({ company: 'Acme', position: 'Dev', current: true })

    const edu = hydrateEducation({ school: 'Uni', degree: 'BS' })
    expect(cleanEducation(edu)).toEqual({ school: 'Uni', degree: 'BS' })

    const proj = hydrateProject({ name: 'Web', techStack: ['React'] })
    expect(cleanProject(proj)).toEqual({ name: 'Web', techStack: ['React'] })

    const cert = hydrateCertification({ name: 'AWS', issuer: 'Amazon' })
    expect(cleanCertification(cert)).toEqual({ name: 'AWS', issuer: 'Amazon' })
  })

  it('buildPayload trims and normalizes form state', () => {
    const form = {
      title: '   Full Stack Developer   ',
      summary: '  Builds scalable systems  ',
      skills: 'React, Node.js, Python',
      languages: 'English, Vietnamese',
      experience: [
        {
          company: ' TechCorp ',
          position: ' Engineer ',
          description: ' Working ',
          startDate: '2022-01-01',
          endDate: '',
          current: true,
        },
      ],
      education: [],
      projects: [],
      certifications: [],
    }

    const payload = buildPayload(form)
    expect(payload.title).toBe('Full Stack Developer')
    expect(payload.summary).toBe('Builds scalable systems')
    expect(payload.skills).toEqual(['React', 'Node.js', 'Python'])
    expect(payload.languages).toEqual(['English', 'Vietnamese'])
    expect(payload.experience[0].company).toBe('TechCorp')
    expect(payload.experience[0].current).toBe(true)
    expect(payload.experience[0].endDate).toBeUndefined()
  })

  it('formatFileSize formats byte sizes accurately', () => {
    expect(formatFileSize(0)).toBe('')
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })

  it('isAllowedFile checks pdf and docx file types and extensions', () => {
    expect(isAllowedFile(null)).toBe(false)
    expect(isAllowedFile({ name: 'resume.pdf', type: 'application/pdf' })).toBe(true)
    expect(isAllowedFile({ name: 'cv.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe(true)
    expect(isAllowedFile({ name: 'photo.png', type: 'image/png' })).toBe(false)
  })
})
