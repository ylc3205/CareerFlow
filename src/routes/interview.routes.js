import express from 'express'
import * as interviewController from '../controllers/interview.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import {
  createInterviewSchema,
  updateInterviewSchema,
} from '../validators/interview.validator.js'

const router = express.Router()

router.use(protect)

router.get('/', interviewController.listInterviews)
router.post('/', validate(createInterviewSchema), interviewController.createInterview)
router.get('/:id', interviewController.getInterview)
router.patch('/:id', validate(updateInterviewSchema), interviewController.updateInterview)
router.delete('/:id', interviewController.deleteInterview)

export default router
