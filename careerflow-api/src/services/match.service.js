import mongoose from 'mongoose'
import Job from '../models/job.model.js'
import Profile from '../models/profile.model.js'
import Resume from '../models/resume.model.js'
import CareerDirection from '../models/careerDirection.model.js'
import AIAnalysis from '../models/aiAnalysis.model.js'
import ApiError from '../utils/ApiError.js'
import { buildJobMatchPrompt, RESPONSE_SCHEMA } from './prompts/match.prompt.js'
import { generateStructuredJSON } from './ai.service.js'

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

const buildJobPayload = (job) => ({
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

const buildCandidatePayload = (profile, resume) => ({
  skills: mergeSkills(profile, resume),
  summary: resume && resume.summary ? String(resume.summary) : undefined,
  experience: buildExperience(profile, resume),
})

const buildDirectionalCandidatePayload = (profile, resume, direction) => {
  let fallbackSummary = undefined
  if (resume && resume.summary) {
    fallbackSummary = String(resume.summary)
  } else if (profile && profile.bio) {
    fallbackSummary = String(profile.bio)
  } else if (profile && profile.headline) {
    fallbackSummary = String(profile.headline)
  }

  return {
    skills:
      direction.focusSkills && direction.focusSkills.length > 0
        ? direction.focusSkills
        : mergeSkills(profile, resume),
    summary: direction.description ? String(direction.description) : fallbackSummary,
    experience: buildExperience(profile, resume),
    targetRoles: direction.targetRoles && direction.targetRoles.length > 0 ? direction.targetRoles : undefined,
  }
}

const normalizeScore = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, Math.round(num)))
}

const asStringArray = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item !== null && item !== undefined && String(item).trim() !== '')
    .map((item) => String(item))
}

const normalizeMatch = (raw) => {
  const data = raw && typeof raw === 'object' ? raw : {}
  return {
    matchScore: normalizeScore(data.matchScore),
    matchedSkills: asStringArray(data.matchedSkills),
    missingSkills: asStringArray(data.missingSkills),
    strengths: asStringArray(data.strengths),
    weaknesses: asStringArray(data.weaknesses),
    recommendations: asStringArray(data.recommendations),
  }
}

const toMatchShape = (analysis) => ({
  matchScore: analysis.matchScore,
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
    candidatePayload = buildCandidatePayload(null, resume)
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

export { generateMatch }
