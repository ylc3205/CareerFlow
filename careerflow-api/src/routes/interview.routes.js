import express from 'express'
import { z } from 'zod'
import * as interviewController from '../controllers/interview.controller.js'
import * as interviewPreparationController from '../controllers/interviewPreparation.controller.js'
import * as practiceSessionController from '../controllers/practiceSession.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import {
  createInterviewSchema,
  updateInterviewSchema,
} from '../validators/interview.validator.js'

const submitAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  answer: z.string().min(1, 'Answer is required').max(4000),
})

const router = express.Router()

router.use(protect)

router.get('/', interviewController.listInterviews)
router.post('/', validate(createInterviewSchema), interviewController.createInterview)
router.get('/:id', interviewController.getInterview)
router.patch('/:id', validate(updateInterviewSchema), interviewController.updateInterview)
router.delete('/:id', interviewController.deleteInterview)
router.get('/:id/preparation', interviewPreparationController.getPreparation)
router.post('/:id/preparation', interviewPreparationController.generatePreparation)

router.post('/:id/practice', practiceSessionController.createSession)
router.get('/:id/practice', practiceSessionController.listSessions)
router.get('/:id/practice/:pid', practiceSessionController.getSession)
router.post(
  '/:id/practice/:pid/answers',
  validate(submitAnswerSchema),
  practiceSessionController.submitAnswer
)
router.post('/:id/practice/:pid/complete', practiceSessionController.completeSession)
router.delete('/:id/practice/:pid', practiceSessionController.deleteSession)

export default router
