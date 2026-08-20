// Phase 19 Interview History + Analytics + Dashboard Test Suite
// Run: node test-analytics.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Start the server with AI_MOCK=true in the shell env:  $env:AI_MOCK='true'; node.cmd src/server.js
//   2. In another terminal:  node test-analytics.js
//
// Phase 19 is read-only analytics over PracticeSession data. It performs NO AI
// calls. The mock evaluation is deterministic: score = 70 + (sum of question
// char codes % 11), so expected summaries/aggregates can be predicted exactly.

import 'dotenv/config'
import mongoose from 'mongoose'
import PracticeSession from '../src/models/practiceSession.model.js'
import InterviewPreparation from '../src/models/interviewPreparation.model.js'
import Interview from '../src/models/interview.model.js'
import Application from '../src/models/application.model.js'
import Job from '../src/models/job.model.js'
import Resume from '../src/models/resume.model.js'
import { aggregateAreas, computeScoreAverages } from '../src/services/analytics.service.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_APP = `${BASE}/applications`
const BASE_INT = `${BASE}/interviews`
const BASE_AN = `${BASE}/analytics`

// Complexity-valid fixture password (register policy rejects weak passwords).
const PASSWORD = 'Str0ng!pass'

const mockEval = (questionText) => {
  const hash = Array.from(String(questionText)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const score = 70 + (hash % 11)
  return {
    score,
    technicalScore: score,
    communicationScore: score - 4,
    behavioralScore: score + 2,
  }
}

const mean = (values) =>
  values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)

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

