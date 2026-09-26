import mongoose from 'mongoose'
import Interview, { INTERVIEW_STATUSES } from '../models/interview.model.js'
import Application from '../models/application.model.js'
import InterviewPreparation from '../models/interviewPreparation.model.js'
import PracticeSession from '../models/practiceSession.model.js'
import Job from '../models/job.model.js'
import ApiError from '../utils/ApiError.js'

const validateObjectId = (id, message = 'Invalid ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, message)
  }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const listInterviews = async (userId, query = {}) => {
  const { status, search, application, page, limit } = query

  let statusFilter
  if (status !== undefined && status !== '') {
    if (!INTERVIEW_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid status filter')
    }
    statusFilter = status
  }

  if (application) {
    validateObjectId(application, 'Invalid application ID')
  }

  const parsedPage = parseInt(page, 10)
  const parsedLimit = parseInt(limit, 10)

  const normalizedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const normalizedLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20

  let searchApplicationIds = null
  if (search !== undefined && String(search).trim() !== '') {
    const regex = new RegExp(escapeRegExp(String(search).trim()), 'i')
    const matchingJobs = await Job.find({
      user: userId,
      isDeleted: { $ne: true },
      $or: [{ title: regex }, { company: regex }],
    }).select('_id')
    const jobIds = matchingJobs.map((job) => job._id)
    if (jobIds.length === 0) {
      return {
        interviews: [],
        pagination: { page: normalizedPage, limit: normalizedLimit, total: 0, totalPages: 0 },
      }
    }
    const matchingApplications = await Application.find({
      user: userId,
      job: { $in: jobIds },
    }).select('_id')
    searchApplicationIds = matchingApplications.map((application) => application._id)
    if (searchApplicationIds.length === 0) {
      return {
        interviews: [],
        pagination: { page: normalizedPage, limit: normalizedLimit, total: 0, totalPages: 0 },
      }
    }
  }

  const filter = { user: userId }
  if (statusFilter) filter.status = statusFilter
  if (application) filter.application = application
  if (searchApplicationIds && application) {
    if (!searchApplicationIds.some((id) => String(id) === String(application))) {
      return {
        interviews: [],
        pagination: { page: normalizedPage, limit: normalizedLimit, total: 0, totalPages: 0 },
      }
    }
  } else if (searchApplicationIds) {
    filter.application = { $in: searchApplicationIds }
  }

  const total = await Interview.countDocuments(filter)
  const interviews = await Interview.find(filter)
    .sort({ createdAt: -1 })
    .skip((normalizedPage - 1) * normalizedLimit)
    .limit(normalizedLimit)
    .populate({
      path: 'application',
      select: 'job status',
      populate: {
        path: 'job',
        select: 'title company',
      },
    })

  return {
    interviews,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages: Math.ceil(total / normalizedLimit),
    },
  }
}

const getInterview = async (userId, interviewId) => {
  validateObjectId(interviewId, 'Invalid interview ID')
  
  const interview = await Interview.findOne({
    _id: interviewId,
    user: userId,
  }).populate({
    path: 'application',
    select: 'job status',
    populate: {
      path: 'job',
      select: 'title company',
    },
  })

  if (!interview) {
    throw new ApiError(404, 'Interview not found')
  }

  return interview
}

const createInterview = async (userId, data) => {
  // Application ID format already validated by Zod, but guard again
  validateObjectId(data.application, 'Invalid application ID')

  // Verify the application exists AND belongs to the user
  const application = await Application.findOne({
    _id: data.application,
    user: userId,
  })

  if (!application) {
    throw new ApiError(404, 'Application not found')
  }

  const interview = await Interview.create({ ...data, user: userId })
  return interview
}

const updateInterview = async (userId, interviewId, data) => {
  validateObjectId(interviewId, 'Invalid interview ID')

  const interview = await Interview.findOneAndUpdate(
    { _id: interviewId, user: userId },
    { $set: data },
    { new: true, runValidators: true }
  ).populate({
    path: 'application',
    select: 'job status',
    populate: {
      path: 'job',
      select: 'title company',
    },
  })

  if (!interview) {
    throw new ApiError(404, 'Interview not found')
  }

  return interview
}

const deleteInterview = async (userId, interviewId) => {
  validateObjectId(interviewId, 'Invalid interview ID')

  const interview = await Interview.findOne({ _id: interviewId, user: userId })
  if (!interview) {
    throw new ApiError(404, 'Interview not found')
  }

  // CASCADE: Delete all children owned by this user before removing the Interview.
  // This prevents orphaned PracticeSessions from being counted by analytics.
  await Promise.all([
    InterviewPreparation.deleteMany({ user: userId, interview: interviewId }),
    PracticeSession.deleteMany({ user: userId, interview: interviewId }),
  ])

  await interview.deleteOne()
}

export {
  listInterviews,
  getInterview,
  createInterview,
  updateInterview,
  deleteInterview,
}
