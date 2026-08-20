import mongoose from 'mongoose'
import { z } from 'zod'
import Interview from '../models/interview.model.js'
import Profile from '../models/profile.model.js'
import Resume from '../models/resume.model.js'
import InterviewPreparation from '../models/interviewPreparation.model.js'
import ApiError from '../utils/ApiError.js'
import { buildInterviewPreparationPrompt, RESPONSE_SCHEMA } from './prompts/interview.prompt.js'
import { generateInterviewPreparationJSON } from './ai.service.js'

const validateObjectId = (id, message = 'Invalid ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, message)
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
  location: job.location || '',
  employmentType: job.employmentType || '',
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

const buildProjects = (resume) => {
  if (!resume || !Array.isArray(resume.projects)) return []
  const projects = resume.projects
    .filter((project) => project && (project.name || project.description))
    .map((project) => ({
      name: project.name || '',
      description: truncate(project.description, 200),
      techStack: Array.isArray(project.techStack) ? project.techStack : [],
    }))
  return projects.slice(0, 3)
}

const buildCandidatePayload = (profile, resume) => ({
  skills: mergeSkills(profile, resume),
  summary: resume && resume.summary ? String(resume.summary) : undefined,
  experience: buildExperience(profile, resume),
  projects: buildProjects(resume),
  languages: resume && Array.isArray(resume.languages) ? resume.languages : [],
})

const buildInterviewContext = (interview) => ({
  title: interview.title,
  type: interview.type || '',
  scheduledDate: interview.scheduledDate ? new Date(interview.scheduledDate).toISOString() : '',
  status: interview.status || '',
  interviewerNames: interview.interviewerNames || '',
  location: interview.location || '',
  notes: truncate(interview.notes, 500),
})

const interviewQuestionSchema = z.object({
  question: z.string().min(1).max(500),
  category: z.enum(['technical', 'behavioral', 'situational']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
})

const interviewPreparationSchema = z.object({
  questions: z.array(interviewQuestionSchema).min(5).max(10),
})

const normalizePreparation = (raw) => {
  const parsed = interviewPreparationSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError(502, 'AI returned an invalid response')
  }
  return parsed.data.questions
}

// Read-only lookup of an existing preparation. Returns null when the owned
// interview has no preparation yet. Never triggers AI generation.
const getPreparation = async (userId, interviewId) => {
  validateObjectId(interviewId, 'Invalid interview ID')

  const interview = await Interview.findOne({ _id: interviewId, user: userId })
  if (!interview) {
    throw new ApiError(404, 'Interview not found')
  }

  return InterviewPreparation.findOne({ user: userId, interview: interviewId })
}

const generatePreparation = async (userId, interviewId) => {
  validateObjectId(interviewId, 'Invalid interview ID')

  const interview = await Interview.findOne({ _id: interviewId, user: userId }).populate({
    path: 'application',
    select: 'job status',
    populate: {
      path: 'job',
      select: 'title company location employmentType description requirements responsibilities skills',
    },
  })

  if (!interview) {
    throw new ApiError(404, 'Interview not found')
  }

  const existing = await InterviewPreparation.findOne({ user: userId, interview: interviewId })
  if (existing) {
    return existing
  }

  const job = interview.application && interview.application.job ? interview.application.job : null
  if (!job) {
    throw new ApiError(400, 'Interview job not found')
  }

  const [profile, resume] = await Promise.all([
    Profile.findOne({ user: userId }),
    Resume.findOne({ user: userId }),
  ])

  if (!profile && !resume) {
    throw new ApiError(400, 'Please create a profile or resume to use AI interview preparation')
  }

  const jobPayload = buildJobPayload(job)
  const candidatePayload = buildCandidatePayload(profile, resume)
  const interviewContext = buildInterviewContext(interview)

  const prompt = buildInterviewPreparationPrompt(jobPayload, candidatePayload, interviewContext)
  const rawResult = await generateInterviewPreparationJSON(prompt, RESPONSE_SCHEMA)

  const questions = normalizePreparation(rawResult)
  const preparation = new InterviewPreparation({
    user: userId,
    interview: interviewId,
    job: job._id,
    questions,
  })

  try {
    await preparation.save()
  } catch {
    throw new ApiError(500, 'Failed to save interview preparation')
  }

  return preparation
}

export { getPreparation, generatePreparation, normalizePreparation }