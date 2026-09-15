import mongoose from 'mongoose'
import AIAnalysis from '../models/aiAnalysis.model.js'
import Job from '../models/job.model.js'
import ApiError from '../utils/ApiError.js'

// Fields populated on job when returning analyses.
// Excludes: user (internal ownership), description, requirements, etc.
const JOB_POPULATE_SELECT = '_id title company'

const listAnalyses = async (userId) => {
  const analyses = await AIAnalysis.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('job', JOB_POPULATE_SELECT)
    .select('-user -model -provider -__v')
  return analyses
}

const jobRef = (analysis) => ({
  job: analysis.job ? { _id: analysis.job._id, title: analysis.job.title, company: analysis.job.company } : null,
  matchScore: analysis.matchScore,
})

const getSummary = async (userId) => {
  const analyses = await AIAnalysis.find({ user: userId }).populate('job', JOB_POPULATE_SELECT)

  const totalAnalyses = analyses.length
  const averageMatchScore =
    totalAnalyses === 0
      ? 0
      : Math.round((analyses.reduce((sum, a) => sum + a.matchScore, 0) / totalAnalyses) * 10) / 10

  let highestMatch = null
  let lowestMatch = null
  for (const analysis of analyses) {
    if (!highestMatch || analysis.matchScore > highestMatch.matchScore) {
      highestMatch = jobRef(analysis)
    }
    if (!lowestMatch || analysis.matchScore < lowestMatch.matchScore) {
      lowestMatch = jobRef(analysis)
    }
  }

  const matchedJobIds = new Set(analyses.map((a) => String(a.job?._id)))
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