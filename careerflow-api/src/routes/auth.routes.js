import express from 'express'
import * as authController from '../controllers/auth.controller.js'
import protect from '../middlewares/auth.middleware.js'
import validate from '../middlewares/validate.middleware.js'
import { authLimiter } from '../middlewares/rateLimiter.middleware.js'
import { registerSchema, loginSchema } from '../validators/auth.validator.js'

const router = express.Router()

router.post('/register', authLimiter, validate(registerSchema), authController.register)
router.post('/login', authLimiter, validate(loginSchema), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', protect, authController.me)

export default router
