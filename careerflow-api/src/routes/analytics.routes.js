import express from 'express'
import * as analyticsController from '../controllers/analytics.controller.js'
import protect from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(protect)

router.get('/history', analyticsController.getHistory)
router.get('/dashboard', analyticsController.getDashboard)
router.get('/trends', analyticsController.getTrends)
router.get('/areas', analyticsController.getAreas)
router.get('/performance', analyticsController.getPerformance)

export default router