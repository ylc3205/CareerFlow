import { describe, it, expect } from 'vitest'
import { emptyCareerDirectionForm, hydrateCareerDirectionForm } from './careerDirectionForm.js'

describe('careerDirectionForm utils', () => {
  it('provides empty form defaults', () => {
    expect(emptyCareerDirectionForm).toEqual({
      title: '',
      description: '',
      focusSkills: [],
      targetRoles: [],
      baseType: 'resume',
      careerLevel: 'unspecified',
      primaryFocus: [],
      secondaryFocus: [],
      learningPriorities: [],
      rationale: '',
      suggestedNextSteps: [],
    })
  })

  it('hydrates form with partial or complete direction data safely', () => {
    const hydratedEmpty = hydrateCareerDirectionForm({})
    expect(hydratedEmpty.title).toBe('')
    expect(hydratedEmpty.baseType).toBe('resume')
    expect(hydratedEmpty.focusSkills).toEqual([])

    const source = {
      title: 'Fullstack Architect',
      description: 'Senior leadership',
      focusSkills: ['React', 'Node.js'],
      targetRoles: ['Staff Engineer'],
      baseType: 'profile',
      careerLevel: 'lead',
      primaryFocus: ['Architecture'],
      secondaryFocus: ['Mentorship'],
      learningPriorities: ['Rust'],
      rationale: 'Solid baseline',
      suggestedNextSteps: ['Prepare talk'],
    }
    const hydrated = hydrateCareerDirectionForm(source)
    expect(hydrated).toEqual(source)
  })
})
