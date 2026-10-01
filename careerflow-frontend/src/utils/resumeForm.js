import { toDateInputValue, splitList, joinList, compact, newItemId } from './format.js'

export const emptyResume = () => ({
  title: '',
  summary: '',
  skills: '',
  languages: '',
  experience: [],
  education: [],
  projects: [],
  certifications: [],
})

export const hydrateExperience = (item = {}) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  company: item.company ?? '',
  position: item.position ?? '',
  description: item.description ?? '',
  startDate: toDateInputValue(item.startDate),
  endDate: toDateInputValue(item.endDate),
  current: Boolean(item.current),
})

export const hydrateEducation = (item = {}) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  school: item.school ?? '',
  degree: item.degree ?? '',
  fieldOfStudy: item.fieldOfStudy ?? '',
  startDate: toDateInputValue(item.startDate),
  endDate: toDateInputValue(item.endDate),
})

export const hydrateProject = (item = {}) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  name: item.name ?? '',
  description: item.description ?? '',
  url: item.url ?? '',
  techStack: joinList(item.techStack),
})

export const hydrateCertification = (item = {}) => ({
  _cid: item._cid ?? item._id ?? newItemId(),
  name: item.name ?? '',
  issuer: item.issuer ?? '',
  issueDate: toDateInputValue(item.issueDate),
  expiryDate: toDateInputValue(item.expiryDate),
  url: item.url ?? '',
})

export const hydrateResume = (r) => {
  if (!r) return emptyResume()
  return {
    title: r.title ?? '',
    summary: r.summary ?? '',
    skills: joinList(r.skills),
    languages: joinList(r.languages),
    experience: (r.experience || []).map(hydrateExperience),
    education: (r.education || []).map(hydrateEducation),
    projects: (r.projects || []).map(hydrateProject),
    certifications: (r.certifications || []).map(hydrateCertification),
  }
}

export const cleanExperience = (item = {}) =>
  compact({
    company: (item.company ?? '').trim() || undefined,
    position: (item.position ?? '').trim() || undefined,
    description: (item.description ?? '').trim() || undefined,
    startDate: item.startDate || undefined,
    endDate: item.current ? undefined : item.endDate || undefined,
    current: item.current || undefined,
  })

export const cleanEducation = (item = {}) =>
  compact({
    school: (item.school ?? '').trim() || undefined,
    degree: (item.degree ?? '').trim() || undefined,
    fieldOfStudy: (item.fieldOfStudy ?? '').trim() || undefined,
    startDate: item.startDate || undefined,
    endDate: item.endDate || undefined,
  })

export const cleanProject = (item = {}) =>
  compact({
    name: (item.name ?? '').trim() || undefined,
    description: (item.description ?? '').trim() || undefined,
    url: (item.url ?? '').trim() || undefined,
    techStack: splitList(item.techStack),
  })

export const cleanCertification = (item = {}) =>
  compact({
    name: (item.name ?? '').trim() || undefined,
    issuer: (item.issuer ?? '').trim() || undefined,
    issueDate: item.issueDate || undefined,
    expiryDate: item.expiryDate || undefined,
    url: (item.url ?? '').trim() || undefined,
  })

export const buildPayload = (form) => {
  if (!form) return {}
  return compact({
    title: (form.title || '').trim() || undefined,
    summary: (form.summary || '').trim() || undefined,
    skills: splitList(form.skills),
    languages: splitList(form.languages),
    experience: (form.experience || []).map(cleanExperience),
    education: (form.education || []).map(cleanEducation),
    projects: (form.projects || []).map(cleanProject),
    certifications: (form.certifications || []).map(cleanCertification),
  })
}

export const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const isAllowedFile = (file) => {
  if (!file) return false
  const ext = file.name ? file.name.toLowerCase().split('.').pop() : ''
  const allowedExt = ['pdf', 'docx']
  if (allowedExt.includes(ext)) return true
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  return allowedTypes.includes(file.type)
}
