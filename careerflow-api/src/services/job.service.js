import mongoose from 'mongoose'
import Job, { JOB_STATUSES } from '../models/job.model.js'
import Application from '../models/application.model.js'
import AIAnalysis from '../models/aiAnalysis.model.js'
import CareerDirection from '../models/careerDirection.model.js'
import ApiError from '../utils/ApiError.js'

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid job ID')
  }
}

// Normalize sourceUrl: '' to undefined so it is excluded from the partial index.
// The $type:'string' partialFilterExpression only indexes actual string values;
// removing the key entirely ensures no index entry is created for empty URLs.
const normalizeSourceUrl = (data) => {
  if (data.sourceUrl === '') {
    delete data.sourceUrl
  }
  return data
}

const handleE11000 = (err) => {
  if (err.code === 11000) {
    throw new ApiError(409, 'You have already saved a job from this URL')
  }
  throw err
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeQuery = (query = {}) => {
  const { status, search, page, limit } = query

  let statusFilter
  if (status !== undefined && status !== '') {
    if (!JOB_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid status filter')
    }
    statusFilter = status
  }

  let searchFilter
  if (search !== undefined && String(search).trim() !== '') {
    const regex = new RegExp(escapeRegExp(String(search).trim()), 'i')
    searchFilter = { $or: [{ title: regex }, { company: regex }] }
  }

  const parsedPage = parseInt(page, 10)
  const parsedLimit = parseInt(limit, 10)

  const normalizedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const normalizedLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20

  return { statusFilter, searchFilter, page: normalizedPage, limit: normalizedLimit }
}

const listJobs = async (userId, query = {}) => {
  const { statusFilter, searchFilter, page, limit } = normalizeQuery(query)

  const filter = { user: userId, isDeleted: { $ne: true } }
  if (statusFilter) filter.status = statusFilter
  if (searchFilter) Object.assign(filter, searchFilter)

  const total = await Job.countDocuments(filter)
  let jobsQuery = Job.find(filter)
  if (typeof jobsQuery.select === 'function') {
    jobsQuery = jobsQuery.select('-description -requirements -responsibilities -notes')
  }
  jobsQuery = jobsQuery
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
  const jobs = typeof jobsQuery.lean === 'function' ? await jobsQuery.lean() : await jobsQuery

  return {
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

const getJob = async (userId, jobId) => {
  validateObjectId(jobId)
  const job = await Job.findOne({ _id: jobId, user: userId, isDeleted: { $ne: true } })
  if (!job) {
    throw new ApiError(404, 'Job not found')
  }
  return job
}

const createJob = async (userId, data) => {
  normalizeSourceUrl(data)
  try {
    const job = await Job.create({ ...data, user: userId })
    return job
  } catch (err) {
    handleE11000(err)
  }
}

const updateJob = async (userId, jobId, data) => {
  validateObjectId(jobId)
  // Clearing sourceUrl: '' is normalized away by normalizeSourceUrl, so a plain
  // $set would silently keep the old value. $unset it so the stored value is
  // actually removed (and the partial unique index stays clean).
  const unset = {}
  if (data.sourceUrl === '') {
    unset.sourceUrl = 1
    delete data.sourceUrl
  }
  normalizeSourceUrl(data)
  try {
    const job = await Job.findOneAndUpdate(
      { _id: jobId, user: userId, isDeleted: { $ne: true } },
      { $set: data, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    )
    if (!job) {
      throw new ApiError(404, 'Job not found')
    }
    return job
  } catch (err) {
    if (err instanceof ApiError) throw err
    handleE11000(err)
  }
}

const deleteJob = async (userId, jobId) => {
  validateObjectId(jobId)
  const job = await Job.findOne({ _id: jobId, user: userId, isDeleted: { $ne: true } })
  if (!job) {
    throw new ApiError(404, 'Job not found')
  }

  // SOFT DELETE: Logically mark the job as deleted without removing historical records.
  job.isDeleted = true
  job.deletedAt = new Date()
  await job.save()
}

const getJobContext = async (userId, jobId) => {
  validateObjectId(jobId)

  const [job, application, match, careerDirections] = await Promise.all([
    Job.findOne({ _id: jobId, user: userId, isDeleted: { $ne: true } }).lean(),
    Application.findOne({ user: userId, job: jobId }).select('_id status appliedAt').lean(),
    AIAnalysis.findOne({ user: userId, job: jobId }).select('-user -__v').lean(),
    CareerDirection.find({ user: userId }).select('_id title').sort({ createdAt: -1 }).lean(),
  ])

  if (!job) {
    throw new ApiError(404, 'Job not found')
  }

  return {
    job,
    application: application || null,
    match: match || null,
    careerDirections: careerDirections || [],
  }
}

export { listJobs, getJob, createJob, updateJob, deleteJob, getJobContext }
