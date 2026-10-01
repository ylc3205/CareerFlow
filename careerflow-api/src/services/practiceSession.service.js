import mongoose from 'mongoose'
import { z } from 'zod'
import Interview from '../models/interview.model.js'
import InterviewPreparation from '../models/interviewPreparation.model.js'
import PracticeSession from '../models/practiceSession.model.js'
import ApiError from '../utils/ApiError.js'
import { buildAnswerEvaluationPrompt, RESPONSE_SCHEMA } from './prompts/evaluation.prompt.js'
import { generateAnswerEvaluationJSON } from './ai.service.js'

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

const buildJobContext = (job) => ({
  title: job.title,
  company: job.company,
  requirements: truncate(job.requirements, 1200),
  responsibilities: truncate(job.responsibilities, 800),
  skills: Array.isArray(job.skills) ? job.skills : [],
})

const buildQuestionInfo = (slot) => ({
  question: slot.question,
  category: slot.category,
  difficulty: slot.difficulty,
})

const requireOwnedInterview = async (userId, interviewId) => {
  const interview = await Interview.findOne({ _id: interviewId, user: userId })
  if (!interview) {
    throw new ApiError(404, 'Interview not found')
  }
  return interview
}

const scoreField = z
  .union([z.number(), z.string()])
  .transform((value) => {
    const num = Number(value)
    return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : null
  })
  .refine((value) => value !== null, { message: 'Invalid score' })

const evaluationSchema = z.object({
  score: scoreField,
  technicalScore: scoreField,
  communicationScore: scoreField,
  behavioralScore: scoreField,
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  feedback: z.string(),
  suggestedAnswer: z.string(),
})

const cleanStrings = (items, max) => {
  if (!Array.isArray(items)) return []
  return items
    .filter((item) => item !== null && item !== undefined && String(item).trim() !== '')
    .map((item) => String(item).trim())
    .slice(0, max)
}

const normalizeEvaluation = (raw) => {
  const parsed = evaluationSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError(502, 'AI returned an invalid response')
  }
  const data = parsed.data
  return {
    score: data.score,
    technicalScore: data.technicalScore,
    communicationScore: data.communicationScore,
    behavioralScore: data.behavioralScore,
    strengths: cleanStrings(data.strengths, 5),
    weaknesses: cleanStrings(data.weaknesses, 5),
    feedback: data.feedback.slice(0, 300),
    suggestedAnswer: data.suggestedAnswer.slice(0, 500),
  }
}

