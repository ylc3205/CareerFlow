import catchAsync from '../utils/catchAsync.js'
import * as interviewService from '../services/interview.service.js'

const listInterviews = catchAsync(async (req, res) => {
  const { interviews, pagination } = await interviewService.listInterviews(
    req.user.userId,
    req.query
  )

  res.status(200).json({
    success: true,
    data: { interviews, pagination },
  })
})

const getInterview = catchAsync(async (req, res) => {
  const interview = await interviewService.getInterview(
    req.user.userId,
    req.params.id
  )

  res.status(200).json({
    success: true,
    data: { interview },
  })
})

const createInterview = catchAsync(async (req, res) => {
  const interview = await interviewService.createInterview(
    req.user.userId,
    req.body
  )

  res.status(201).json({
    success: true,
    data: { interview },
  })
})

const updateInterview = catchAsync(async (req, res) => {
  const interview = await interviewService.updateInterview(
    req.user.userId,
    req.params.id,
    req.body
  )

  res.status(200).json({
    success: true,
    data: { interview },
  })
})

const deleteInterview = catchAsync(async (req, res) => {
  await interviewService.deleteInterview(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    message: 'Interview deleted successfully',
  })
})

export {
  listInterviews,
  getInterview,
  createInterview,
  updateInterview,
  deleteInterview,
}
