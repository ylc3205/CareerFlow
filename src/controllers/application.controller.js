import catchAsync from '../utils/catchAsync.js'
import * as applicationService from '../services/application.service.js'

const listApplications = catchAsync(async (req, res) => {
  const { applications, pagination } = await applicationService.listApplications(
    req.user.userId,
    req.query
  )

  res.status(200).json({
    success: true,
    data: { applications, pagination },
  })
})

const getApplication = catchAsync(async (req, res) => {
  const application = await applicationService.getApplication(
    req.user.userId,
    req.params.id
  )

  res.status(200).json({
    success: true,
    data: { application },
  })
})

const createApplication = catchAsync(async (req, res) => {
  const application = await applicationService.createApplication(
    req.user.userId,
    req.body
  )

  res.status(201).json({
    success: true,
    data: { application },
  })
})

const updateApplication = catchAsync(async (req, res) => {
  const application = await applicationService.updateApplication(
    req.user.userId,
    req.params.id,
    req.body
  )

  res.status(200).json({
    success: true,
    data: { application },
  })
})

const deleteApplication = catchAsync(async (req, res) => {
  await applicationService.deleteApplication(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    message: 'Application deleted successfully',
  })
})

export {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
}
