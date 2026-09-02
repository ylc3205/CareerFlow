import mongoose from 'mongoose'
import CareerDirection from '../models/careerDirection.model.js'
import ApiError from '../utils/ApiError.js'

const validateObjectId = (id, message = 'Invalid career direction ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, message)
  }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeQuery = (query = {}) => {
  const { search, page, limit } = query

  let searchFilter
  if (search !== undefined && String(search).trim() !== '') {
    const regex = new RegExp(escapeRegExp(String(search).trim()), 'i')
    searchFilter = { title: regex }
  }

  const parsedPage = parseInt(page, 10)
  const parsedLimit = parseInt(limit, 10)

  const normalizedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const normalizedLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20

  return { searchFilter, page: normalizedPage, limit: normalizedLimit }
}

const listCareerDirections = async (userId, query = {}) => {
  const { searchFilter, page, limit } = normalizeQuery(query)

  const filter = { user: userId }
  if (searchFilter) Object.assign(filter, searchFilter)

  const total = await CareerDirection.countDocuments(filter)
  const careerDirections = await CareerDirection.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  return {
    careerDirections,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

const getCareerDirectionById = async (userId, directionId) => {
  validateObjectId(directionId)
  const direction = await CareerDirection.findOne({ _id: directionId, user: userId })
  if (!direction) {
    throw new ApiError(404, 'Career direction not found')
  }
  return direction
}

const createCareerDirection = async (userId, data) => {
  const direction = await CareerDirection.create({ ...data, user: userId })
  return direction
}

const updateCareerDirection = async (userId, directionId, data) => {
  validateObjectId(directionId)
  const direction = await CareerDirection.findOneAndUpdate(
    { _id: directionId, user: userId },
    { $set: data },
    { new: true, runValidators: true }
  )
  if (!direction) {
    throw new ApiError(404, 'Career direction not found')
  }
  return direction
}

const deleteCareerDirection = async (userId, directionId) => {
  validateObjectId(directionId)
  const direction = await CareerDirection.findOneAndDelete({ _id: directionId, user: userId })
  if (!direction) {
    throw new ApiError(404, 'Career direction not found')
  }
}

export {
  listCareerDirections,
  getCareerDirectionById,
  createCareerDirection,
  updateCareerDirection,
  deleteCareerDirection,
}
