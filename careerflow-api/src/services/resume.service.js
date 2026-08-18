import Resume from '../models/resume.model.js'
import ApiError from '../utils/ApiError.js'

const getResume = async (userId) => {
  const resume = await Resume.findOne({ user: userId })
  if (!resume) {
    throw new ApiError(404, 'Resume not found')
  }
  return resume
}

const updateResume = async (userId, data) => {
  const resume = await Resume.findOneAndUpdate(
    { user: userId },
    { $set: data },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
  return resume
}

const deleteResume = async (userId) => {
  const resume = await Resume.findOneAndDelete({ user: userId })
  if (!resume) {
    throw new ApiError(404, 'Resume not found')
  }
}

export { getResume, updateResume, deleteResume }
