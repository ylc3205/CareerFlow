// Phase 17 AI Interview Preparation Test Suite
// Run: node test-interview-preparation.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-interview-preparation.js
//
// In AI_MOCK=true mode the preparation endpoint returns deterministic fake
// questions and NEVER calls the Gemini API, so no quota is consumed.

import 'dotenv/config'
import mongoose from 'mongoose'
import InterviewPreparation from '../src/models/interviewPreparation.model.js'
import Interview from '../src/models/interview.model.js'
import Application from '../src/models/application.model.js'
import Job from '../src/models/job.model.js'
import Profile from '../src/models/profile.model.js'
import Resume from '../src/models/resume.model.js'
import ApiError from '../src/utils/ApiError.js'
import { normalizePreparation } from '../src/services/interviewPreparation.service.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_APP = `${BASE}/applications`
const BASE_INT = `${BASE}/interviews`

const PASSWORD = 'password123'

const CATEGORIES = ['technical', 'behavioral', 'situational']
const DIFFICULTIES = ['easy', 'medium', 'hard']

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

const prepUrl = (interviewId) => `${BASE_INT}/${interviewId}/preparation`

const validateQuestion = (q) => {
  const keys = Object.keys(q)
  const allowed = ['question', 'category', 'difficulty', '_id']
  return (
    typeof q.question === 'string' &&
    q.question.trim().length > 0 &&
    CATEGORIES.includes(q.category) &&
    DIFFICULTIES.includes(q.difficulty) &&
    keys.every((k) => allowed.includes(k))
  )
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 17 — AI Interview Preparation Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const main = await ensureUser('prep-main@example.com')
  const other = await ensureUser('prep-other@example.com')
  const nodata = await ensureUser('prep-nodata@example.com')
  const profOnly = await ensureUser('prep-profile@example.com')
  const resOnly = await ensureUser('prep-resume@example.com')
  const missingJob = await ensureUser('prep-missingjob@example.com')

  const testUserIds = [
    main.userId,
    other.userId,
    nodata.userId,
    profOnly.userId,
    resOnly.userId,
    missingJob.userId,
  ]

  // Clear leftover data from previous runs so this suite is deterministic.
  await InterviewPreparation.deleteMany({ user: { $in: testUserIds } })
  await Interview.deleteMany({ user: { $in: testUserIds } })
  await Application.deleteMany({ user: { $in: testUserIds } })
  await Job.deleteMany({ user: { $in: testUserIds } })
  await Profile.deleteOne({ user: nodata.userId })
  await Profile.deleteOne({ user: resOnly.userId })

  // prep-main: profile + resume -> has BOTH
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
    experience: [
      { company: 'OtherCorp', position: 'Software Developer', description: 'Worked on microservices with Node.js.', startDate: '2022-01-01', current: false },
    ],
    projects: [
      { name: 'Job Board API', description: 'A job board REST API.', techStack: ['Node.js', 'MongoDB'] },
    ],
  }, authH(main.token))

  // prep-nodata: profile deleted, no resume -> NEITHER
  // prep-resume: profile deleted, resume created -> ONLY resume
  await req('PATCH', `${BASE}/resume`, {
    title: 'Frontend Resume',
    summary: 'Frontend developer with React experience.',
    skills: ['React', 'TypeScript', 'Vite'],
  }, authH(resOnly.token))

  // Jobs + applications + interviews for every user
  const jobMain = await createJob(main.token, 'Backend Developer', 'VNG')
  const appMain = await createApp(main.token, jobMain)
  const intMain = await createInt(main.token, appMain, 'VNG Tech Round')

  const jobOther = await createJob(other.token, 'DevOps Engineer', 'Grab')
  const appOther = await createApp(other.token, jobOther)
  const intOther = await createInt(other.token, appOther, 'Grab Onsite')

  const jobNodata = await createJob(nodata.token, 'QA Engineer', 'FPT')
  const appNodata = await createApp(nodata.token, jobNodata)
  const intNodata = await createInt(nodata.token, appNodata, 'FPT Screening')

  const jobProf = await createJob(profOnly.token, 'Backend Intern', 'Tiki')
  const appProf = await createApp(profOnly.token, jobProf)
  const intProf = await createInt(profOnly.token, appProf, 'Tiki Interview')

  const jobRes = await createJob(resOnly.token, 'Frontend Engineer', 'Shopee')
  const appRes = await createApp(resOnly.token, jobRes)
  const intRes = await createInt(resOnly.token, appRes, 'Shopee Interview')

  const jobMissing = await createJob(missingJob.token, 'Data Engineer', 'CocCoc')
  const appMissing = await createApp(missingJob.token, jobMissing)
  const intMissing = await createInt(missingJob.token, appMissing, 'CocCoc Interview')

  console.log(
    '[Setup] Done. intMain=%s intOther=%s intNodata=%s intProf=%s intRes=%s intMissing=%s',
    intMain, intOther, intNodata, intProf, intRes, intMissing
  )

  // ── 1. Valid generation (profile + resume) ──────────────
  console.log('\n[1] Valid generation request (prep-main, intMain)')
  let firstBody
  {
    const { status, body } = await req('POST', prepUrl(intMain), {}, authH(main.token))
    firstBody = body
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.preparation present', !!body.data?.preparation)
    check('preparation has user set', String(body.data?.preparation?.user) === main.userId)
    check('preparation has interview set', String(body.data?.preparation?.interview) === intMain)
    check('preparation has questions array', Array.isArray(body.data?.preparation?.questions))
  }

  // ── 2. Response schema ──────────────────────────────────
  console.log('\n[2] Response schema (questions array)')
  {
    const questions = firstBody.data?.preparation?.questions ?? []
    check('6 questions generated (mock default)', questions.length === 6)
    check('every question passes schema', questions.every(validateQuestion))
    const cats = new Set(questions.map((q) => q.category))
    const diffs = new Set(questions.map((q) => q.difficulty))
    check('categories subset of allowed', [...cats].every((c) => CATEGORIES.includes(c)))
    check('difficulties subset of allowed', [...diffs].every((d) => DIFFICULTIES.includes(d)))
  }

  // ── 3. Missing JWT ──────────────────────────────────────
  console.log('\n[3] Missing JWT')
  {
    const { status, body } = await req('POST', prepUrl(intMain), {})
    check('expect 401', status === 401)
    check('expect success=false', body.success === false)
  }

  // ── 4. Malformed Interview ID ───────────────────────────
  console.log('\n[4] Malformed Interview ID')
  {
    const { status, body } = await req('POST', prepUrl('not-an-object-id'), {}, authH(main.token))
    check('expect 400', status === 400)
    check('expect Invalid interview ID message', body.message === 'Invalid interview ID')
  }

  // ── 5. Nonexistent Interview ────────────────────────────
  console.log('\n[5] Nonexistent Interview')
  {
    const { status, body } = await req('POST', prepUrl('6a7c000000000000000000ff'), {}, authH(main.token))
    check('expect 404', status === 404)
    check('expect Interview not found message', body.message === 'Interview not found')
  }

  // ── 6. Cross-user isolation ─────────────────────────────
  console.log('\n[6] Interview belonging to another user (main tries other.intOther)')
  {
    const { status, body } = await req('POST', prepUrl(intOther), {}, authH(main.token))
    check('expect 404', status === 404)
    check('expect Interview not found message', body.message === 'Interview not found')
  }

  // ── 7. User with neither Profile nor Resume ─────────────
  console.log('\n[7] User with neither Profile nor Resume (nodata, intNodata)')
  {
    const { status, body } = await req('POST', prepUrl(intNodata), {}, authH(nodata.token))
    check('expect 400', status === 400)
    check('expect profile/resume message', body.message === 'Please create a profile or resume to use AI interview preparation')
  }

  // ── 8. User with only Profile ───────────────────────────
  console.log('\n[8] User with only Profile (profOnly, intProf)')
  {
    const { status, body } = await req('POST', prepUrl(intProf), {}, authH(profOnly.token))
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.preparation present', !!body.data?.preparation)
    const questions = body.data?.preparation?.questions ?? []
    check('questions array present', Array.isArray(questions) && questions.length >= 5)
  }

  // ── 9. User with only Resume ────────────────────────────
  console.log('\n[9] User with only Resume (resOnly, intRes)')
  {
    const { status, body } = await req('POST', prepUrl(intRes), {}, authH(resOnly.token))
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.preparation present', !!body.data?.preparation)
    const questions = body.data?.preparation?.questions ?? []
    check('questions array present', Array.isArray(questions) && questions.length >= 5)
  }

  // ── 10. Persistence ─────────────────────────────────────
  console.log('\n[10] Persistence (single InterviewPreparation document)')
  {
    const count = await InterviewPreparation.countDocuments({ user: main.userId, interview: intMain })
    check('exactly 1 preparation persisted', count === 1)
  }

  // ── 11. Reuse — repeated request, no second AI call ─────
  console.log('\n[11] Repeated request returns cached preparation')
  {
    const { status, body } = await req('POST', prepUrl(intMain), {}, authH(main.token))
    check('expect 200', status === 200)
    check('success=true', body.success === true)
    check('identical questions returned (deterministic reuse)', JSON.stringify(body.data?.preparation?.questions) === JSON.stringify(firstBody.data?.preparation?.questions))
    const count = await InterviewPreparation.countDocuments({ user: main.userId, interview: intMain })
    check('still exactly 1 preparation (no second creation)', count === 1)
  }

  // ── 12. Missing Job / Application (400) ─────────────────
  console.log('\n[12] Interview whose application was deleted (missingJob, intMissing)')
  {
    await Application.deleteOne({ _id: appMissing })
    const { status, body } = await req('POST', prepUrl(intMissing), {}, authH(missingJob.token))
    check('expect 400', status === 400)
    check('expect Interview job not found message', body.message === 'Interview job not found')
  }

  // ── 13. Malformed AI output (unit-level normalize) ──────
  console.log('\n[13] normalizePreparation rejects malformed AI output')
  {
    const expects502 = (label, raw) => {
      try {
        normalizePreparation(raw)
        check(label, false)
      } catch (err) {
        check(label, err instanceof ApiError && err.statusCode === 502 && err.message === 'AI returned an invalid response')
      }
    }
    expects502('null raw', null)
    expects502('non-object raw', 'not json')
    expects502('missing questions', {})
    expects502('questions not an array', { questions: 'nope' })
    expects502('empty questions array', { questions: [] })
    expects502('too few questions', { questions: [{ question: 'Q', category: 'technical', difficulty: 'easy' }] })
    expects502('invalid category', { questions: Array.from({ length: 5 }, () => ({ question: 'Q', category: 'brainteaser', difficulty: 'easy' })) })
    expects502('invalid difficulty', { questions: Array.from({ length: 5 }, () => ({ question: 'Q', category: 'technical', difficulty: 'expert' })) })
  }

  // ── 14. Existing routes continue working ────────────────
  console.log('\n[14] Existing routes still work')
  {
    const health = await req('GET', `${BASE}/health`)
    check('GET /api/health -> 200', health.status === 200)

    const ints = await req('GET', BASE_INT, undefined, authH(main.token))
    check('GET /api/interviews -> 200', ints.status === 200)
    check('GET /api/interviews returns array', Array.isArray(ints.body.data?.interviews))

    const authMe = await req('GET', `${BASE_AUTH}/me`, undefined, authH(main.token))
    check('GET /api/auth/me -> 200', authMe.status === 200)
  }

  // ── 15. Cleanup test data ───────────────────────────────
  console.log('\n[15] Cleanup test data')
  await InterviewPreparation.deleteMany({ user: { $in: testUserIds } })
  await Interview.deleteMany({ user: { $in: testUserIds } })
  await Application.deleteMany({ user: { $in: testUserIds } })
  await Job.deleteMany({ user: { $in: testUserIds } })

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