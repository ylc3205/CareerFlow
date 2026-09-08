import mongoose from 'mongoose'
import Resume from '../models/resume.model.js'
import Profile from '../models/profile.model.js'
import CareerDirection from '../models/careerDirection.model.js'
import ApiError from '../utils/ApiError.js'
import { buildCareerDirectionGenerationPrompt, RESPONSE_SCHEMA } from './prompts/careerDirectionGeneration.prompt.js'
import { generateCareerDirectionJSON } from './ai.service.js'
import { FOCUS_AREAS, CAREER_LEVELS, GENERATION_MODES } from '../models/careerDirection.model.js'

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

const cleanString = (value, max) => {
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string') return value
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned) return undefined
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned
}

const cleanArray = (value, itemMax = 100) => {
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
  return result
}



const assembleContext = async (userId, contextSources) => {
  const context = {}

  const [resume, profile] = await Promise.all([
    contextSources.resume ? Resume.findOne({ user: userId }).lean() : null,
    contextSources.profile ? Profile.findOne({ user: userId }).lean() : null,
  ])

  if (resume) {
    context.resume = {
      title: resume.title,
      summary: resume.summary,
      skills: resume.skills || [],
      experience: resume.experience || [],
      education: resume.education || [],
      projects: resume.projects || [],
      certifications: resume.certifications || [],
      languages: resume.languages || [],
    }
  }

  if (profile) {
    context.profile = {
      headline: profile.headline,
      bio: profile.bio,
      skills: profile.skills || [],
      yearsOfExperience: profile.yearsOfExperience,
      experience: profile.experience || [],
      education: profile.education || [],
    }
  }

  if (contextSources.existingDirections) {
    const directions = await CareerDirection.find({ user: userId })
      .select('title description focusSkills targetRoles careerLevel primaryFocus secondaryFocus')
      .limit(5)
      .lean()
    context.existingDirections = directions
  }

  return context
}

const normalizeGeneratedDirection = (raw) => {
  const data = raw && typeof raw === 'object' ? raw : {}

  const normalized = {
    title: cleanString(data.title, 200),
    description: cleanString(data.description, 500),
    focusSkills: cleanArray(data.focusSkills, 100).slice(0, 20),
    targetRoles: cleanArray(data.targetRoles, 200).slice(0, 20),
    careerLevel: CAREER_LEVELS.includes(data.careerLevel) ? data.careerLevel : 'unspecified',
    primaryFocus: Array.isArray(data.primaryFocus)
      ? data.primaryFocus.filter((f) => FOCUS_AREAS.includes(f)).slice(0, 5)
      : [],
    secondaryFocus: Array.isArray(data.secondaryFocus)
      ? data.secondaryFocus.filter((f) => FOCUS_AREAS.includes(f)).slice(0, 3)
      : [],
    learningPriorities: cleanArray(data.learningPriorities, 200).slice(0, 10),
    rationale: cleanString(data.rationale, 1000),
    suggestedNextSteps: cleanArray(data.suggestedNextSteps, 200).slice(0, 10),
    baseType: ['profile', 'resume'].includes(data.baseType) ? data.baseType : 'resume',
  }

  return normalized
}

const validateGeneratedDirection = (normalized) => {
  if (!normalized.title || normalized.title.trim() === '') {
    throw new ApiError(502, 'AI returned an invalid response: title is required')
  }
  if (!Array.isArray(normalized.focusSkills) || normalized.focusSkills.length === 0) {
    throw new ApiError(502, 'AI returned an invalid response: focusSkills must be a non-empty array')
  }
  if (!Array.isArray(normalized.targetRoles) || normalized.targetRoles.length === 0) {
    throw new ApiError(502, 'AI returned an invalid response: targetRoles must be a non-empty array')
  }
  return normalized
}

const generateCareerDirection = async (userId, input) => {
  const {
    mode,
    userIdea,
    targetRole,
    careerLevel,
    primaryFocus,
    secondaryFocus,
    contextSources,
    templateRole,
  } = input

  const context = await assembleContext(userId, contextSources)

  const promptInput = {
    mode,
    userIdea,
    targetRole,
    careerLevel,
    primaryFocus,
    secondaryFocus,
    contextSources,
    templateRole,
    context,
  }

  const prompt = buildCareerDirectionGenerationPrompt(promptInput)

  const rawResult = await generateCareerDirectionJSON(prompt, RESPONSE_SCHEMA)

  const normalized = normalizeGeneratedDirection(rawResult)
  const validated = validateGeneratedDirection(normalized)

  const contextUsed = Object.entries(contextSources)
    .filter(([, v]) => v === true)
    .map(([k]) => k)

  const metadata = {
    mode,
    userIdea: userIdea || undefined,
    contextSources: contextUsed,
    modelVersion: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generatedAt: new Date(),
    requestId: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }

  return {
    generatedDirection: validated,
    metadata,
  }
}

export { generateCareerDirection, assembleContext, normalizeGeneratedDirection, validateGeneratedDirection }