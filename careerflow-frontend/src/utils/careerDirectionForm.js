export const emptyCareerDirectionForm = {
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
}

export const hydrateCareerDirectionForm = (dir = {}) => ({
  title: dir.title || '',
  description: dir.description || '',
  focusSkills: Array.isArray(dir.focusSkills) ? dir.focusSkills : [],
  targetRoles: Array.isArray(dir.targetRoles) ? dir.targetRoles : [],
  baseType: dir.baseType || 'resume',
  careerLevel: dir.careerLevel || 'unspecified',
  primaryFocus: Array.isArray(dir.primaryFocus) ? dir.primaryFocus : [],
  secondaryFocus: Array.isArray(dir.secondaryFocus) ? dir.secondaryFocus : [],
  learningPriorities: Array.isArray(dir.learningPriorities) ? dir.learningPriorities : [],
  rationale: dir.rationale || '',
  suggestedNextSteps: Array.isArray(dir.suggestedNextSteps) ? dir.suggestedNextSteps : [],
})
