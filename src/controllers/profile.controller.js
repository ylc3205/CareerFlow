import catchAsync from '../utils/catchAsync.js'
import * as profileService from '../services/profile.service.js'

const getProfile = catchAsync(async (req, res) => {
  const profile = await profileService.getProfile(req.user.userId)

  res.status(200).json({
    success: true,
    data: { profile },
  })
})

const updateProfile = catchAsync(async (req, res) => {
  const profile = await profileService.updateProfile(req.user.userId, req.body)

  res.status(200).json({
    success: true,
    data: { profile },
  })
})

export { getProfile, updateProfile }
