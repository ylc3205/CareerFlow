import mongoose from 'mongoose'
import PracticeSession, { PRACTICE_STATUSES } from '../models/practiceSession.model.js'
import ApiError from '../utils/ApiError.js'

const validateObjectId = (id, message = 'Invalid ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, message)
  }
}

const normalizePagination = (query = {}) => {
  const parsedPage = parseInt(query.page, 10)
  const parsedLimit = parseInt(query.limit, 10)

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20
  return { page, limit }
}

const normalizeAreaLimit = (value) => {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10) : 5
}

const computeScoreAverages = (items, key) => {
  const values = items
    .map((item) => item && item[key])
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

const aggregateAreas = (evaluations, limit = 5) => {
  const count = (key) => {
    const counts = new Map()
    for (const evaluation of evaluations) {
      const items = evaluation && evaluation[key]
      if (!Array.isArray(items)) continue
      for (const item of items) {
        const text = String(item).trim()
        if (!text) continue
        counts.set(text, (counts.get(text) || 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
      })
      .slice(0, limit)
      .map(([area, count]) => ({ area, count }))
  }
  return { strongAreas: count('strengths'), weakAreas: count('weaknesses') }
}

const SESSION_INTERVIEW_SELECT = 'title type scheduledDate status'
const SESSION_JOB_SELECT = 'title company'

const loadSessions = async (userId, { status, sort, withInterview = false } = {}) => {
  const filter = { user: userId }
  if (status) filter.status = status

  let query = PracticeSession.find(filter)
  if (sort) query = query.sort(sort)
  if (withInterview) {
    query = query.populate({
      path: 'interview',
      select: SESSION_INTERVIEW_SELECT,
      populate: {
        path: 'application',
        select: 'job',
        populate: { path: 'job', select: SESSION_JOB_SELECT },
      },
    })
  }
  return query
}

const evaluatedAnswersOf = (sessions) => {
  const results = []
  for (const session of sessions) {
    for (const answer of session.answers || []) {
      if (answer && answer.evaluation) results.push(answer)
    }
  }
  return results
}

const toHistoryItem = (session) => {
  const interview = session.interview
  const application = interview && interview.application
  const job = application && application.job
  const answers = session.answers || []

  return {
    _id: session._id,
    status: session.status,
    interview: interview
      ? {
          _id: interview._id,
          title: interview.title,
          type: interview.type,
          scheduledDate: interview.scheduledDate,
          status: interview.status,
        }
      : null,
    job: job ? { _id: job._id, title: job.title, company: job.company } : null,
    answeredCount: answers.filter((answer) => answer && answer.evaluation).length,
    totalQuestions: answers.length,
    summary: session.summary || null,
    completedAt: session.completedAt || null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

const getHistory = async (userId, query = {}) => {
  const { page, limit } = normalizePagination(query)
  const filter = { user: userId }

  const { status } = query
  if (status !== undefined && status !== '') {
    if (!PRACTICE_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid status filter')
    }
    filter.status = status
  }

  const { interview } = query
  if (interview !== undefined && interview !== '') {
    validateObjectId(interview, 'Invalid interview ID')
    filter.interview = interview
  }

  const total = await PracticeSession.countDocuments(filter)
  const sessions = await PracticeSession.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: 'interview',
      select: SESSION_INTERVIEW_SELECT,
      populate: {
        path: 'application',
        select: 'job',
        populate: { path: 'job', select: SESSION_JOB_SELECT },
      },
    })

  return {
    sessions: sessions.map(toHistoryItem),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

const getTrends = async (userId) => {
  const sessions = await loadSessions(userId, { status: 'completed', sort: { completedAt: 1 } })
  const completed = sessions.filter((session) => session.summary && session.summary.overallScore != null)

  return {
    completedCount: completed.length,
    trend: completed.map((session) => ({
      sessionId: session._id,
      completedAt: session.completedAt,
      overallScore: session.summary.overallScore,
    })),
  }
}

const getAreas = async (userId, query = {}) => {
  const limit = normalizeAreaLimit(query.limit)
  const sessions = await loadSessions(userId)
  const evaluations = evaluatedAnswersOf(sessions).map((answer) => answer.evaluation)
  return aggregateAreas(evaluations, limit)
}

const getPerformance = async (userId) => {
  const sessions = await loadSessions(userId)
  const answered = evaluatedAnswersOf(sessions)

  const evaluations = answered.map((answer) => answer.evaluation)
  const averages = {
    overallScore: computeScoreAverages(evaluations, 'score'),
    technicalScore: computeScoreAverages(evaluations, 'technicalScore'),
    communicationScore: computeScoreAverages(evaluations, 'communicationScore'),
    behavioralScore: computeScoreAverages(evaluations, 'behavioralScore'),
  }

  const categoryTotals = { technical: { count: 0, total: 0 }, behavioral: { count: 0, total: 0 }, situational: { count: 0, total: 0 } }
  let attemptTotal = 0
  for (const answer of answered) {
    const category = categoryTotals[answer.category] ? answer.category : null
    if (category) {
      categoryTotals[category].count += 1
      categoryTotals[category].total += answer.evaluation.score
    }
    attemptTotal += answer.attemptCount || 0
  }

  const byCategory = {}
  for (const category of Object.keys(categoryTotals)) {
    const entry = categoryTotals[category]
    byCategory[category] = {
      count: entry.count,
      averageScore: entry.count > 0 ? Math.round(entry.total / entry.count) : null,
    }
  }

  return {
    totalEvaluations: evaluations.length,
    averages,
    averageAttemptsPerQuestion:
      evaluations.length === 0 ? null : Math.round((attemptTotal / evaluations.length) * 10) / 10,
    byCategory,
  }
}

const getDashboard = async (userId) => {
  const sessions = await loadSessions(userId, { withInterview: true })
  const completed = sessions.filter((session) => session.status === 'completed')
  const summaries = completed
    .filter((session) => session.summary)
    .map((session) => session.summary)

  let answeredQuestions = 0
  let totalQuestions = 0
  for (const session of sessions) {
    const answers = session.answers || []
    totalQuestions += answers.length
    answeredQuestions += answers.filter((answer) => answer && answer.evaluation).length
  }

  const averages = {
    overallScore: computeScoreAverages(summaries, 'overallScore'),
    technicalScore: computeScoreAverages(summaries, 'technicalScore'),
    communicationScore: computeScoreAverages(summaries, 'communicationScore'),
    behavioralScore: computeScoreAverages(summaries, 'behavioralScore'),
    sessionsCount: summaries.length,
  }

  let best = null
  for (const session of completed) {
    if (!session.summary || session.summary.overallScore == null) continue
    if (!best) {
      best = session
      continue
    }
    const score = session.summary.overallScore
    const bestScore = best.summary.overallScore
    if (
      score > bestScore ||
      (score === bestScore &&
        (new Date(session.completedAt) > new Date(best.completedAt) ||
          (new Date(session.completedAt).getTime() === new Date(best.completedAt).getTime() &&
            String(session._id) > String(best._id))))
    ) {
      best = session
    }
  }

  const toSessionRef = (session) => {
    const interview = session.interview
    const application = interview && interview.application
    const job = application && application.job
    return {
      sessionId: session._id,
      overallScore: session.summary.overallScore,
      completedAt: session.completedAt,
      interview: interview ? { _id: interview._id, title: interview.title } : null,
      job: job ? { _id: job._id, title: job.title, company: job.company } : null,
    }
  }

  const recentSessions = [...completed]
    .filter((session) => session.summary && session.summary.overallScore != null)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 5)
    .map(toSessionRef)

  const trend = [...completed]
    .filter((session) => session.summary && session.summary.overallScore != null)
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
    .map(toSessionRef)

  const evaluations = evaluatedAnswersOf(sessions).map((answer) => answer.evaluation)
  const { strongAreas, weakAreas } = aggregateAreas(evaluations, 5)

  return {
    totals: {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      inProgressSessions: sessions.filter((session) => session.status === 'in_progress').length,
      notStartedSessions: sessions.filter((session) => session.status === 'not_started').length,
      answeredQuestions,
      totalQuestions,
    },
    averages,
    bestSession: best ? toSessionRef(best) : null,
    recentSessions,
    trend,
    strongAreas,
    weakAreas,
  }
}

export {
  getHistory,
  getDashboard,
  getTrends,
  getAreas,
  getPerformance,
  aggregateAreas,
  computeScoreAverages,
}