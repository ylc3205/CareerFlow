import express from 'express'
import * as resumeController from '../controllers/resume.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import { updateResumeSchema } from '../validators/resume.validator.js'

const router = express.Router()

router.use(protect)

router.get('/', resumeController.getResume)
router.patch('/', validate(updateResumeSchema), resumeController.updateResume)
router.delete('/', resumeController.deleteResume)

export default router
