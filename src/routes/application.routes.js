import express from 'express'
import * as applicationController from '../controllers/application.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import {
  createApplicationSchema,
  updateApplicationSchema,
} from '../validators/application.validator.js'

const router = express.Router()

router.use(protect)

router.get('/', applicationController.listApplications)
router.post('/', validate(createApplicationSchema), applicationController.createApplication)
router.get('/:id', applicationController.getApplication)
router.patch('/:id', validate(updateApplicationSchema), applicationController.updateApplication)
router.delete('/:id', applicationController.deleteApplication)

export default router
