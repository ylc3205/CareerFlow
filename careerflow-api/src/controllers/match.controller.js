import catchAsync from '../utils/catchAsync.js'
import * as matchService from '../services/match.service.js'

const generateMatch = catchAsync(async (req, res) => {
  const careerDirectionId = req.body?.careerDirectionId
  const match = await matchService.generateMatch(req.user.userId, req.params.id, careerDirectionId)

  res.status(200).json({
    success: true,
    data: { match },
  })
})

export { generateMatch }
