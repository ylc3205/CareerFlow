import mongoose from 'mongoose'
import Application, { APPLICATION_STATUSES } from '../models/application.model.js'
import Job from '../models/job.model.js'
import Interview from '../models/interview.model.js'
import InterviewPreparation from '../models/interviewPreparation.model.js'
import PracticeSession from '../models/practiceSession.model.js'
import ApiError from '../utils/ApiError.js'
import { runInTransaction } from '../utils/transaction.js'

// Fields populated on job when returning applications.
// Excludes: description, requirements, responsibilities, salary, notes,
// user (internal ownership), __v, postedAt, deadline — not needed for tracking view.
const JOB_POPULATE_SELECT =
  '_id title company location employmentType workplaceType skills source sourceUrl'

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid application ID')
  }
}

const handleE11000 = (err) => {
  if (err.code === 11000) {
    throw new ApiError(409, 'You have already applied to this job')
  }
  throw err
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const listApplications = async (userId, query = {}) => {
  const { status, search, job, page, limit } = query

  let statusFilter
  if (status !== undefined && status !== '') {
    if (!APPLICATION_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid status filter')
    }
    statusFilter = status
  }

  if (job) {
    if (!mongoose.Types.ObjectId.isValid(job)) {
      throw new ApiError(400, 'Invalid job ID')
    }
  }

  const parsedPage = parseInt(page, 10)
  const parsedLimit = parseInt(limit, 10)

  const normalizedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const normalizedLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20

  let searchJobIds = null
  if (search !== undefined && String(search).trim() !== '') {
    const regex = new RegExp(escapeRegExp(String(search).trim()), 'i')
    const matchingJobsQuery = Job.find({
      user: userId,
      isDeleted: { $ne: true },
      $or: [{ title: regex }, { company: regex }],
    }).select('_id')
    const matchingJobs =
      typeof matchingJobsQuery.lean === 'function'
        ? await matchingJobsQuery.lean()
        : await matchingJobsQuery
    searchJobIds = matchingJobs.map((job) => job._id)
    if (searchJobIds.length === 0) {
      return {
        applications: [],
        pagination: { page: normalizedPage, limit: normalizedLimit, total: 0, totalPages: 0 },
      }
    }
  }

  const filter = { user: userId }
  if (statusFilter) filter.status = statusFilter
  if (job) filter.job = job
  if (searchJobIds) {
    if (job) {
      if (!searchJobIds.some((id) => String(id) === String(job))) {
        return {
          applications: [],
          pagination: { page: normalizedPage, limit: normalizedLimit, total: 0, totalPages: 0 },
        }
      }
    } else {
      filter.job = { $in: searchJobIds }
    }
  }

  const total = await Application.countDocuments(filter)
  let applicationsQuery = Application.find(filter)
  if (typeof applicationsQuery.select === 'function') {
    applicationsQuery = applicationsQuery.select('-coverLetter -notes')
  }
  applicationsQuery = applicationsQuery
    .sort({ createdAt: -1 })
    .skip((normalizedPage - 1) * normalizedLimit)
    .limit(normalizedLimit)
    .populate('job', JOB_POPULATE_SELECT)
  const applications =
    typeof applicationsQuery.lean === 'function'
      ? await applicationsQuery.lean()
      : await applicationsQuery

  return {
    applications,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages: Math.ceil(total / normalizedLimit),
    },
  }
}

const getApplication = async (userId, applicationId) => {
  validateObjectId(applicationId)
  const application = await Application.findOne({
    _id: applicationId,
    user: userId,
  }).populate('job', JOB_POPULATE_SELECT)
  if (!application) {
    throw new ApiError(404, 'Application not found')
  }
  return application
}

const createApplication = async (userId, data) => {
  // 1. Validate job ObjectId format (already validated by Zod, but guard here too)
  if (!mongoose.Types.ObjectId.isValid(data.job)) {
    throw new ApiError(400, 'Invalid job ID')
  }

  // 2. Verify job exists, belongs to the authenticated user, and is not deleted.
  //    A user cannot apply to another user's job or a deleted job.
  const job = await Job.findOne({ _id: data.job, user: userId, isDeleted: { $ne: true } })
  if (!job) {
    throw new ApiError(404, 'Job not found')
  }

  // 3. Create the application (auto-set appliedAt if not explicitly provided)
  try {
    const payload = {
      ...data,
      user: userId,
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
    }
    const application = await Application.create(payload)
    return application
  } catch (err) {
    handleE11000(err)
  }
}

const updateApplication = async (userId, applicationId, data) => {
  validateObjectId(applicationId)
  // `data` has already been stripped by Zod — `user` and `job` cannot be present.
  try {
    const application = await Application.findOneAndUpdate(
      { _id: applicationId, user: userId },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('job', JOB_POPULATE_SELECT)
    if (!application) {
      throw new ApiError(404, 'Application not found')
    }
    return application
  } catch (err) {
    if (err instanceof ApiError) throw err
    handleE11000(err)
  }
}

const deleteApplication = async (userId, applicationId) => {
  validateObjectId(applicationId)

  await runInTransaction(async (session) => {
    const appQuery = Application.findOne({
      _id: applicationId,
      user: userId,
    })
    const application =
      session && typeof appQuery.session === 'function'
        ? await appQuery.session(session)
        : await appQuery

    if (!application) {
      throw new ApiError(404, 'Application not found')
    }

    // CASCADE: Remove child Interviews and their own children (Preparation + PracticeSessions).
    const findInterviewsQuery = Interview.find({ user: userId, application: applicationId }).select('_id')
    const interviews =
      session && typeof findInterviewsQuery.session === 'function'
        ? await findInterviewsQuery.session(session)
        : await findInterviewsQuery

    if (interviews.length > 0) {
      const interviewIds = interviews.map((i) => i._id)
      const prepFilter = { user: userId, interview: { $in: interviewIds } }
      const sessFilter = { user: userId, interview: { $in: interviewIds } }
      const intFilter = { _id: { $in: interviewIds }, user: userId }

      if (session) {
        await Promise.all([
          InterviewPreparation.deleteMany(prepFilter, { session }),
          PracticeSession.deleteMany(sessFilter, { session }),
          Interview.deleteMany(intFilter, { session }),
        ])
      } else {
        await Promise.all([
          InterviewPreparation.deleteMany(prepFilter),
          PracticeSession.deleteMany(sessFilter),
          Interview.deleteMany(intFilter),
        ])
      }
    }

    if (session) {
      await application.deleteOne({ session })
    } else {
      await application.deleteOne()
    }
  })
}

export {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
}
