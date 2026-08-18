import User from '../models/user.model.js'
import Profile from '../models/profile.model.js'
import ApiError from '../utils/ApiError.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'

const REFRESH_COOKIE_NAME = 'refreshToken'

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
})

const register = async (email, password) => {
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new ApiError(409, 'Email is already in use')
  }

  const user = await User.create({ email, password })

  try {
    await Profile.create({ user: user._id })
  } catch (err) {
    await User.findByIdAndDelete(user._id)
    throw new ApiError(500, 'Registration failed. Please try again.')
  }

  const accessToken = signAccessToken(user._id)
  const refreshToken = signRefreshToken(user._id)

  return { user: user.toSafeObject(), accessToken, refreshToken }
}

const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+password')
  if (!user) {
    throw new ApiError(401, 'Invalid credentials')
  }

  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials')
  }

  const accessToken = signAccessToken(user._id)
  const refreshToken = signRefreshToken(user._id)

  return { user: user.toSafeObject(), accessToken, refreshToken }
}

const refresh = async (token) => {
  if (!token) {
    throw new ApiError(401, 'No refresh token provided')
  }

  let decoded
  try {
    decoded = verifyRefreshToken(token)
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token')
  }

  const user = await User.findById(decoded.userId)
  if (!user) {
    throw new ApiError(401, 'User no longer exists')
  }

  const accessToken = signAccessToken(user._id)
  return { accessToken }
}

const getMe = async (userId) => {
  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(401, 'User no longer exists')
  }
  return user.toSafeObject()
}

export { register, login, refresh, getMe, REFRESH_COOKIE_NAME, getCookieOptions }
