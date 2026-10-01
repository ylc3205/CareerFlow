import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'
import connectDB from './config/db.js'
import { createShutdownHandler } from './utils/lifecycle.js'

const PORT = Number(process.env.PORT) || 5000
const HOST = process.env.HOST || '0.0.0.0'

const start = async () => {
  try {
    await connectDB()
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on port ${PORT} (host: ${HOST})`)
    })

    const shutdown = createShutdownHandler({
      server,
      mongooseInstance: mongoose,
      timeoutMs: 10000,
      exitFn: process.exit,
    })

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('unhandledRejection', (reason) => {
      console.error('[process] Unhandled Rejection:', reason)
      shutdown('unhandledRejection', 1)
    })
    process.on('uncaughtException', (err) => {
      console.error('[process] Uncaught Exception:', err)
      shutdown('uncaughtException', 1)
    })

    return server
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

start()

export default start
