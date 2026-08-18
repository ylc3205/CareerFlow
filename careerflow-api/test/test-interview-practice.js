// Phase 18 AI Interview Practice / Evaluation Test Suite
// Run: node test-interview-practice.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-interview-practice.js
//
// In AI_MOCK=true mode the practice evaluation endpoint returns deterministic
// fake evaluations and NEVER calls the Gemini API, so no quota is consumed.

import 'dotenv/config'
import mongoose from 'mongoose'
import PracticeSession from '../src/models/practiceSession.model.js'
import InterviewPreparation from '../src/models/interviewPreparation.model.js'
import Interview from '../src/models/interview.model.js'
import Application from '../src/models/application.model.js'
import Job from '../src/models/job.model.js'
import Resume from '../src/models/resume.model.js'
import ApiError from '../src/utils/ApiError.js'
import { normalizeEvaluation } from '../src/services/practiceSession.service.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_APP = `${BASE}/applications`
const BASE_INT = `${BASE}/interviews`

const PASSWORD = 'password123'

const CATEGORIES = ['technical', 'behavioral', 'situational']
const DIFFICULTIES = ['easy', 'medium', 'hard']
const EVAL_KEYS = [
  'score',
  'technicalScore',
  'communicationScore',
  'behavioralScore',
  'strengths',
  'weaknesses',
  'feedback',
  'suggestedAnswer',
]

let passed = 0
let failed = 0

const check = (label, condition) => {
  if (condition) {
    passed += 1
    console.log(`  [PASS] ${label}`)
  } else {
    failed += 1
    console.log(`  [FAIL] ${label}`)
  }
}

const req = async (method, url, body, headers = {}) => {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  let json
  try {
    json = await res.json()
  } catch {
    json = {}
  }
  return { status: res.status, body: json }
}

const authH = (token) => ({ Authorization: `Bearer ${token}` })

const ensureUser = async (email) => {
  const register = await req('POST', `${BASE_AUTH}/register`, { email, password: PASSWORD })
  if (register.status === 409) {
    const login = await req('POST', `${BASE_AUTH}/login`, { email, password: PASSWORD })
    if (!login.body.data?.accessToken) {
      console.error(`\n[FATAL] Cannot login ${email}.`)
      process.exit(1)
    }
    return { token: login.body.data.accessToken, userId: login.body.data.user._id }
  }
  if (!register.body.data?.accessToken) {
    console.error(`\n[FATAL] Cannot register ${email}:`, register.status, JSON.stringify(register.body))
    process.exit(1)
  }
  return { token: register.body.data.accessToken, userId: register.body.data.user._id }
}

const createJob = async (token, title, company) => {
  const res = await req('POST', BASE_JOBS, { title, company }, authH(token))
  return res.body.data?.job?._id
}

const createApp = async (token, jobId) => {
  const res = await req('POST', BASE_APP, { job: jobId, status: 'applied' }, authH(token))
  return res.body.data?.application?._id
}

const createInt = async (token, appId, title) => {
  const res = await req(
    'POST',
    BASE_INT,
    { application: appId, title, type: 'video', scheduledDate: new Date().toISOString() },
    authH(token)
  )
  return res.body.data?.interview?._id
}

const practiceUrl = (interviewId) => `${BASE_INT}/${interviewId}/practice`
const sessionUrl = (interviewId, pid) => `${BASE_INT}/${interviewId}/practice/${pid}`
const answersUrl = (interviewId, pid) => `${BASE_INT}/${interviewId}/practice/${pid}/answers`
const completeUrl = (interviewId, pid) => `${BASE_INT}/${interviewId}/practice/${pid}/complete`

const mean = (values) =>
  values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)

