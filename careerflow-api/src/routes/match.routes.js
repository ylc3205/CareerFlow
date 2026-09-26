import express from 'express'
import * as matchController from '../controllers/match.controller.js'
import protect from '../middlewares/auth.middleware.js'
import { aiLimiter } from '../middlewares/rateLimiter.middleware.js'

const router = express.Router({ mergeParams: true })

router.use(protect)

router.post('/', aiLimiter, matchController.generateMatch)

export default router
