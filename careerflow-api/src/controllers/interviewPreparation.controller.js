import catchAsync from '../utils/catchAsync.js'
import * as interviewPreparationService from '../services/interviewPreparation.service.js'

const generatePreparation = catchAsync(async (req, res) => {
  const preparation = await interviewPreparationService.generatePreparation(
    req.user.userId,
    req.params.id
  )

  res.status(200).json({
    success: true,
    data: { preparation },
  })
})

export { generatePreparation }