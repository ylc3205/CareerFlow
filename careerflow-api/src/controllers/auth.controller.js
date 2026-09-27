import catchAsync from '../utils/catchAsync.js'
import * as authService from '../services/auth.service.js'

const register = catchAsync(async (req, res) => {
  const { email, password } = req.body

  const { user, accessToken, refreshToken } = await authService.register(email, password)

  res.cookie(authService.REFRESH_COOKIE_NAME, refreshToken, authService.getCookieOptions())

  res.status(201).json({
    success: true,
    data: { user, accessToken },
  })
})

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body

  const { user, accessToken, refreshToken } = await authService.login(email, password)

  res.cookie(authService.REFRESH_COOKIE_NAME, refreshToken, authService.getCookieOptions())

  res.status(200).json({
    success: true,
    data: { user, accessToken },
  })
})

const refresh = catchAsync(async (req, res) => {
  const token = req.cookies[authService.REFRESH_COOKIE_NAME]

  const { accessToken } = await authService.refresh(token)

  res.status(200).json({
    success: true,
    data: { accessToken },
  })
})

const logout = catchAsync(async (req, res) => {
  res.clearCookie(authService.REFRESH_COOKIE_NAME, authService.getCookieOptions())

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  })
})

const me = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user.userId)

  res.status(200).json({
    success: true,
    data: { user },
  })
})

export { register, login, refresh, logout, me }
