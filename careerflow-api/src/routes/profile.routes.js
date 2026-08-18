import express from 'express'
import * as profileController from '../controllers/profile.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import { updateProfileSchema } from '../validators/profile.validator.js'

const router = express.Router()

router.use(protect)

router.get('/', profileController.getProfile)
router.patch('/', validate(updateProfileSchema), profileController.updateProfile)

export default router
