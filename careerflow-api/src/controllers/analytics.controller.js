import catchAsync from '../utils/catchAsync.js'
import * as analyticsService from '../services/analytics.service.js'

const getHistory = catchAsync(async (req, res) => {
  const { sessions, pagination } = await analyticsService.getHistory(req.user.userId, req.query)

  res.status(200).json({
    success: true,
    data: { sessions, pagination },
  })
})

const getDashboard = catchAsync(async (req, res) => {
  const dashboard = await analyticsService.getDashboard(req.user.userId)

  res.status(200).json({
    success: true,
    data: { dashboard },
  })
})

const getTrends = catchAsync(async (req, res) => {
  const trends = await analyticsService.getTrends(req.user.userId)

  res.status(200).json({
    success: true,
    data: { trends },
  })
})

const getAreas = catchAsync(async (req, res) => {
  const areas = await analyticsService.getAreas(req.user.userId, req.query)

  res.status(200).json({
    success: true,
    data: { areas },
  })
})

const getPerformance = catchAsync(async (req, res) => {
  const performance = await analyticsService.getPerformance(req.user.userId)

  res.status(200).json({
    success: true,
    data: { performance },
  })
})

const getApplicationPipeline = catchAsync(async (req, res) => {
  const pipeline = await analyticsService.getApplicationPipeline(req.user.userId)

  res.status(200).json({
    success: true,
    data: { pipeline },
  })
})

export { getHistory, getDashboard, getTrends, getAreas, getPerformance, getApplicationPipeline }