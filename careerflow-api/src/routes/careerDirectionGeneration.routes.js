import express from 'express'
import { generateCareerDirectionController } from '../controllers/careerDirectionGeneration.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import { aiLimiter } from '../middlewares/rateLimiter.middleware.js'
import { generateCareerDirectionSchema } from '../validators/careerDirectionGeneration.validator.js'

const router = express.Router()

router.use(protect)

router.post('/', aiLimiter, validate(generateCareerDirectionSchema), generateCareerDirectionController)

export default router