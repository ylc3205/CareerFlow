import catchAsync from '../utils/catchAsync.js'
import * as matchService from '../services/match.service.js'

const generateMatch = catchAsync(async (req, res) => {
  const match = await matchService.generateMatch(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    data: { match },
  })
})

export { generateMatch }
