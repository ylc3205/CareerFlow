import Profile from '../models/profile.model.js'
import ApiError from '../utils/ApiError.js'

const getProfile = async (userId) => {
  const profile = await Profile.findOne({ user: userId })
  if (!profile) {
    throw new ApiError(404, 'Profile not found')
  }
  return profile
}

const updateProfile = async (userId, data) => {
  const profile = await Profile.findOneAndUpdate(
    { user: userId },
    { $set: data },
    { new: true, runValidators: true }
  )
  if (!profile) {
    throw new ApiError(404, 'Profile not found')
  }
  return profile
}

export { getProfile, updateProfile }
