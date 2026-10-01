const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

const errorHandler = (err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    const statusCode = 400
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large. Maximum size is ${process.env.RESUME_MAX_SIZE_MB || 10}MB.`
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Unexpected file field. Expected a single "file".'
          : 'File upload failed'
    return res.status(statusCode).json({ success: false, message })
  }

  if (err && err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource identifier',
    })
  }

  const statusCode = err.statusCode || 500
  const isProduction = process.env.NODE_ENV === 'production'

  let message = err.message || 'Internal Server Error'

  if (statusCode >= 500) {
    console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.originalUrl}:`, err)
    if (isProduction && !err.isOperational) {
      message = 'Internal Server Error'
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
  })
}

export { notFound, errorHandler }
