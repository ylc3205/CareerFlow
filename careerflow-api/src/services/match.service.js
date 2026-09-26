import mongoose from 'mongoose'
import Job from '../models/job.model.js'
import Profile from '../models/profile.model.js'
import Resume from '../models/resume.model.js'
import CareerDirection from '../models/careerDirection.model.js'
import AIAnalysis from '../models/aiAnalysis.model.js'
import ApiError from '../utils/ApiError.js'
import { buildJobMatchPrompt, RESPONSE_SCHEMA } from './prompts/match.prompt.js'
import { generateStructuredJSON } from './ai.service.js'

export const SCORING_WEIGHTS = {
  SKILLS: 0.40,
  EXPERIENCE: 0.40,
  BACKGROUND: 0.20,
}

const validateObjectId = (id, label = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`)
  }
}

const truncate = (value, max) => {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  return str.length > max ? `${str.slice(0, max)}\u2026` : str
}

export const buildJobPayload = (job) => ({
  title: job.title,
  company: job.company,
  description: truncate(job.description, 3000),
  requirements: truncate(job.requirements, 1500),
  responsibilities: truncate(job.responsibilities, 1500),
  skills: Array.isArray(job.skills) ? job.skills : [],
})

const mergeSkills = (profile, resume) => {
  const seen = new Set()
  const skills = []
  for (const source of [profile, resume]) {
    if (!source || !Array.isArray(source.skills)) continue
    for (const skill of source.skills) {
      const normalized = skill ? String(skill).trim() : ''
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized)
        skills.push(normalized)
      }
    }
  }
  return skills
}

const buildExperience = (profile, resume) => {
  const entries = []
  for (const source of [profile, resume]) {
    if (!source || !Array.isArray(source.experience)) continue
    for (const entry of source.experience) {
      if (!entry || (!entry.company && !entry.position && !entry.description)) continue
      entries.push({
        company: entry.company || '',
        position: entry.position || '',
        description: truncate(entry.description, 200),
        startDate: entry.startDate || undefined,
        endDate: entry.endDate || undefined,
        current: entry.current === true,
      })
    }
  }

  entries.sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : 0
    const bTime = b.startDate ? new Date(b.startDate).getTime() : 0
    return bTime - aTime
  })

  return entries.slice(0, 3)
}

const buildEducation = (profile, resume) => {
  const entries = []
  const seen = new Set()
  for (const source of [profile, resume]) {
    if (!source || !Array.isArray(source.education)) continue
    for (const edu of source.education) {
      if (!edu || (!edu.school && !edu.degree && !edu.fieldOfStudy)) continue
      const key = `${edu.school || ''}|${edu.degree || ''}|${edu.fieldOfStudy || ''}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      entries.push({
        school: edu.school || '',
        degree: edu.degree || '',
        fieldOfStudy: edu.fieldOfStudy || '',
        startDate: edu.startDate || undefined,
        endDate: edu.endDate || undefined,
      })
    }
  }
  return entries.slice(0, 3)
}

const buildProjects = (profile, resume) => {
  const entries = []
  const seen = new Set()
  for (const source of [resume]) {
    if (!source || !Array.isArray(source.projects)) continue
    for (const proj of source.projects) {
      if (!proj || (!proj.name && !proj.description)) continue
      const key = (proj.name || '').toLowerCase()
      if (key && seen.has(key)) continue
      if (key) seen.add(key)
      entries.push({
        name: proj.name || '',
        description: truncate(proj.description, 200),
        techStack: Array.isArray(proj.techStack) ? proj.techStack : [],
      })
    }
  }
  return entries.slice(0, 3)
}

const resolveYearsOfExperience = (profile, resume) => {
  if (profile && typeof profile.yearsOfExperience === 'number' && Number.isFinite(profile.yearsOfExperience)) {
    return profile.yearsOfExperience
  }
  if (
    resume &&
    resume.draft &&
    resume.draft.profile &&
    typeof resume.draft.profile.yearsOfExperience === 'number' &&
    Number.isFinite(resume.draft.profile.yearsOfExperience)
  ) {
    return resume.draft.profile.yearsOfExperience
  }
  return undefined
}

export const buildCandidatePayload = (profile, resume) => {
  const yoe = resolveYearsOfExperience(profile, resume)
  const payload = {
    skills: mergeSkills(profile, resume),
    summary:
      resume && resume.summary
        ? String(resume.summary)
        : profile && profile.bio
          ? String(profile.bio)
          : undefined,
    experience: buildExperience(profile, resume),
  }
  if (yoe !== undefined) {
    payload.yearsOfExperience = yoe
  }
  const education = buildEducation(profile, resume)
  if (education.length > 0) {
    payload.education = education
  }
  const projects = buildProjects(profile, resume)
  if (projects.length > 0) {
    payload.projects = projects
  }
  return payload
}

