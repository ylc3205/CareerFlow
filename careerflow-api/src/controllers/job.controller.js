import catchAsync from '../utils/catchAsync.js'
import * as jobService from '../services/job.service.js'

const listJobs = catchAsync(async (req, res) => {
  const { jobs, pagination } = await jobService.listJobs(req.user.userId, req.query)

  res.status(200).json({
    success: true,
    data: { jobs, pagination },
  })
})

const getJob = catchAsync(async (req, res) => {
  const job = await jobService.getJob(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    data: { job },
  })
})

const createJob = catchAsync(async (req, res) => {
  const job = await jobService.createJob(req.user.userId, req.body)

  res.status(201).json({
    success: true,
    data: { job },
  })
})

const updateJob = catchAsync(async (req, res) => {
  const job = await jobService.updateJob(req.user.userId, req.params.id, req.body)

  res.status(200).json({
    success: true,
    data: { job },
  })
})

const deleteJob = catchAsync(async (req, res) => {
  await jobService.deleteJob(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    message: 'Job deleted successfully',
  })
})

const getJobContext = catchAsync(async (req, res) => {
  const context = await jobService.getJobContext(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    data: context,
  })
})

export { listJobs, getJob, createJob, updateJob, deleteJob, getJobContext }
