import { request } from './client.js'

// Backend practice-session contract (mounted under /api/interviews/:id):
//   POST   /practice           -> { success, data: { session } } (201; 400 when no preparation)
//   GET    /practice           -> { success, data: { sessions } } (newest-first)
//   GET    /practice/:pid      -> { success, data: { session } }
//   POST   /practice/:pid/answers { questionIndex, answer } -> { success, data: { session } }
//     Same trimmed answer is short-circuited (attemptCount unchanged); a changed
//     answer is re-evaluated and replaces the slot. Answering every slot
//     auto-completes the session. Whitespace-only answer -> 400.
//   POST   /practice/:pid/complete -> { success, data: { session } } (idempotent)
//   DELETE /practice/:pid      -> { success, message }
//   Session shape: { _id, status: not_started|in_progress|completed, answers: [
//     { questionIndex, question, category, difficulty, answer, attemptCount,
//       evaluation: { score, technicalScore, communicationScore, behavioralScore,
//         strengths, weaknesses, feedback, suggestedAnswer } | null, answeredAt } ],
//     summary: { overallScore, technicalScore, communicationScore, behavioralScore,
//       strongAreas, weakAreas } | null, completedAt, createdAt, updatedAt }

export const createPracticeSessionApi = (interviewId) =>
  request({ path: `/interviews/${interviewId}/practice`, method: 'POST' })

export const listPracticeSessionsApi = (interviewId) =>
  request({ path: `/interviews/${interviewId}/practice`, method: 'GET' })

export const getPracticeSessionApi = (interviewId, practiceId) =>
  request({ path: `/interviews/${interviewId}/practice/${practiceId}`, method: 'GET' })

export const submitPracticeAnswerApi = (interviewId, practiceId, questionIndex, answer) =>
  request({
    path: `/interviews/${interviewId}/practice/${practiceId}/answers`,
    method: 'POST',
    body: { questionIndex, answer },
  })

export const completePracticeSessionApi = (interviewId, practiceId) =>
  request({ path: `/interviews/${interviewId}/practice/${practiceId}/complete`, method: 'POST' })

export const deletePracticeSessionApi = (interviewId, practiceId) =>
  request({ path: `/interviews/${interviewId}/practice/${practiceId}`, method: 'DELETE' })