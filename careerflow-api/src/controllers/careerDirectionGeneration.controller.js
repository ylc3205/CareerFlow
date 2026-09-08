import catchAsync from '../utils/catchAsync.js'
import { generateCareerDirection } from '../services/careerDirectionGeneration.service.js'

const generateCareerDirectionController = catchAsync(async (req, res) => {
  const { generatedDirection, metadata } = await generateCareerDirection(
    req.user.userId,
    req.body
  )

  res.status(200).json({
    success: true,
    data: {
      generatedDirection,
      metadata,
    },
  })
})

export { generateCareerDirectionController }