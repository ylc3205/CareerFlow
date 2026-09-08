import express from 'express'
import * as careerDirectionController from '../controllers/careerDirection.controller.js'
import generateRoutes from './careerDirectionGeneration.routes.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import {
  createCareerDirectionSchema,
  updateCareerDirectionSchema,
} from '../validators/careerDirection.validator.js'

const router = express.Router()

router.use(protect)

router.get('/', careerDirectionController.listCareerDirections)
router.post('/', validate(createCareerDirectionSchema), careerDirectionController.createCareerDirection)
router.use('/generate', generateRoutes)
router.get('/:id', careerDirectionController.getCareerDirection)
router.patch(
  '/:id',
  validate(updateCareerDirectionSchema),
  careerDirectionController.updateCareerDirection
)
router.delete('/:id', careerDirectionController.deleteCareerDirection)

export default router
