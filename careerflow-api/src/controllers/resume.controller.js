import catchAsync from '../utils/catchAsync.js'
import * as resumeService from '../services/resume.service.js'

const getResume = catchAsync(async (req, res) => {
  const resume = await resumeService.getResume(req.user.userId)

  res.status(200).json({
    success: true,
    data: { resume },
  })
})

const updateResume = catchAsync(async (req, res) => {
  const resume = await resumeService.updateResume(req.user.userId, req.body)

  res.status(200).json({
    success: true,
    data: { resume },
  })
})

const uploadResume = catchAsync(async (req, res) => {
  const resume = await resumeService.uploadResume(req.user.userId, req.file)

  res.status(200).json({
    success: true,
    data: { resume },
  })
})

const parseResume = catchAsync(async (req, res) => {
  const { resume, draft } = await resumeService.parseResume(req.user.userId)

  res.status(200).json({
    success: true,
    data: { resume, draft },
  })
})

const confirmResume = catchAsync(async (req, res) => {
  const resume = await resumeService.confirmResume(req.user.userId, req.body)

  res.status(200).json({
    success: true,
    data: { resume },
  })
})

const discardDraft = catchAsync(async (req, res) => {
  const resume = await resumeService.discardDraft(req.user.userId)

  res.status(200).json({
    success: true,
    data: { resume },
  })
})

const deleteResume = catchAsync(async (req, res) => {
  await resumeService.deleteResume(req.user.userId)

  res.status(200).json({
    success: true,
    message: 'Resume deleted successfully',
  })
})

export { getResume, updateResume, uploadResume, parseResume, confirmResume, discardDraft, deleteResume }