const answerAll = async (token, intId, pid, questions) => {
  const answers = [
    'I would structure the API with routes and middleware.',
    'I debug by reproducing the issue and adding logging.',
    'I model them with references and indexes.',
    'I add limit/skip params and clamp them.',
    'I would reprioritize and communicate early.',
    'I pick a small project and read the docs.',
  ]
  let last = null
  for (let i = 0; i < questions.length; i += 1) {
    const { status, body } = await req(
      'POST',
      `${BASE_INT}/${intId}/practice/${pid}/answers`,
      { questionIndex: i, answer: answers[i] },
      authH(token)
    )
    if (status !== 200) break
    last = body.data?.session
  }
  return last
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 19 — History / Analytics / Dashboard Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const main = await ensureUser('analytics-main@example.com')
  const other = await ensureUser('analytics-other@example.com')
  const empty = await ensureUser('analytics-empty@example.com')

  const testUserIds = [main.userId, other.userId, empty.userId]

  // Clear leftover data from previous runs so this suite is deterministic.
  await PracticeSession.deleteMany({ user: { $in: testUserIds } })
  await InterviewPreparation.deleteMany({ user: { $in: testUserIds } })
  await Interview.deleteMany({ user: { $in: testUserIds } })
  await Application.deleteMany({ user: { $in: testUserIds } })
  await Job.deleteMany({ user: { $in: testUserIds } })
  await Resume.deleteOne({ user: main.userId })

  // main needs a profile/resume for preparation generation.
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
  await req('PATCH', `${BASE}/profile`, {
    skills: ['Node.js', 'Express.js', 'MongoDB'],
  }, authH(other.token))
  await req('PATCH', `${BASE}/resume`, {
    title: 'Other Resume',
    summary: 'Other developer.',
    skills: ['Node.js'],
  }, authH(other.token))

  // main: two interviews (intA, intB). other: one interview (intOther).
  const jobA = await createJob(main.token, 'Backend Developer', 'VNG')
  const appA = await createApp(main.token, jobA)
  const intA = await createInt(main.token, appA, 'VNG Tech Round')

  const jobB = await createJob(main.token, 'DevOps Engineer', 'Grab')
  const appB = await createApp(main.token, jobB)
  const intB = await createInt(main.token, appB, 'Grab Onsite')

  const jobOther = await createJob(other.token, 'QA Engineer', 'FPT')
  const appOther = await createApp(other.token, jobOther)
  const intOther = await createInt(other.token, appOther, 'FPT Screening')

  // Generate preparation for both main interviews and other's interview.
  const prepARes = await req('POST', `${BASE_INT}/${intA}/preparation`, {}, authH(main.token))
  check('prepA generated (setup)', prepARes.status === 200 && !!prepARes.body.data?.preparation)
  const prepA = prepARes.body.data?.preparation
  const questionsA = prepA?.questions ?? []

  const prepBRes = await req('POST', `${BASE_INT}/${intB}/preparation`, {}, authH(main.token))
  check('prepB generated (setup)', prepBRes.status === 200 && !!prepBRes.body.data?.preparation)
  const questionsB = prepBRes.body.data?.preparation?.questions ?? []

  const prepORes = await req('POST', `${BASE_INT}/${intOther}/preparation`, {}, authH(other.token))
  check('prepOther generated (setup)', prepORes.status === 200 && !!prepORes.body.data?.preparation)
  const questionsOther = prepORes.body.data?.preparation?.questions ?? []

  console.log(
    '[Setup] Done. intA=%s intB=%s intOther=%s qA=%d qB=%d',
    intA, intB, intOther, questionsA.length, questionsB.length
  )

  // Predicted mock evaluations per question for each interview.
  const evalA = questionsA.map((q) => ({ ...mockEval(q.question), category: q.category }))
  const evalB = questionsB.map((q) => ({ ...mockEval(q.question), category: q.category }))
  const evalOther = questionsOther.map((q) => ({ ...mockEval(q.question), category: q.category }))

  // ── Sessions for main ───────────────────────────────────
  // S1: intA full 6 -> auto-completed.
  const s1 = await req('POST', `${BASE_INT}/${intA}/practice`, {}, authH(main.token))
  const pid1 = s1.body.data?.session?._id
  check('S1 created (201)', s1.status === 201 && !!pid1)
  const s1Done = await answerAll(main.token, intA, pid1, questionsA)
  check('S1 completed', s1Done?.status === 'completed')

  // S2: intA full 6 -> auto-completed.
  const s2 = await req('POST', `${BASE_INT}/${intA}/practice`, {}, authH(main.token))
  const pid2 = s2.body.data?.session?._id
  const s2Done = await answerAll(main.token, intA, pid2, questionsA)
  check('S2 completed', s2Done?.status === 'completed')

  // S3: intA partial (2 answers) -> early complete.
  const s3 = await req('POST', `${BASE_INT}/${intA}/practice`, {}, authH(main.token))
  const pid3 = s3.body.data?.session?._id
  await req('POST', `${BASE_INT}/${intA}/practice/${pid3}/answers`, { questionIndex: 0, answer: 'partial one' }, authH(main.token))
  await req('POST', `${BASE_INT}/${intA}/practice/${pid3}/answers`, { questionIndex: 1, answer: 'partial two' }, authH(main.token))
  const s3Done = await req('POST', `${BASE_INT}/${intA}/practice/${pid3}/complete`, {}, authH(main.token))
  check('S3 completed early', s3Done.body.data?.session?.status === 'completed')

  // S4: intA no answers (not_started).
  const s4 = await req('POST', `${BASE_INT}/${intA}/practice`, {}, authH(main.token))
  const pid4 = s4.body.data?.session?._id
  check('S4 created not_started', s4.body.data?.session?.status === 'not_started')

  // S5: intB full 6 -> auto-completed.
  const s5 = await req('POST', `${BASE_INT}/${intB}/practice`, {}, authH(main.token))
  const pid5 = s5.body.data?.session?._id
  const s5Done = await answerAll(main.token, intB, pid5, questionsB)
  check('S5 completed', s5Done?.status === 'completed')

  // other: O1 full 6 -> auto-completed.
  const o1 = await req('POST', `${BASE_INT}/${intOther}/practice`, {}, authH(other.token))
  const pidO1 = o1.body.data?.session?._id
  const o1Done = await answerAll(other.token, intOther, pidO1, questionsOther)
  check('O1 completed', o1Done?.status === 'completed')

  // ── Expected values (deterministic) ─────────────────────
  const summaryOf = (evals) => ({
    overallScore: mean(evals.map((e) => e.score)),
    technicalScore: mean(evals.map((e) => e.technicalScore)),
    communicationScore: mean(evals.map((e) => e.communicationScore)),
    behavioralScore: mean(evals.map((e) => e.behavioralScore)),
  })

  const summaryS1 = summaryOf(evalA)
  const summaryS2 = summaryOf(evalA)
  const summaryS3 = summaryOf(evalA.slice(0, 2))
  const summaryS5 = summaryOf(evalB)

  // ── 1. History list ─────────────────────────────────────
  console.log('\n[1] GET /api/analytics/history (main)')
  let history
  {
    const { status, body } = await req('GET', `${BASE_AN}/history`, undefined, authH(main.token))
    history = body.data?.sessions ?? []
    check('expect 200', status === 200)
    check('success=true', body.success === true)
    check('sessions is an array', Array.isArray(history))
    check('all 5 sessions returned', history.length === 5)
    check('newest first', new Date(history[0].createdAt) >= new Date(history[history.length - 1].createdAt))
    check('pagination present', body.data?.pagination?.total === 5 && body.data?.pagination?.totalPages === 1)
  }

  // ── 2. History response shape ───────────────────────────
  console.log('\n[2] History item shape (lean, no raw answers / no user leak)')
  {
    const item = history.find((h) => String(h._id) === String(pid5))
    check('item found (S5)', !!item)
    check('status completed', item?.status === 'completed')
    check('interview populated with title', item?.interview?.title === 'Grab Onsite')
    check('job populated with title', item?.job?.title === 'DevOps Engineer')
    check('job populated with company', item?.job?.company === 'Grab')
    check('answeredCount === 6', item?.answeredCount === 6)
    check('totalQuestions derived from answers.length (6)', item?.totalQuestions === 6)
    check('summary overallScore matches prediction', item?.summary?.overallScore === summaryS5.overallScore)
    check('summary technicalScore matches prediction', item?.summary?.technicalScore === summaryS5.technicalScore)
    check('no raw answers array returned', !('answers' in item))
    check('no user field leak', !('user' in item))
    check('no preparation field leak', !('preparation' in item))

    const partial = history.find((h) => String(h._id) === String(pid3))
    check('S3 answeredCount === 2', partial?.answeredCount === 2)
    check('S3 totalQuestions === 6', partial?.totalQuestions === 6)
    check('S3 summary reflects partial answers', partial?.summary?.overallScore === summaryS3.overallScore)

    const none = history.find((h) => String(h._id) === String(pid4))
    check('S4 answeredCount === 0', none?.answeredCount === 0)
    check('S4 totalQuestions === 6', none?.totalQuestions === 6)
    check('S4 status not_started', none?.status === 'not_started')
    check('S4 summary null', none?.summary === null)
  }

  // ── 3. History status filter ────────────────────────────
  console.log('\n[3] History status filter')
  {
    const completed = await req('GET', `${BASE_AN}/history?status=completed`, undefined, authH(main.token))
    check('completed -> 4 sessions', (completed.body.data?.sessions ?? []).length === 4)
    check('all completed', (completed.body.data?.sessions ?? []).every((h) => h.status === 'completed'))

    const notStarted = await req('GET', `${BASE_AN}/history?status=not_started`, undefined, authH(main.token))
    check('not_started -> 1 session', (notStarted.body.data?.sessions ?? []).length === 1)

    const inProgress = await req('GET', `${BASE_AN}/history?status=in_progress`, undefined, authH(main.token))
    check('in_progress -> 0 sessions', (inProgress.body.data?.sessions ?? []).length === 0)

    const invalid = await req('GET', `${BASE_AN}/history?status=bogus`, undefined, authH(main.token))
    check('invalid status -> 400', invalid.status === 400)
    check('message Invalid status filter', invalid.body.message === 'Invalid status filter')
  }

  // ── 4. History interview filter ─────────────────────────
  console.log('\n[4] History interview filter')
  {
    const scopedA = await req('GET', `${BASE_AN}/history?interview=${intA}`, undefined, authH(main.token))
    check('interview=intA -> 4 sessions', (scopedA.body.data?.sessions ?? []).length === 4)
    check('all scoped to intA', (scopedA.body.data?.sessions ?? []).every((h) => String(h.interview._id) === intA))

    const scopedB = await req('GET', `${BASE_AN}/history?interview=${intB}`, undefined, authH(main.token))
    check('interview=intB -> 1 session', (scopedB.body.data?.sessions ?? []).length === 1)

    const malformed = await req('GET', `${BASE_AN}/history?interview=not-an-object-id`, undefined, authH(main.token))
    check('malformed interview id -> 400', malformed.status === 400)
    check('message Invalid interview ID', malformed.body.message === 'Invalid interview ID')
  }

  // ── 5. History pagination ───────────────────────────────
  console.log('\n[5] History pagination')
  {
    const page1 = await req('GET', `${BASE_AN}/history?page=1&limit=2`, undefined, authH(main.token))
    check('page 1 returns 2 sessions', (page1.body.data?.sessions ?? []).length === 2)
    check('page 1 total === 5', page1.body.data?.pagination?.total === 5)
    check('page 1 totalPages === 3', page1.body.data?.pagination?.totalPages === 3)

    const page3 = await req('GET', `${BASE_AN}/history?page=3&limit=2`, undefined, authH(main.token))
    check('page 3 returns remaining 1 session', (page3.body.data?.sessions ?? []).length === 1)

    const page99 = await req('GET', `${BASE_AN}/history?page=99&limit=2`, undefined, authH(main.token))
    check('page beyond range returns empty', (page99.body.data?.sessions ?? []).length === 0)
    check('total preserved on empty page', page99.body.data?.pagination?.total === 5)

    const defaults = await req('GET', `${BASE_AN}/history?page=abc&limit=xyz`, undefined, authH(main.token))
    check('non-numeric page/limit fall back to defaults', defaults.body.data?.pagination?.page === 1 && defaults.body.data?.pagination?.limit === 20)
  }

  // ── 6. Cross-user isolation ─────────────────────────────
  console.log('\n[6] Cross-user isolation')
  {
    const otherHistory = await req('GET', `${BASE_AN}/history`, undefined, authH(other.token))
    check('other history only has O1', (otherHistory.body.data?.sessions ?? []).length === 1)
    check('other does NOT see main sessions', (otherHistory.body.data?.sessions ?? []).every((h) => String(h._id) === String(pidO1)))

    const otherScoped = await req('GET', `${BASE_AN}/history?interview=${intA}`, undefined, authH(other.token))
    check('other scoping to main interview -> 0 sessions', (otherScoped.body.data?.sessions ?? []).length === 0)

    const emptyHistory = await req('GET', `${BASE_AN}/history`, undefined, authH(empty.token))
    check('empty user history -> 0 sessions', (emptyHistory.body.data?.sessions ?? []).length === 0)
  }

  // ── 7. Authentication ───────────────────────────────────
  console.log('\n[7] Missing / invalid token (expect 401)')
  {
    const endpoints = ['history', 'dashboard', 'trends', 'areas', 'performance']
    for (const ep of endpoints) {
      const noToken = await req('GET', `${BASE_AN}/${ep}`)
      check(`GET /${ep} -> 401 without token`, noToken.status === 401)
      check(`GET /${ep} -> success=false`, noToken.body.success === false)
      const badToken = await req('GET', `${BASE_AN}/${ep}`, undefined, { Authorization: 'Bearer not-a-valid-token' })
      check(`GET /${ep} -> 401 with invalid token`, badToken.status === 401)
    }
  }

  // ── 8. Dashboard totals ─────────────────────────────────
  console.log('\n[8] Dashboard totals (main)')
  let dash
  {
    const { status, body } = await req('GET', `${BASE_AN}/dashboard`, undefined, authH(main.token))
    dash = body.data?.dashboard
    check('expect 200', status === 200)
    check('success=true', body.success === true)
    check('totalSessions === 5', dash?.totals?.totalSessions === 5)
    check('completedSessions === 4', dash?.totals?.completedSessions === 4)
    check('inProgressSessions === 0', dash?.totals?.inProgressSessions === 0)
    check('notStartedSessions === 1', dash?.totals?.notStartedSessions === 1)
    check('answeredQuestions === 20', dash?.totals?.answeredQuestions === 20)
    check('totalQuestions === 30', dash?.totals?.totalQuestions === 30)
  }

  // ── 9. Dashboard averages (session-summary level) ───────
  console.log('\n[9] Dashboard averages = mean of completed session summaries')
  {
    const expected = {
      overallScore: mean([summaryS1.overallScore, summaryS2.overallScore, summaryS3.overallScore, summaryS5.overallScore]),
      technicalScore: mean([summaryS1.technicalScore, summaryS2.technicalScore, summaryS3.technicalScore, summaryS5.technicalScore]),
      communicationScore: mean([summaryS1.communicationScore, summaryS2.communicationScore, summaryS3.communicationScore, summaryS5.communicationScore]),
      behavioralScore: mean([summaryS1.behavioralScore, summaryS2.behavioralScore, summaryS3.behavioralScore, summaryS5.behavioralScore]),
    }
    check('averages.overallScore matches prediction', dash?.averages?.overallScore === expected.overallScore)
    check('averages.technicalScore matches prediction', dash?.averages?.technicalScore === expected.technicalScore)
    check('averages.communicationScore matches prediction', dash?.averages?.communicationScore === expected.communicationScore)
    check('averages.behavioralScore matches prediction', dash?.averages?.behavioralScore === expected.behavioralScore)
    check('averages.sessionsCount === 4', dash?.averages?.sessionsCount === 4)
  }

  // ── 10. Dashboard best session ──────────────────────────
  console.log('\n[10] Dashboard bestSession')
  {
    const candidates = [summaryS1.overallScore, summaryS2.overallScore, summaryS3.overallScore, summaryS5.overallScore]
    const maxOverall = Math.max(...candidates)
    check('bestSession present', !!dash?.bestSession)
    check('bestSession.overallScore is max', dash?.bestSession?.overallScore === maxOverall)
    check('bestSession has interview ref', !!dash?.bestSession?.interview?._id)
    check('bestSession has job ref', !!dash?.bestSession?.job?.title)
    check('bestSession has completedAt', !!dash?.bestSession?.completedAt)
  }

  // ── 11. Dashboard recent sessions ───────────────────────
  console.log('\n[11] Dashboard recentSessions (latest 5 completed)')
  {
    check('recentSessions length 4', (dash?.recentSessions ?? []).length === 4)
    const ids = (dash?.recentSessions ?? []).map((r) => String(r.sessionId))
    check('newest first (S5 first)', ids[0] === String(pid5))
    check('recentSessions have overallScore', (dash?.recentSessions ?? []).every((r) => typeof r.overallScore === 'number'))
    check('recentSessions have no raw answers', (dash?.recentSessions ?? []).every((r) => !('answers' in r)))
  }

  // ── 12. Dashboard trend ─────────────────────────────────
  console.log('\n[12] Dashboard trend (all completed, ascending by completedAt)')
  {
    const trend = dash?.trend ?? []
    check('trend length 4', trend.length === 4)
    const sorted = [...trend].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
    check('trend ascending by completedAt', trend.every((t, i) => t.sessionId === sorted[i].sessionId))
    const expectedOverall = [summaryS1.overallScore, summaryS2.overallScore, summaryS3.overallScore, summaryS5.overallScore].sort((a, b) => a - b)
    const trendScores = trend.map((t) => t.overallScore).sort((a, b) => a - b)
    check('trend overallScores match predictions', JSON.stringify(trendScores) === JSON.stringify(expectedOverall))
    check('trend items have sessionId/completedAt/overallScore', trend.every((t) => !!t.sessionId && !!t.completedAt && typeof t.overallScore === 'number'))
  }

  // ── 13. Dashboard strong/weak areas ─────────────────────
  console.log('\n[13] Dashboard strongAreas / weakAreas')
  {
    const strong = dash?.strongAreas ?? []
    const weak = dash?.weakAreas ?? []
    check('strongAreas has 1 entry (top 5)', strong.length === 1)
    check('strongAreas[0].area = mock strength', strong[0]?.area === 'Good understanding of the core concept')
    check('strongAreas[0].count === 20 evaluations', strong[0]?.count === 20)
    check('weakAreas has 1 entry', weak.length === 1)
    check('weakAreas[0].area = mock weakness', weak[0]?.area === 'Could add more detail and concrete examples')
    check('weakAreas[0].count === 20', weak[0]?.count === 20)
  }

  // ── 14. Trends endpoint ─────────────────────────────────
  console.log('\n[14] GET /api/analytics/trends')
  let trends
  {
    const { status, body } = await req('GET', `${BASE_AN}/trends`, undefined, authH(main.token))
    trends = body.data?.trends
    check('expect 200', status === 200)
    check('completedCount === 4', trends?.completedCount === 4)
    check('trend array length 4', (trends?.trend ?? []).length === 4)
    check('trend sorted ascending', (() => {
      const arr = trends?.trend ?? []
      for (let i = 1; i < arr.length; i += 1) {
        if (new Date(arr[i].completedAt) < new Date(arr[i - 1].completedAt)) return false
      }
      return true
    })())
    check('trend scores match summary means', (() => {
      const scores = (trends?.trend ?? []).map((t) => t.overallScore).sort((a, b) => a - b)
      const expected = [summaryS1.overallScore, summaryS2.overallScore, summaryS3.overallScore, summaryS5.overallScore].sort((a, b) => a - b)
      return JSON.stringify(scores) === JSON.stringify(expected)
    })())
  }

  // ── 15. Areas endpoint ──────────────────────────────────
  console.log('\n[15] GET /api/analytics/areas')
  {
    const { status, body } = await req('GET', `${BASE_AN}/areas`, undefined, authH(main.token))
    const areas = body.data?.areas
    check('expect 200', status === 200)
    check('strongAreas[0].count === 20', areas?.strongAreas?.[0]?.count === 20)
    check('weakAreas[0].count === 20', areas?.weakAreas?.[0]?.count === 20)

    const limited = await req('GET', `${BASE_AN}/areas?limit=1`, undefined, authH(main.token))
    check('limit=1 returns 1 strong area', (limited.body.data?.areas?.strongAreas ?? []).length === 1)

    const clamped = await req('GET', `${BASE_AN}/areas?limit=500`, undefined, authH(main.token))
    check('limit clamped to 10', (clamped.body.data?.areas?.strongAreas ?? []).length <= 10)

    const badLimit = await req('GET', `${BASE_AN}/areas?limit=abc`, undefined, authH(main.token))
    check('non-numeric limit uses default', (badLimit.body.data?.areas?.strongAreas ?? []).length === 1)
  }

  // ── 16. Performance endpoint (question/evaluation level) ─
  console.log('\n[16] GET /api/analytics/performance')
  {
    const { status, body } = await req('GET', `${BASE_AN}/performance`, undefined, authH(main.token))
    const perf = body.data?.performance
    check('expect 200', status === 200)

    const allEvals = [...evalA, ...evalA, ...evalA.slice(0, 2), ...evalB]
    check('totalEvaluations === 20', perf?.totalEvaluations === 20)
    check('averages.overallScore = mean of evaluations', perf?.averages?.overallScore === mean(allEvals.map((e) => e.score)))
    check('averages.technicalScore matches', perf?.averages?.technicalScore === mean(allEvals.map((e) => e.technicalScore)))
    check('averages.communicationScore matches', perf?.averages?.communicationScore === mean(allEvals.map((e) => e.communicationScore)))
    check('averages.behavioralScore matches', perf?.averages?.behavioralScore === mean(allEvals.map((e) => e.behavioralScore)))
    check('averageAttemptsPerQuestion === 1', perf?.averageAttemptsPerQuestion === 1)

    const tech = allEvals.filter((e) => e.category === 'technical')
    const behav = allEvals.filter((e) => e.category === 'behavioral')
    const situ = allEvals.filter((e) => e.category === 'situational')
    check('byCategory.technical.count matches', perf?.byCategory?.technical?.count === tech.length)
    check('byCategory.technical.averageScore matches', perf?.byCategory?.technical?.averageScore === mean(tech.map((e) => e.score)))
    check('byCategory.behavioral.count matches', perf?.byCategory?.behavioral?.count === behav.length)
    check('byCategory.behavioral.averageScore matches', perf?.byCategory?.behavioral?.averageScore === mean(behav.map((e) => e.score)))
    check('byCategory.situational.count matches', perf?.byCategory?.situational?.count === situ.length)
    check('byCategory.situational.averageScore matches', perf?.byCategory?.situational?.averageScore === mean(situ.map((e) => e.score)))
  }

  // ── 17. Empty user (no data) ────────────────────────────
  console.log('\n[17] Empty user analytics')
  {
    const { status, body } = await req('GET', `${BASE_AN}/dashboard`, undefined, authH(empty.token))
    const d = body.data?.dashboard
    check('dashboard 200', status === 200)
    check('totalSessions === 0', d?.totals?.totalSessions === 0)
    check('completedSessions === 0', d?.totals?.completedSessions === 0)
    check('answeredQuestions === 0', d?.totals?.answeredQuestions === 0)
    check('averages.overallScore null', d?.averages?.overallScore === null)
    check('averages.sessionsCount === 0', d?.averages?.sessionsCount === 0)
    check('bestSession null', d?.bestSession === null)
    check('recentSessions empty', Array.isArray(d?.recentSessions) && d.recentSessions.length === 0)
    check('trend empty', Array.isArray(d?.trend) && d.trend.length === 0)
    check('strongAreas empty', Array.isArray(d?.strongAreas) && d.strongAreas.length === 0)

    const t = await req('GET', `${BASE_AN}/trends`, undefined, authH(empty.token))
    check('trends completedCount === 0', t.body.data?.trends?.completedCount === 0)
    check('trends trend empty', (t.body.data?.trends?.trend ?? []).length === 0)

    const p = await req('GET', `${BASE_AN}/performance`, undefined, authH(empty.token))
    check('performance totalEvaluations === 0', p.body.data?.performance?.totalEvaluations === 0)
    check('performance averages null', p.body.data?.performance?.averages?.overallScore === null)
    check('performance byCategory counts 0', p.body.data?.performance?.byCategory?.technical?.count === 0)
    check('performance averageAttempts null', p.body.data?.performance?.averageAttemptsPerQuestion === null)
  }

  // ── 18. Unit-level pure helpers ─────────────────────────
  console.log('\n[18] aggregateAreas / computeScoreAverages (unit)')
  {
    const empty = aggregateAreas([], 5)
    check('aggregateAreas empty -> empty areas', empty.strongAreas.length === 0 && empty.weakAreas.length === 0)

    const evals = [
      { strengths: ['a', 'b'], weaknesses: ['x'] },
      { strengths: ['a'], weaknesses: ['x', 'y'] },
      { strengths: ['a'], weaknesses: ['y'] },
      { strengths: [], weaknesses: [] },
    ]
    const areas = aggregateAreas(evals, 2)
    check('strongAreas a=3 first', areas.strongAreas[0]?.area === 'a' && areas.strongAreas[0]?.count === 3)
    check('strongAreas limited to 2', areas.strongAreas.length === 2)
    check('weakAreas x=2 first (tie-break alphabetical)', areas.weakAreas[0]?.area === 'x' && areas.weakAreas[0]?.count === 2)
    check('blanks trimmed', (() => {
      const blank = aggregateAreas([{ strengths: ['  ', 'a'] }], 5)
      return blank.strongAreas.length === 1 && blank.strongAreas[0].area === 'a'
    })())

    check('computeScoreAverages empty -> null', computeScoreAverages([], 'score') === null)
    check('computeScoreAverages mean', computeScoreAverages([{ score: 80 }, { score: 90 }], 'score') === 85)
    check('computeScoreAverages rounds', computeScoreAverages([{ score: 80 }, { score: 90 }, { score: 91 }], 'score') === 87)
    check('computeScoreAverages skips non-numeric', computeScoreAverages([{ score: 80 }, { score: 'x' }, { score: null }], 'score') === 80)
  }

  // ── 19. Existing routes still work ──────────────────────
  console.log('\n[19] Existing routes still work')
  {
    const health = await req('GET', `${BASE}/health`)
    check('GET /api/health -> 200', health.status === 200)

    const ints = await req('GET', BASE_INT, undefined, authH(main.token))
    check('GET /api/interviews -> 200', ints.status === 200)
    check('GET /api/interviews returns array', Array.isArray(ints.body.data?.interviews))

    const authMe = await req('GET', `${BASE_AUTH}/me`, undefined, authH(main.token))
    check('GET /api/auth/me -> 200', authMe.status === 200)
  }

  // ── 20. Cleanup test data ───────────────────────────────
  console.log('\n[20] Cleanup test data')
  await PracticeSession.deleteMany({ user: { $in: testUserIds } })
  await InterviewPreparation.deleteMany({ user: { $in: testUserIds } })
  await Interview.deleteMany({ user: { $in: testUserIds } })
  await Application.deleteMany({ user: { $in: testUserIds } })
  await Job.deleteMany({ user: { $in: testUserIds } })
  await Resume.deleteOne({ user: main.userId })
  await Resume.deleteOne({ user: other.userId })

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