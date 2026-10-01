import express from 'express'
import mongoose from 'mongoose'
import { getShutdownStatus } from '../utils/lifecycle.js'

const router = express.Router()

// Liveness probe: returns 200 while Node.js process is alive
router.get('/health/live', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    message: 'Process is alive',
    timestamp: new Date().toISOString(),
  })
})

// Readiness probe: returns 200 when DB is connected and server is not shutting down, 503 otherwise
router.get('/health/ready', (req, res) => {
  const isShuttingDown = getShutdownStatus()
  const isDbConnected = mongoose.connection.readyState === 1

  if (isShuttingDown || !isDbConnected) {
    return res.status(503).json({
      success: false,
      status: 'unavailable',
      db: isDbConnected ? 'connected' : 'disconnected',
      shuttingDown: isShuttingDown,
      message: isShuttingDown ? 'Server is shutting down' : 'Database is disconnected',
      timestamp: new Date().toISOString(),
    })
  }

  res.status(200).json({
    success: true,
    status: 'ready',
    db: 'connected',
    message: 'Server is ready to receive traffic',
    timestamp: new Date().toISOString(),
  })
})

// Comprehensive health endpoint (backward-compatible)
router.get('/health', (req, res) => {
  const isShuttingDown = getShutdownStatus()
  const isDbConnected = mongoose.connection.readyState === 1

  if (isShuttingDown || !isDbConnected) {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      db: isDbConnected ? 'connected' : 'disconnected',
      shuttingDown: isShuttingDown,
      message: isShuttingDown ? 'Server is shutting down' : 'Database is disconnected',
      timestamp: new Date().toISOString(),
    })
  }

  res.status(200).json({
    success: true,
    status: 'healthy',
    db: 'connected',
    message: 'CareerFlow API is operational',
    timestamp: new Date().toISOString(),
  })
})

export default router
