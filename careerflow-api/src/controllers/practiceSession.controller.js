import catchAsync from '../utils/catchAsync.js'
import * as practiceSessionService from '../services/practiceSession.service.js'

const createSession = catchAsync(async (req, res) => {
  const session = await practiceSessionService.createSession(req.user.userId, req.params.id)

  res.status(201).json({
    success: true,
    data: { session },
  })
})

const listSessions = catchAsync(async (req, res) => {
  const sessions = await practiceSessionService.listSessions(req.user.userId, req.params.id)

  res.status(200).json({
    success: true,
    data: { sessions },
  })
})

const getSession = catchAsync(async (req, res) => {
  const session = await practiceSessionService.getSession(
    req.user.userId,
    req.params.id,
    req.params.pid
  )

  res.status(200).json({
    success: true,
    data: { session },
  })
})

const submitAnswer = catchAsync(async (req, res) => {
  const session = await practiceSessionService.submitAnswer(
    req.user.userId,
    req.params.id,
    req.params.pid,
    req.body.questionIndex,
    req.body.answer
  )

  res.status(200).json({
    success: true,
    data: { session },
  })
})

const completeSession = catchAsync(async (req, res) => {
  const session = await practiceSessionService.completeSession(
    req.user.userId,
    req.params.id,
    req.params.pid
  )

  res.status(200).json({
    success: true,
    data: { session },
  })
})

const deleteSession = catchAsync(async (req, res) => {
  await practiceSessionService.deleteSession(req.user.userId, req.params.id, req.params.pid)

  res.status(200).json({
    success: true,
    message: 'Practice session deleted successfully',
  })
})

export { createSession, listSessions, getSession, submitAnswer, completeSession, deleteSession }