export const buildDirectionalCandidatePayload = (profile, resume, direction) => {
  let fallbackSummary = undefined
  if (resume && resume.summary) {
    fallbackSummary = String(resume.summary)
  } else if (profile && profile.bio) {
    fallbackSummary = String(profile.bio)
  } else if (profile && profile.headline) {
    fallbackSummary = String(profile.headline)
  }

  const yoe = resolveYearsOfExperience(profile, resume)
  const payload = {
    skills:
      direction.focusSkills && direction.focusSkills.length > 0
        ? direction.focusSkills
        : mergeSkills(profile, resume),
    summary: direction.description ? String(direction.description) : fallbackSummary,
    experience: buildExperience(profile, resume),
    targetRoles: direction.targetRoles && direction.targetRoles.length > 0 ? direction.targetRoles : undefined,
  }
  if (yoe !== undefined) {
    payload.yearsOfExperience = yoe
  }
  const education = buildEducation(profile, resume)
  if (education.length > 0) {
    payload.education = education
  }
  const projects = buildProjects(profile, resume)
  if (projects.length > 0) {
    payload.projects = projects
  }
  return payload
}

export const validateDimensionScore = (val, name = 'dimension') => {
  if (val === null || val === undefined || val === '') {
    throw new ApiError(502, `AI response missing or invalid ${name} score`)
  }
  const num = Number(val)
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    throw new ApiError(502, `AI returned invalid ${name} score: ${val}`)
  }
  return Math.max(0, Math.min(100, Math.round(num)))
}

export const calculateFinalScore = ({ skillsScore, experienceScore, backgroundScore }) => {
  const final =
    skillsScore * SCORING_WEIGHTS.SKILLS +
    experienceScore * SCORING_WEIGHTS.EXPERIENCE +
    backgroundScore * SCORING_WEIGHTS.BACKGROUND
  return Math.max(0, Math.min(100, Math.round(final)))
}

const asStringArray = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item !== null && item !== undefined && String(item).trim() !== '')
    .map((item) => String(item))
}

const normalizeMatch = (raw) => {
  const data = raw && typeof raw === 'object' ? raw : {}
  const skillsScore = validateDimensionScore(data.skillsScore, 'skills')
  const experienceScore = validateDimensionScore(data.experienceScore, 'experience')
  const backgroundScore = validateDimensionScore(data.backgroundScore, 'background')
  const finalMatchScore = calculateFinalScore({ skillsScore, experienceScore, backgroundScore })

  return {
    matchScore: finalMatchScore,
    skillsScore,
    experienceScore,
    backgroundScore,
    matchedSkills: asStringArray(data.matchedSkills),
    missingSkills: asStringArray(data.missingSkills),
    strengths: asStringArray(data.strengths),
    weaknesses: asStringArray(data.weaknesses),
    recommendations: asStringArray(data.recommendations),
  }
}

const toMatchShape = (analysis) => ({
  matchScore: analysis.matchScore,
  skillsScore: analysis.skillsScore,
  experienceScore: analysis.experienceScore,
  backgroundScore: analysis.backgroundScore,
  matchedSkills: Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills : [],
  missingSkills: Array.isArray(analysis.missingSkills) ? analysis.missingSkills : [],
  strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
  weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
  recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
})

const generateMatch = async (userId, jobId, careerDirectionId = null) => {
  validateObjectId(jobId, 'job ID')

  const job = await Job.findOne({ _id: jobId, user: userId, isDeleted: { $ne: true } })
  if (!job) {
    throw new ApiError(404, 'Job not found')
  }

  const [profile, resume] = await Promise.all([
    Profile.findOne({ user: userId }),
    Resume.findOne({ user: userId }),
  ])

  let candidatePayload
  let usedDirectionId = null
  let usedDirectionTitle = null
  let candidateSourceType = 'general'

  if (careerDirectionId) {
    validateObjectId(careerDirectionId, 'career direction ID')

    const direction = await CareerDirection.findOne({ _id: careerDirectionId, user: userId })
    if (!direction) {
      throw new ApiError(404, 'Career direction not found')
    }

    usedDirectionId = direction._id
    usedDirectionTitle = direction.title
    candidateSourceType = direction.baseType

    const profileSource = direction.baseType === 'profile' ? profile : null
    const resumeSource = direction.baseType === 'resume' ? resume : null

    if (direction.baseType === 'profile' && !profileSource) {
      throw new ApiError(400, 'Profile not found for profile-based career direction')
    }

    if (direction.baseType === 'resume' && !resumeSource) {
      throw new ApiError(400, 'Resume not found for resume-based career direction')
    }

    if (direction.baseType !== 'profile' && direction.baseType !== 'resume') {
      throw new ApiError(400, 'Invalid career direction base type')
    }

    candidatePayload = buildDirectionalCandidatePayload(profileSource, resumeSource, direction)
  } else {
    if (!resume) {
      throw new ApiError(400, 'Resume not found for General / Base Resume')
    }
    candidatePayload = buildCandidatePayload(profile, resume)
  }

  const jobPayload = buildJobPayload(job)
  const prompt = buildJobMatchPrompt(jobPayload, candidatePayload)
  const rawResult = await generateStructuredJSON(prompt, RESPONSE_SCHEMA)

  const match = normalizeMatch(rawResult)

  const update = {
    ...match,
    careerDirectionId: usedDirectionId,
    careerDirectionTitle: usedDirectionTitle,
    candidateSourceType,
    updatedAt: new Date(),
  }

  const analysis = await AIAnalysis.findOneAndUpdate(
    { user: userId, job: jobId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  if (!analysis) {
    throw new ApiError(500, 'Failed to save AI analysis')
  }

  return {
    ...match,
    careerDirectionId: usedDirectionId,
    careerDirectionTitle: usedDirectionTitle,
    candidateSourceType,
  }
}

export { generateMatch, toMatchShape }