const topAreas = (answers, key) => {
  const counts = new Map()
  for (const answer of answers) {
    for (const item of answer.evaluation[key] || []) {
      const text = String(item).trim()
      if (text) counts.set(text, (counts.get(text) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([text]) => text)
}

const computeSummary = (answers) => {
  const answered = answers.filter((answer) => answer.evaluation)
  if (answered.length === 0) return null

  const mean = (fn) =>
    Math.round(answered.reduce((sum, answer) => sum + fn(answer.evaluation), 0) / answered.length)

  return {
    overallScore: mean((evaluation) => evaluation.score),
    technicalScore: mean((evaluation) => evaluation.technicalScore),
    communicationScore: mean((evaluation) => evaluation.communicationScore),
    behavioralScore: mean((evaluation) => evaluation.behavioralScore),
    strongAreas: topAreas(answered, 'strengths'),
    weakAreas: topAreas(answered, 'weaknesses'),
  }
}

const createSession = async (userId, interviewId) => {
  validateObjectId(interviewId, 'Invalid interview ID')
  await requireOwnedInterview(userId, interviewId)

  const preparation = await InterviewPreparation.findOne({ user: userId, interview: interviewId })
  if (!preparation) {
    throw new ApiError(400, 'Please generate interview preparation first')
  }

  const answers = preparation.questions.map((question, index) => ({
    questionIndex: index,
    question: question.question,
    category: question.category,
    difficulty: question.difficulty,
  }))

  const session = await PracticeSession.create({
    user: userId,
    interview: interviewId,
    preparation: preparation._id,
    status: 'not_started',
    answers,
  })

  return session
}

const listSessions = async (userId, interviewId) => {
  validateObjectId(interviewId, 'Invalid interview ID')
  await requireOwnedInterview(userId, interviewId)

  const sessionsQuery = PracticeSession.find({ user: userId, interview: interviewId })
    .sort({ createdAt: -1 })
  const sessions =
    typeof sessionsQuery.lean === 'function' ? await sessionsQuery.lean() : await sessionsQuery
  return sessions
}

const getSession = async (userId, interviewId, practiceId) => {
  validateObjectId(interviewId, 'Invalid interview ID')
  validateObjectId(practiceId, 'Invalid practice session ID')
  await requireOwnedInterview(userId, interviewId)

  const session = await PracticeSession.findOne({
    _id: practiceId,
    user: userId,
    interview: interviewId,
  })
  if (!session) {
    throw new ApiError(404, 'Practice session not found')
  }
  return session
}

const submitAnswer = async (userId, interviewId, practiceId, questionIndex, answer) => {
  validateObjectId(interviewId, 'Invalid interview ID')
  validateObjectId(practiceId, 'Invalid practice session ID')

  const interview = await Interview.findOne({ _id: interviewId, user: userId }).populate({
    path: 'application',
    select: 'job status',
    populate: {
      path: 'job',
      select: 'title company requirements responsibilities skills',
    },
  })
  if (!interview) {
    throw new ApiError(404, 'Interview not found')
  }

  const session = await PracticeSession.findOne({
    _id: practiceId,
    user: userId,
    interview: interviewId,
  })
  if (!session) {
    throw new ApiError(404, 'Practice session not found')
  }

  if (session.status === 'completed') {
    throw new ApiError(400, 'Practice already completed')
  }

  if (
    !Number.isInteger(questionIndex) ||
    questionIndex < 0 ||
    questionIndex >= session.answers.length
  ) {
    throw new ApiError(400, 'Invalid question index')
  }

  const trimmedAnswer = String(answer || '').trim()
  if (trimmedAnswer === '') {
    throw new ApiError(400, 'Answer is required')
  }

  const slot = session.answers[questionIndex]

  // Same-answer reuse: identical answer already evaluated → no AI call.
  if (slot.evaluation && slot.answer === trimmedAnswer) {
    return session
  }

  const job = interview.application && interview.application.job ? interview.application.job : null
  if (!job) {
    throw new ApiError(400, 'Interview job not found')
  }

  const questionInfo = buildQuestionInfo(slot)
  const jobContext = buildJobContext(job)

  const prompt = buildAnswerEvaluationPrompt(questionInfo, jobContext, trimmedAnswer)
  const rawResult = await generateAnswerEvaluationJSON(prompt, RESPONSE_SCHEMA)

  const evaluation = normalizeEvaluation(rawResult)

  slot.answer = trimmedAnswer
  slot.evaluation = evaluation
  slot.attemptCount = (slot.attemptCount || 0) + 1
  slot.answeredAt = new Date()

  if (session.status === 'not_started') {
    session.status = 'in_progress'
  }

  if (session.answers.every((item) => item.evaluation)) {
    session.status = 'completed'
    session.summary = computeSummary(session.answers)
    session.completedAt = new Date()
  }

  await session.save()
  return session
}

const completeSession = async (userId, interviewId, practiceId) => {
  validateObjectId(interviewId, 'Invalid interview ID')
  validateObjectId(practiceId, 'Invalid practice session ID')
  await requireOwnedInterview(userId, interviewId)

  const session = await PracticeSession.findOne({
    _id: practiceId,
    user: userId,
    interview: interviewId,
  })
  if (!session) {
    throw new ApiError(404, 'Practice session not found')
  }

  // Idempotent: an already completed session returns its summary as-is.
  if (session.status === 'completed') {
    return session
  }

  const answered = session.answers.filter((item) => item.evaluation)
  if (answered.length === 0) {
    throw new ApiError(400, 'No answers to summarize')
  }

  session.status = 'completed'
  session.summary = computeSummary(session.answers)
  session.completedAt = new Date()

  await session.save()
  return session
}

const deleteSession = async (userId, interviewId, practiceId) => {
  validateObjectId(interviewId, 'Invalid interview ID')
  validateObjectId(practiceId, 'Invalid practice session ID')
  await requireOwnedInterview(userId, interviewId)

  const session = await PracticeSession.findOneAndDelete({
    _id: practiceId,
    user: userId,
    interview: interviewId,
  })
  if (!session) {
    throw new ApiError(404, 'Practice session not found')
  }
}

export {
  createSession,
  listSessions,
  getSession,
  submitAnswer,
  completeSession,
  deleteSession,
  normalizeEvaluation,
  computeSummary,
}