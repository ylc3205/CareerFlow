import mongoose from 'mongoose'
import Job, { JOB_STATUSES } from '../models/job.model.js'
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

  const filter = { user: userId }
  if (statusFilter) filter.status = statusFilter
  if (searchFilter) Object.assign(filter, searchFilter)

  const total = await Job.countDocuments(filter)
  const jobs = await Job.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

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
  const job = await Job.findOne({ _id: jobId, user: userId })
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
      { _id: jobId, user: userId },
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
  const job = await Job.findOneAndDelete({ _id: jobId, user: userId })
  if (!job) {
    throw new ApiError(404, 'Job not found')
  }
}

export { listJobs, getJob, createJob, updateJob, deleteJob }
