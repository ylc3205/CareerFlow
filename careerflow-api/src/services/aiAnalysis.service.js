import mongoose from 'mongoose'
import AIAnalysis from '../models/aiAnalysis.model.js'
import Job from '../models/job.model.js'
import ApiError from '../utils/ApiError.js'

// Fields populated on job when returning analyses.
// Excludes: user (internal ownership), description, requirements, etc.
const JOB_POPULATE_SELECT = '_id title company isDeleted'

const listAnalyses = async (userId, filter = {}) => {
  const query = { user: userId }

  if (filter.job) {
    if (!mongoose.Types.ObjectId.isValid(filter.job)) {
      return []
    }
    query.job = filter.job
  }

  const analyses = await AIAnalysis.find(query)
    .sort({ createdAt: -1 })
    .populate('job', JOB_POPULATE_SELECT)
    .select('-user -model -provider -__v')

  // Filter out analyses whose populated Job is null/undefined or soft-deleted
  return analyses.filter((a) => a.job && a.job._id && a.job.isDeleted !== true)
}

const jobRef = (analysis) => ({
  job: analysis.job ? { _id: analysis.job._id, title: analysis.job.title, company: analysis.job.company } : null,
  matchScore: analysis.matchScore,
})

const getSummary = async (userId) => {
  const analyses = await AIAnalysis.find({ user: userId }).populate('job', JOB_POPULATE_SELECT)

  // Ignore analyses whose populated Job is null/undefined or soft-deleted
  const activeAnalyses = analyses.filter((a) => a.job && a.job._id && a.job.isDeleted !== true)

  const totalAnalyses = activeAnalyses.length
  const averageMatchScore =
    totalAnalyses === 0
      ? 0
      : Math.round((activeAnalyses.reduce((sum, a) => sum + a.matchScore, 0) / totalAnalyses) * 10) / 10

  let highestMatch = null
  let lowestMatch = null
  for (const analysis of activeAnalyses) {
    if (!highestMatch || analysis.matchScore > highestMatch.matchScore) {
      highestMatch = jobRef(analysis)
    }
    if (!lowestMatch || analysis.matchScore < lowestMatch.matchScore) {
      lowestMatch = jobRef(analysis)
    }
  }

  const matchedJobIds = new Set(activeAnalyses.map((a) => String(a.job._id)))
  const totalJobs = await Job.countDocuments({ user: userId, isDeleted: { $ne: true } })
  const matchedJobs = matchedJobIds.size
  const unmatchedJobs = Math.max(0, totalJobs - matchedJobs)

  return {
    totalAnalyses,
    averageMatchScore,
    highestMatch,
    lowestMatch,
    matchedJobs,
    unmatchedJobs,
  }
}

const deleteAnalysis = async (userId, analysisId) => {
  if (!mongoose.Types.ObjectId.isValid(analysisId)) {
    throw new ApiError(400, 'Invalid AI analysis ID')
  }

  const analysis = await AIAnalysis.findOneAndDelete({ _id: analysisId, user: userId })
  if (!analysis) {
    throw new ApiError(404, 'AI analysis not found')
  }
}

export { listAnalyses, getSummary, deleteAnalysis }