import express from 'express'
import * as resumeController from '../controllers/resume.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import { uploadResumeFile } from '../middlewares/upload.middleware.js'
import { aiLimiter } from '../middlewares/rateLimiter.middleware.js'
import { updateResumeSchema, confirmResumeSchema } from '../validators/resume.validator.js'

const router = express.Router()

router.use(protect)

router.get('/', resumeController.getResume)
router.patch('/', validate(updateResumeSchema), resumeController.updateResume)
router.delete('/', resumeController.deleteResume)

router.post('/upload', uploadResumeFile, resumeController.uploadResume)
router.post('/parse', aiLimiter, resumeController.parseResume)
router.post('/confirm', validate(confirmResumeSchema), resumeController.confirmResume)
router.post('/discard', resumeController.discardDraft)

export default router