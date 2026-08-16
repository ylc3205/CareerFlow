import express from 'express'
import * as jobController from '../controllers/job.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import { createJobSchema, updateJobSchema } from '../validators/job.validator.js'

const router = express.Router()

router.use(protect)

router.get('/', jobController.listJobs)
router.post('/', validate(createJobSchema), jobController.createJob)
router.get('/:id', jobController.getJob)
router.patch('/:id', validate(updateJobSchema), jobController.updateJob)
router.delete('/:id', jobController.deleteJob)

export default router
