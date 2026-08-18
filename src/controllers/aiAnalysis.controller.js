import catchAsync from '../utils/catchAsync.js'
import * as aiAnalysisService from '../services/aiAnalysis.service.js'

const listAnalyses = catchAsync(async (req, res) => {
  const analyses = await aiAnalysisService.listAnalyses(req.user.userId)

  res.status(200).json({
    success: true,
    data: { analyses },
  })
})

const getSummary = catchAsync(async (req, res) => {
  const summary = await aiAnalysisService.getSummary(req.user.userId)

  res.status(200).json({
    success: true,
    data: { summary },
  })
})

const deleteAnalysis = catchAsync(async (req, res) => {
  await aiAnalysisService.deleteAnalysis(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    message: 'AI analysis deleted successfully',
  })
})

export { listAnalyses, getSummary, deleteAnalysis }