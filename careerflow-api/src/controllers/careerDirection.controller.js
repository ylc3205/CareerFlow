import catchAsync from '../utils/catchAsync.js'
import * as careerDirectionService from '../services/careerDirection.service.js'

const listCareerDirections = catchAsync(async (req, res) => {
  const { careerDirections, pagination } = await careerDirectionService.listCareerDirections(
    req.user.userId,
    req.query
  )

  res.status(200).json({
    success: true,
    data: { careerDirections, pagination },
  })
})

const getCareerDirection = catchAsync(async (req, res) => {
  const careerDirection = await careerDirectionService.getCareerDirectionById(
    req.user.userId,
    req.params.id
  )

  res.status(200).json({
    success: true,
    data: { careerDirection },
  })
})

const createCareerDirection = catchAsync(async (req, res) => {
  const careerDirection = await careerDirectionService.createCareerDirection(
    req.user.userId,
    req.body
  )

  res.status(201).json({
    success: true,
    data: { careerDirection },
  })
})

const updateCareerDirection = catchAsync(async (req, res) => {
  const careerDirection = await careerDirectionService.updateCareerDirection(
    req.user.userId,
    req.params.id,
    req.body
  )

  res.status(200).json({
    success: true,
    data: { careerDirection },
  })
})

const deleteCareerDirection = catchAsync(async (req, res) => {
  await careerDirectionService.deleteCareerDirection(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    message: 'Career direction deleted successfully',
  })
})

export {
  listCareerDirections,
  getCareerDirection,
  createCareerDirection,
  updateCareerDirection,
  deleteCareerDirection,
}