const validateEvaluation = (evaluation) => {
  const hasKeys = EVAL_KEYS.every((key) => key in evaluation)
  const scoresOk = ['score', 'technicalScore', 'communicationScore', 'behavioralScore'].every(
    (key) => Number.isInteger(evaluation[key]) && evaluation[key] >= 0 && evaluation[key] <= 100
  )
  const arraysOk = Array.isArray(evaluation.strengths) && Array.isArray(evaluation.weaknesses)
  const stringsOk =
    typeof evaluation.feedback === 'string' && typeof evaluation.suggestedAnswer === 'string'
  return { hasKeys, scoresOk, arraysOk, stringsOk }
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 18 — AI Interview Practice Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const main = await ensureUser('practice-main@example.com')
  const other = await ensureUser('practice-other@example.com')
  const noprep = await ensureUser('practice-noprep@example.com')

  const testUserIds = [main.userId, other.userId, noprep.userId]

  // Clear leftover data from previous runs so this suite is deterministic.
  await PracticeSession.deleteMany({ user: { $in: testUserIds } })
  await InterviewPreparation.deleteMany({ user: { $in: testUserIds } })
  await Interview.deleteMany({ user: { $in: testUserIds } })
  await Application.deleteMany({ user: { $in: testUserIds } })
  await Job.deleteMany({ user: { $in: testUserIds } })
  await Resume.deleteOne({ user: main.userId })

  // main: profile + resume (needed for preparation generation).
  await req('PATCH', `${BASE}/profile`, {
    skills: ['Node.js', 'Express.js', 'MongoDB'],
    experience: [
      { company: 'TechCorp', position: 'Backend Intern', description: 'Built REST APIs with Node.js.', startDate: '2023-06-01', current: true },
    ],
  }, authH(main.token))
  await req('PATCH', `${BASE}/resume`, {
    title: 'Backend Developer Resume',
    summary: 'Backend developer with Node.js and MongoDB experience.',
    skills: ['Node.js', 'MongoDB', 'Docker'],
  }, authH(main.token))

  // Jobs + applications + interviews for every user.
  const jobMain = await createJob(main.token, 'Backend Developer', 'VNG')
  const appMain = await createApp(main.token, jobMain)
  const intMain = await createInt(main.token, appMain, 'VNG Tech Round')

  const jobOther = await createJob(other.token, 'DevOps Engineer', 'Grab')
  const appOther = await createApp(other.token, jobOther)
  const intOther = await createInt(other.token, appOther, 'Grab Onsite')

  const jobNoprep = await createJob(noprep.token, 'QA Engineer', 'FPT')
  const appNoprep = await createApp(noprep.token, jobNoprep)
  const intNoprep = await createInt(noprep.token, appNoprep, 'FPT Screening')

  // main generates preparation (Phase 17 endpoint, deterministic mock).
  const prepRes = await req('POST', `${BASE_INT}/${intMain}/preparation`, {}, authH(main.token))
  check('preparation generated (setup)', prepRes.status === 200 && !!prepRes.body.data?.preparation)
  const prep = prepRes.body.data?.preparation

  console.log(
    '[Setup] Done. intMain=%s intOther=%s intNoprep=%s prep=%s',
    intMain, intOther, intNoprep, prep?._id
  )

  // ── 1. Preparation required ─────────────────────────────
  console.log('\n[1] Practice without preparation (noprep, intNoprep)')
  {
    const { status, body } = await req('POST', practiceUrl(intNoprep), {}, authH(noprep.token))
    check('expect 400', status === 400)
    check('expect preparation-required message', body.message === 'Please generate interview preparation first')
  }

  // ── 2. Create session ───────────────────────────────────
  console.log('\n[2] Create practice session (main, intMain)')
  let session
  {
    const { status, body } = await req('POST', practiceUrl(intMain), {}, authH(main.token))
    session = body.data?.session
    check('expect 201', status === 201)
    check('expect success=true', body.success === true)
    check('expect data.session present', !!session)
    check('session has user set', String(session?.user) === main.userId)
    check('session has interview set', String(session?.interview) === intMain)
    check('session has preparation set', String(session?.preparation) === String(prep?._id))
    check('status is not_started', session?.status === 'not_started')
  }

  // ── 3. Question slots ───────────────────────────────────
  console.log('\n[3] Exactly 6 question slots snapshotted from preparation')
  {
    const answers = session?.answers ?? []
    check('6 question slots', answers.length === 6)
    check('every slot has questionIndex 0..5', answers.every((a, i) => a.questionIndex === i))
    check('every slot has a question string', answers.every((a) => typeof a.question === 'string' && a.question.length > 0))
    check('categories subset of allowed', answers.every((a) => CATEGORIES.includes(a.category)))
    check('difficulties subset of allowed', answers.every((a) => DIFFICULTIES.includes(a.difficulty)))
    check('snapshot matches preparation questions', answers.every((a, i) => a.question === prep.questions[i]?.question))
    check('no answer submitted yet', answers.every((a) => a.answer === '' && a.attemptCount === 0 && !a.evaluation))
  }

  // ── 4. Question retrieval via GET ───────────────────────
  console.log('\n[4] GET session returns questions')
  {
    const { status, body } = await req('GET', sessionUrl(intMain, session._id), undefined, authH(main.token))
    const answers = body.data?.session?.answers ?? []
    check('expect 200', status === 200)
    check('6 question slots visible', answers.length === 6)
    check('unanswered slots have empty answer', answers.every((a) => a.answer === ''))
  }

  // ── 5. Authentication ───────────────────────────────────
  console.log('\n[5] Missing / invalid token (expect 401)')
  {
    const noToken = await req('POST', practiceUrl(intMain), {})
    check('expect 401 without token', noToken.status === 401)
    check('expect success=false', noToken.body.success === false)

    const badToken = await req('GET', sessionUrl(intMain, session._id), undefined, {
      Authorization: 'Bearer not-a-valid-token',
    })
    check('expect 401 with invalid token', badToken.status === 401)
  }

  // ── 6. Invalid IDs ──────────────────────────────────────
  console.log('\n[6] Malformed / nonexistent IDs')
  {
    const badInt = await req('POST', practiceUrl('not-an-object-id'), {}, authH(main.token))
    check('malformed interview id -> 400', badInt.status === 400)
    check('message Invalid interview ID', badInt.body.message === 'Invalid interview ID')

    const missingInt = await req('POST', practiceUrl('6a7c000000000000000000ff'), {}, authH(main.token))
    check('nonexistent interview -> 404', missingInt.status === 404)
    check('message Interview not found', missingInt.body.message === 'Interview not found')

    const badPid = await req('GET', sessionUrl(intMain, 'not-an-object-id'), undefined, authH(main.token))
    check('malformed session id -> 400', badPid.status === 400)
    check('message Invalid practice session ID', badPid.body.message === 'Invalid practice session ID')

    const missingPid = await req('GET', sessionUrl(intMain, '6a7c000000000000000000ff'), undefined, authH(main.token))
    check('nonexistent session -> 404', missingPid.status === 404)
    check('message Practice session not found', missingPid.body.message === 'Practice session not found')
  }

  // ── 7. Cross-user isolation ─────────────────────────────
  console.log('\n[7] Cross-user isolation (other vs main resources)')
  {
    const otherInt = await req('POST', practiceUrl(intMain), {}, authH(other.token))
    check('other creates practice on main interview -> 404', otherInt.status === 404)

    const otherGet = await req('GET', sessionUrl(intMain, session._id), undefined, authH(other.token))
    check('other gets main session -> 404', otherGet.status === 404)

    const otherAnswer = await req('POST', answersUrl(intMain, session._id), { questionIndex: 0, answer: 'x' }, authH(other.token))
    check('other answers main session -> 404', otherAnswer.status === 404)

    const wrongInt = await req('GET', sessionUrl(intOther, session._id), undefined, authH(main.token))
    check('main reads own session via other interview -> 404', wrongInt.status === 404)
  }

  // ── 8. Answer validation ────────────────────────────────
  console.log('\n[8] Answer validation')
  {
    const missing = await req('POST', answersUrl(intMain, session._id), { questionIndex: 0 }, authH(main.token))
    check('missing answer -> 422', missing.status === 422)

    const empty = await req('POST', answersUrl(intMain, session._id), { questionIndex: 0, answer: '   ' }, authH(main.token))
    check('blank answer rejected (service guard)', empty.status === 400)
    check('blank answer message Answer is required', empty.body.message === 'Answer is required')

    const nonInt = await req('POST', answersUrl(intMain, session._id), { questionIndex: '0', answer: 'hello world' }, authH(main.token))
    check('string questionIndex -> 422', nonInt.status === 422)

    const negative = await req('POST', answersUrl(intMain, session._id), { questionIndex: -1, answer: 'hello world' }, authH(main.token))
    check('negative questionIndex -> 422', negative.status === 422)

    const outOfRange = await req('POST', answersUrl(intMain, session._id), { questionIndex: 99, answer: 'hello world' }, authH(main.token))
    check('out-of-range questionIndex -> 400', outOfRange.status === 400)
    check('message Invalid question index', outOfRange.body.message === 'Invalid question index')
  }

  // ── 9. Successful answer submission ─────────────────────
  console.log('\n[9] Submit answer (questionIndex 0)')
  let q0Evaluation
  {
    const { status, body } = await req('POST', answersUrl(intMain, session._id), { questionIndex: 0, answer: 'I would structure the API with routes and middleware.' }, authH(main.token))
    const updated = body.data?.session
    const slot = updated?.answers?.[0]
    check('expect 200', status === 200)
    check('success=true', body.success === true)
    check('answer stored', slot?.answer === 'I would structure the API with routes and middleware.')
    check('attemptCount is 1', slot?.attemptCount === 1)
    check('answeredAt set', !!slot?.answeredAt)
    check('status becomes in_progress', updated?.status === 'in_progress')
    q0Evaluation = slot?.evaluation
  }

  // ── 10. Evaluation schema ───────────────────────────────
  console.log('\n[10] AI evaluation schema')
  {
    const schema = validateEvaluation(q0Evaluation ?? {})
    check('evaluation has all 8 keys', schema.hasKeys)
    check('scores are integers 0-100', schema.scoresOk)
    check('strengths/weaknesses are arrays', schema.arraysOk)
    check('feedback/suggestedAnswer are strings', schema.stringsOk)
  }

  // ── 11. Persistence ─────────────────────────────────────
  console.log('\n[11] Persistence (single PracticeSession document)')
  {
    const count = await PracticeSession.countDocuments({ user: main.userId, interview: intMain })
    check('exactly 1 session persisted', count === 1)

    const doc = await PracticeSession.findOne({ _id: session._id })
    const slot = doc?.answers?.[0]
    check('slot persisted with answer', slot?.answer === 'I would structure the API with routes and middleware.')
    check('slot persisted with evaluation', !!slot?.evaluation && slot?.attemptCount === 1)
  }

  // ── 12. Same-answer reuse (no AI re-call) ───────────────
  console.log('\n[12] Identical answer reuse')
  {
    const { status, body } = await req('POST', answersUrl(intMain, session._id), { questionIndex: 0, answer: 'I would structure the API with routes and middleware.' }, authH(main.token))
    const slot = body.data?.session?.answers?.[0]
    check('expect 200', status === 200)
    check('same evaluation returned', JSON.stringify(slot?.evaluation) === JSON.stringify(q0Evaluation))
    check('attemptCount unchanged on identical answer', slot?.attemptCount === 1)
  }

  // ── 13. Changed answer triggers new evaluation ──────────
  console.log('\n[13] Changed answer (edit) triggers re-evaluation')
  {
    const { status, body } = await req('POST', answersUrl(intMain, session._id), { questionIndex: 0, answer: 'I would design routes, use middleware for validation, and centralize error handling.' }, authH(main.token))
    const slot = body.data?.session?.answers?.[0]
    check('expect 200', status === 200)
    check('answer updated', slot?.answer === 'I would design routes, use middleware for validation, and centralize error handling.')
    check('attemptCount incremented to 2', slot?.attemptCount === 2)
    check('evaluation present after edit', !!slot?.evaluation)
  }

  // ── 14. Auto-completion ─────────────────────────────────
  console.log('\n[14] Answer all 6 questions -> auto-complete')
  {
    const answers = [
      'Explain how middleware works in Express.',
      'I debug by reproducing the issue and adding logging.',
      'I would model them with references and indexes.',
      'I add limit/skip params and clamp them.',
      'I would reprioritize and communicate early.',
      'I pick a small project and read the docs.',
    ]
    let last = null
    for (let i = 1; i < 6; i += 1) {
      const { status, body } = await req('POST', answersUrl(intMain, session._id), { questionIndex: i, answer: answers[i] }, authH(main.token))
      if (status !== 200) break
      last = body.data?.session
    }
    check('final submission returns 200', !!last)
    check('status is completed', last?.status === 'completed')
    check('all 6 slots evaluated', (last?.answers ?? []).every((a) => !!a.evaluation))
    check('summary present', !!last?.summary)
    check('completedAt set', !!last?.completedAt)
  }

  // ── 15. Deterministic summary ───────────────────────────
  console.log('\n[15] Summary computed deterministically from evaluations')
  {
    const { status, body } = await req('GET', sessionUrl(intMain, session._id), undefined, authH(main.token))
    const finished = body.data?.session
    check('expect 200', status === 200)
    const answered = (finished?.answers ?? []).filter((a) => a.evaluation)
    const summary = finished?.summary
    check('summary overallScore matches mean of scores', summary?.overallScore === mean(answered.map((a) => a.evaluation.score)))
    check('summary technicalScore matches mean', summary?.technicalScore === mean(answered.map((a) => a.evaluation.technicalScore)))
    check('summary communicationScore matches mean', summary?.communicationScore === mean(answered.map((a) => a.evaluation.communicationScore)))
    check('summary behavioralScore matches mean', summary?.behavioralScore === mean(answered.map((a) => a.evaluation.behavioralScore)))
    check('strongAreas includes mock strength', (summary?.strongAreas ?? []).includes('Good understanding of the core concept'))
    check('weakAreas includes mock weakness', (summary?.weakAreas ?? []).includes('Could add more detail and concrete examples'))
  }

  // ── 16. Completed session rejects new answers ───────────
  console.log('\n[16] Completed session cannot receive answers')
  {
    const { status, body } = await req('POST', answersUrl(intMain, session._id), { questionIndex: 3, answer: 'an extra answer' }, authH(main.token))
    check('expect 400', status === 400)
    check('message Practice already completed', body.message === 'Practice already completed')
  }

  // ── 17. Early completion + idempotency ──────────────────
  console.log('\n[17] Early completion and idempotent complete')
  {
    const created = await req('POST', practiceUrl(intMain), {}, authH(main.token))
    const pid = created.body.data?.session?._id
    check('second session created (201)', created.status === 201)

    await req('POST', answersUrl(intMain, pid), { questionIndex: 0, answer: 'first partial answer' }, authH(main.token))
    await req('POST', answersUrl(intMain, pid), { questionIndex: 1, answer: 'second partial answer' }, authH(main.token))

    const completed = await req('POST', completeUrl(intMain, pid), {}, authH(main.token))
    const summary = completed.body.data?.session?.summary
    check('complete -> 200', completed.status === 200)
    check('status completed', completed.body.data?.session?.status === 'completed')
    check('summary present', !!summary)
    check('summary reflects partial answers (overall 0-100)', summary?.overallScore >= 0 && summary?.overallScore <= 100)

    const again = await req('POST', completeUrl(intMain, pid), {}, authH(main.token))
    check('idempotent complete -> 200', again.status === 200)
    check('summary unchanged on second complete', JSON.stringify(again.body.data?.session?.summary) === JSON.stringify(summary))

    const noAnswers = await req('POST', practiceUrl(intMain), {}, authH(main.token))
    const emptyPid = noAnswers.body.data?.session?._id
    const earlyEmpty = await req('POST', completeUrl(intMain, emptyPid), {}, authH(main.token))
    check('complete with no answers -> 400', earlyEmpty.status === 400)
    check('message No answers to summarize', earlyEmpty.body.message === 'No answers to summarize')
  }

  // ── 18. Deterministic AI_MOCK behavior ──────────────────
  console.log('\n[18] Deterministic mock evaluation across sessions')
  {
    const created = await req('POST', practiceUrl(intMain), {}, authH(main.token))
    const pid = created.body.data?.session?._id
    const first = await req('POST', answersUrl(intMain, pid), { questionIndex: 0, answer: 'deterministic answer' }, authH(main.token))
    const second = await req('POST', answersUrl(intMain, pid), { questionIndex: 0, answer: 'deterministic answer' }, authH(main.token))
    check('same question + same answer -> identical evaluation', JSON.stringify(first.body.data?.session?.answers?.[0]?.evaluation) === JSON.stringify(second.body.data?.session?.answers?.[0]?.evaluation))
    check('mock scores within 0-100', first.body.data?.session?.answers?.[0]?.evaluation?.score >= 0 && first.body.data?.session?.answers?.[0]?.evaluation?.score <= 100)
  }

  // ── 19. List sessions ───────────────────────────────────
  console.log('\n[19] GET /api/interviews/:id/practice lists sessions')
  {
    const { status, body } = await req('GET', practiceUrl(intMain), undefined, authH(main.token))
    const sessions = body.data?.sessions ?? []
    check('expect 200', status === 200)
    check('sessions is an array', Array.isArray(sessions))
    check('lists all practice sessions (>= 4)', sessions.length >= 4)
    check('newest first', sessions[0] && new Date(sessions[0].createdAt) >= new Date(sessions[sessions.length - 1].createdAt))
  }

  // ── 20. Delete session ──────────────────────────────────
  console.log('\n[20] Delete practice session')
  {
    const created = await req('POST', practiceUrl(intMain), {}, authH(main.token))
    const pid = created.body.data?.session?._id
    const del = await req('DELETE', sessionUrl(intMain, pid), undefined, authH(main.token))
    check('expect 200', del.status === 200)
    check('delete message', del.body.message === 'Practice session deleted successfully')

    const gone = await req('GET', sessionUrl(intMain, pid), undefined, authH(main.token))
    check('deleted session -> 404', gone.status === 404)

    const delOther = await req('DELETE', sessionUrl(intOther, session._id), undefined, authH(main.token))
    check('delete other interview session -> 404', delOther.status === 404)
  }

  // ── 21. Malformed AI output (unit-level normalize) ──────
  console.log('\n[21] normalizeEvaluation rejects malformed AI output')
  {
    const validBase = {
      score: 80,
      technicalScore: 75,
      communicationScore: 70,
      behavioralScore: 85,
      strengths: ['a'],
      weaknesses: ['b'],
      feedback: 'feedback',
      suggestedAnswer: 'answer',
    }
    const expects502 = (label, raw) => {
      try {
        normalizeEvaluation(raw)
        check(label, false)
      } catch (err) {
        check(label, err instanceof ApiError && err.statusCode === 502 && err.message === 'AI returned an invalid response')
      }
    }
    expects502('null raw', null)
    expects502('non-object raw', 'not json')
    expects502('missing score', { ...validBase, score: undefined })
    expects502('non-numeric score', { ...validBase, score: 'abc' })
    expects502('strengths not an array', { ...validBase, strengths: 'nope' })
    expects502('feedback not a string', { ...validBase, feedback: 123 })

    const clamped = normalizeEvaluation({ ...validBase, score: 150, technicalScore: -20 })
    check('out-of-range scores clamped (150->100, -20->0)', clamped.score === 100 && clamped.technicalScore === 0)
    const coerced = normalizeEvaluation({ ...validBase, score: '85.6' })
    check('numeric string score coerced (85.6->86)', coerced.score === 86)
    const trimmed = normalizeEvaluation({ ...validBase, strengths: ['  ', 'x', 'y', 'z', 'w', 'v', 'u'] })
    check('extra strengths truncated to 5 and blanks dropped', trimmed.strengths.length === 5 && !trimmed.strengths.includes(''))
  }

  // ── 22. Existing routes still work ──────────────────────
  console.log('\n[22] Existing routes still work')
  {
    const health = await req('GET', `${BASE}/health`)
    check('GET /api/health -> 200', health.status === 200)

    const ints = await req('GET', BASE_INT, undefined, authH(main.token))
    check('GET /api/interviews -> 200', ints.status === 200)
    check('GET /api/interviews returns array', Array.isArray(ints.body.data?.interviews))

    const authMe = await req('GET', `${BASE_AUTH}/me`, undefined, authH(main.token))
    check('GET /api/auth/me -> 200', authMe.status === 200)
  }

  // ── 23. Cleanup test data ───────────────────────────────
  console.log('\n[23] Cleanup test data')
  await PracticeSession.deleteMany({ user: { $in: testUserIds } })
  await InterviewPreparation.deleteMany({ user: { $in: testUserIds } })
  await Interview.deleteMany({ user: { $in: testUserIds } })
  await Application.deleteMany({ user: { $in: testUserIds } })
  await Job.deleteMany({ user: { $in: testUserIds } })
  await Resume.deleteOne({ user: main.userId })

  console.log('\n==========================================')
  console.log(`  PASS: ${passed}   FAIL: ${failed}`)
  console.log('==========================================')

  await mongoose.disconnect()
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err) => {
  console.error('\n[FATAL] Unexpected test error:', err)
  process.exit(1)
})