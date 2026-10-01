let isShuttingDown = false

export const getShutdownStatus = () => isShuttingDown

export const setShutdownStatus = (status = true) => {
  isShuttingDown = Boolean(status)
}

export const resetShutdownStatus = () => {
  isShuttingDown = false
}

export const createShutdownHandler = ({
  server,
  mongooseInstance,
  timeoutMs = 10000,
  exitFn = process.exit,
  log = console.log,
  errorLog = console.error,
} = {}) => {
  return async (signal, exitCode = 0) => {
    if (getShutdownStatus()) {
      return
    }
    setShutdownStatus(true)
    log(`[${signal}] Controlled shutdown initiated...`)

    const forceTimer = setTimeout(() => {
      errorLog(`[shutdown] Forced exit after ${timeoutMs}ms timeout`)
      exitFn(exitCode || 1)
    }, timeoutMs)
    if (forceTimer.unref) forceTimer.unref()

    const closeHttpServer = () =>
      new Promise((resolve) => {
        if (!server || typeof server.close !== 'function') {
          return resolve()
        }
        server.close((err) => {
          if (err) {
            errorLog('[shutdown] Error closing HTTP server:', err.message)
          } else {
            log('[shutdown] HTTP server closed')
          }
          resolve()
        })
      })

    const closeMongo = async () => {
      if (mongooseInstance && mongooseInstance.connection && mongooseInstance.connection.readyState) {
        try {
          await mongooseInstance.connection.close(false)
          log('[shutdown] MongoDB connection closed')
        } catch (err) {
          errorLog('[shutdown] Error closing MongoDB connection:', err.message)
        }
      }
    }

    try {
      await closeHttpServer()
      await closeMongo()
      clearTimeout(forceTimer)
      log('[shutdown] Graceful shutdown completed cleanly')
      exitFn(exitCode)
    } catch (err) {
      errorLog('[shutdown] Error during shutdown:', err.message)
      clearTimeout(forceTimer)
      exitFn(exitCode || 1)
    }
  }
}

