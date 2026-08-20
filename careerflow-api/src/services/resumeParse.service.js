import Resume from '../models/resume.model.js'
import ApiError from '../utils/ApiError.js'
import { extractResumeText } from './resumeExtraction.service.js'
import { buildResumeParsePrompt, RESPONSE_SCHEMA } from './prompts/resume.prompt.js'
import { generateResumeParseJSON } from './ai.service.js'
import { downloadResumeFile } from './storage.service.js'
import { resumeParseSchema } from '../validators/resume.validator.js'

const MAX_STRING_LENGTH = 3000
const MAX_ARRAY_ITEMS = 50
const MAX_SKILL_LENGTH = 100
const MAX_URL_LENGTH = 500

const pad = (value) => String(value).padStart(2, '0')

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const cleanString = (value, max = MAX_STRING_LENGTH) => {
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string') return value
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned) return undefined
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned
}

const cleanArray = (value, itemMax = MAX_SKILL_LENGTH) => {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) return value
  const seen = new Set()
  const result = []
  for (const item of value) {
    const cleaned = cleanString(item, itemMax)
    if (cleaned === undefined) continue
    const key = String(cleaned).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
  }
  return result.slice(0, MAX_ARRAY_ITEMS)
}

const cleanBoolean = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'false') return false
  return undefined
}

const parsePartialDate = (value) => {
  if (value === null || value === undefined || value === '') return undefined
  const str = String(value).trim()
  if (!str) return undefined

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`

  m = str.match(/^(\d{4})-(\d{1,2})$/)
  if (m) return `${m[1]}-${pad(m[2])}-01`

  m = str.match(/^(\d{4})$/)
  if (m) return `${m[1]}-01-01`

  m = str.match(/^(\d{4})\s*[-–—]\s*(\d{4})$/)
  if (m) return `${m[1]}-01-01`

  m = str.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (m) {
    const month = MONTHS[m[1].toLowerCase().slice(0, 3)]
    if (month) return `${m[2]}-${pad(month)}-01`
  }

  m = str.match(/^(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[2]}-${pad(m[1])}-01`

  const parsed = new Date(str)
  if (!Number.isNaN(parsed.getTime()) && str.includes('-')) {
    return parsed.toISOString().slice(0, 10)
  }
  return undefined
}

const cleanUrl = (value) => {
  const cleaned = cleanString(value, MAX_URL_LENGTH)
  if (cleaned === undefined) return undefined
  if (cleaned === '') return ''
  if (/^https?:\/\/.+/i.test(cleaned)) return cleaned
  return ''
}

const cleanExperience = (item) => {
  if (!item || typeof item !== 'object') return item
  const cleaned = {
    company: cleanString(item.company, 200),
    position: cleanString(item.position, 200),
    description: cleanString(item.description, 2000),
    startDate: parsePartialDate(item.startDate),
    endDate: parsePartialDate(item.endDate),
    current: cleanBoolean(item.current),
  }
  if (cleaned.current === true) delete cleaned.endDate
  if (!cleaned.company && !cleaned.position && !cleaned.description) return undefined
  return cleaned
}

const cleanEducation = (item) => {
  if (!item || typeof item !== 'object') return item
  const cleaned = {
    school: cleanString(item.school, 200),
    degree: cleanString(item.degree, 200),
    fieldOfStudy: cleanString(item.fieldOfStudy, 200),
    startDate: parsePartialDate(item.startDate),
    endDate: parsePartialDate(item.endDate),
  }
  if (!cleaned.school && !cleaned.degree && !cleaned.fieldOfStudy) return undefined
  return cleaned
}

const cleanProject = (item) => {
  if (!item || typeof item !== 'object') return item
  const cleaned = {
    name: cleanString(item.name, 200),
    description: cleanString(item.description, 2000),
    url: cleanUrl(item.url),
    techStack: cleanArray(item.techStack, MAX_SKILL_LENGTH),
  }
  if (!cleaned.name && !cleaned.description) return undefined
  return cleaned
}

