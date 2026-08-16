import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import profileRoutes from './routes/profile.routes.js'
import resumeRoutes from './routes/resume.routes.js'
import jobRoutes from './routes/job.routes.js'
import applicationRoutes from './routes/application.routes.js'
import interviewRoutes from './routes/interview.routes.js'
import matchRoutes from './routes/match.routes.js'
import aiAnalysisRoutes from './routes/aiAnalysis.routes.js'
import { notFound, errorHandler } from './middlewares/error.middleware.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/resume', resumeRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/jobs/:id/match', matchRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/ai-analyses', aiAnalysisRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
