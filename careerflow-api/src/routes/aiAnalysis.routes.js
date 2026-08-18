import express from 'express'
import * as aiAnalysisController from '../controllers/aiAnalysis.controller.js'
import protect from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(protect)

router.get('/', aiAnalysisController.listAnalyses)
router.get('/summary', aiAnalysisController.getSummary)
router.delete('/:id', aiAnalysisController.deleteAnalysis)

export default router