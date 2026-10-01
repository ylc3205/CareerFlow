import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import profileRoutes from './routes/profile.routes.js'
import resumeRoutes from './routes/resume.routes.js'
import careerDirectionRoutes from './routes/careerDirection.routes.js'
import jobRoutes from './routes/job.routes.js'
import applicationRoutes from './routes/application.routes.js'
import interviewRoutes from './routes/interview.routes.js'
import matchRoutes from './routes/match.routes.js'
import aiAnalysisRoutes from './routes/aiAnalysis.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import helmet from 'helmet'
import ApiError from './utils/ApiError.js'
import { notFound, errorHandler } from './middlewares/error.middleware.js'

export const parseAllowedOrigins = (raw) => {
  if (!raw) return ['http://localhost:5173']
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

export const getCorsOriginDelegate = (rawOrigins = process.env.CLIENT_URL) => {
  const allowedOrigins = parseAllowedOrigins(rawOrigins)
  return (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new ApiError(403, 'Not allowed by CORS'))
  }
}

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => getCorsOriginDelegate()(origin, callback),
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())

app.use('/api', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/resume', resumeRoutes)
app.use('/api/career-directions', careerDirectionRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/jobs/:id/match', matchRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/ai-analyses', aiAnalysisRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