const cleanCertification = (item) => {
  if (!item || typeof item !== 'object') return item
  const cleaned = {
    name: cleanString(item.name, 200),
    issuer: cleanString(item.issuer, 200),
    issueDate: parsePartialDate(item.issueDate),
    expiryDate: parsePartialDate(item.expiryDate),
    url: cleanUrl(item.url),
  }
  if (!cleaned.name && !cleaned.issuer) return undefined
  return cleaned
}

const cleanList = (value, cleaner) => {
  if (value === null || value === undefined) return []
  if (!Array.isArray(value)) return value
  const result = []
  for (const item of value) {
    const cleaned = cleaner(item)
    if (cleaned === undefined) continue
    result.push(cleaned)
  }
  return result.slice(0, MAX_ARRAY_ITEMS)
}

const cleanProfile = (profile) => {
  if (profile === null || profile === undefined) return undefined
  if (typeof profile !== 'object') return profile
  const cleaned = {
    fullName: cleanString(profile.fullName, 100),
    phone: cleanString(profile.phone, 30),
    location: cleanString(profile.location, 200),
    headline: cleanString(profile.headline, 200),
  }

  const years = profile.yearsOfExperience
  if (years !== null && years !== undefined && years !== '') {
    if (typeof years === 'number' && Number.isFinite(years)) {
      cleaned.yearsOfExperience = Math.max(0, Math.round(years))
    } else if (typeof years === 'string') {
      const match = String(years).match(/(\d+(?:\.\d+)?)/)
      if (match) cleaned.yearsOfExperience = Math.max(0, Math.round(Number(match[1])))
    }
  }

  if (!cleaned.fullName && !cleaned.phone && !cleaned.location && !cleaned.headline &&
      cleaned.yearsOfExperience === undefined) {
    return undefined
  }
  return cleaned
}

// Normalizes raw AI output into a shape the Zod schema can validate.
// Structural type errors (e.g. skills being a string) are intentionally NOT
// repaired so they are rejected with a 502 instead of silently persisted.
const normalizeResume = (raw) => {
  const data = raw && typeof raw === 'object' ? raw : {}
  return {
    title: cleanString(data.title, 200),
    summary: cleanString(data.summary),
    skills: cleanArray(data.skills),
    languages: cleanArray(data.languages),
    experience: cleanList(data.experience, cleanExperience),
    education: cleanList(data.education, cleanEducation),
    projects: cleanList(data.projects, cleanProject),
    certifications: cleanList(data.certifications, cleanCertification),
    careerDirections: cleanArray(data.careerDirections, 200),
    profile: cleanProfile(data.profile),
  }
}

// Validates normalized AI output. Throws 502 when the AI response cannot be
// turned into a valid Resume draft. Invalid AI output is never persisted.
const validateResumeDraft = (normalized) => {
  const parsed = resumeParseSchema.safeParse(normalized)
  if (!parsed.success) {
    throw new ApiError(502, 'AI returned an invalid response')
  }
  return parsed.data
}

const parseResume = async (userId) => {
  const resume = await Resume.findOne({ user: userId })
  if (!resume) {
    throw new ApiError(404, 'Resume not found')
  }
  if (!resume.originalFile || !resume.originalFile.fileUrl) {
    throw new ApiError(400, 'No CV file uploaded yet')
  }

  const buffer = await downloadResumeFile(resume.originalFile.fileUrl, resume.originalFile.publicId)
  const text = await extractResumeText(buffer, resume.originalFile.mimeType)

  const prompt = buildResumeParsePrompt(text)
  const rawResult = await generateResumeParseJSON(prompt, RESPONSE_SCHEMA)

  const draft = validateResumeDraft(normalizeResume(rawResult))

  resume.draft = draft
  resume.importStatus = 'draft'
  try {
    await resume.save()
  } catch {
    throw new ApiError(500, 'Failed to save resume draft')
  }

  return { resume, draft: resume.draft }
}

export { parseResume, normalizeResume, validateResumeDraft }