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

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    message,
  })
}

export { notFound, errorHandler }
