import ApiError from '../utils/ApiError.js'
import { verifyAccessToken } from '../utils/jwt.js'

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Not authenticated'))
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyAccessToken(token)
    req.user = { userId: decoded.userId }
    next()
  } catch {
    return next(new ApiError(401, 'Invalid or expired access token'))
  }
}

export default protect
