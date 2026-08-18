// Phase 8 AI Job Matching Test Suite
// Run: node test-match.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//      (and optionally GEMINI_MODEL=gemini-1.5-flash — not needed in mock mode)
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-match.js
//
// In AI_MOCK=true mode the match endpoint returns deterministic fake results
// and NEVER calls the Gemini API, so no quota is consumed.

import 'dotenv/config'
import mongoose from 'mongoose'
import Profile from '../src/models/profile.model.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_PROFILE = `${BASE}/profile`
const BASE_RESUME = `${BASE}/resume`

const PASSWORD = 'password123'

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

const deleteProfileDirectly = async (userId) => {
  await Profile.deleteOne({ user: userId })
}

const validateMatchSchema = (match) => {
  const keys = ['matchScore', 'matchedSkills', 'missingSkills', 'strengths', 'weaknesses', 'recommendations']
  const hasAllKeys = keys.every((k) => k in match)
  const arraysOk = ['matchedSkills', 'missingSkills', 'strengths', 'weaknesses', 'recommendations'].every(
    (k) => Array.isArray(match[k])
  )
  const scoreInt = Number.isInteger(match.matchScore)
  const scoreRange = match.matchScore >= 0 && match.matchScore <= 100
  return { hasAllKeys, arraysOk, scoreInt, scoreRange }
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 8 — AI Job Match Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const main = await ensureUser('match-main@example.com')
  const other = await ensureUser('match-other@example.com')
  const nodata = await ensureUser('match-nodata@example.com')
  const profOnly = await ensureUser('match-profile@example.com')
  const resOnly = await ensureUser('match-resume@example.com')

  // match-main: add profile details + create resume -> has BOTH
  await req('PATCH', BASE_PROFILE, {
    skills: ['Node.js', 'Express.js', 'MongoDB', 'Zod'],
    experience: [
      { company: 'TechCorp', position: 'Backend Intern', description: 'Built REST APIs with Node.js.', startDate: '2023-06-01', current: true },
    ],
  }, authH(main.token))
  await req('PATCH', BASE_RESUME, {
    title: 'Backend Developer Resume',
    summary: 'Backend developer with Node.js and MongoDB experience.',
    skills: ['Node.js', 'MongoDB', 'Docker'],
    experience: [
      { company: 'OtherCorp', position: 'Software Developer', description: 'Worked on microservices with Node.js.', startDate: '2022-01-01', current: false },
    ],
  }, authH(main.token))

  // match-nodata: delete auto-created profile, no resume -> NEITHER
  await deleteProfileDirectly(nodata.userId)
  // match-resume: delete auto-created profile, create resume -> ONLY resume
  await deleteProfileDirectly(resOnly.userId)
  await req('PATCH', BASE_RESUME, {
    title: 'Frontend Resume',
    summary: 'Frontend developer with React experience.',
    skills: ['React', 'TypeScript', 'Vite'],
  }, authH(resOnly.token))

  // Jobs
  const mainJobRes = await req('POST', BASE_JOBS, {
    title: 'Backend Developer',
    company: 'VNG',
    description: 'Build REST APIs with Node.js, Express and MongoDB.',
    requirements: 'Node.js, Express, MongoDB.',
    responsibilities: 'Design and maintain APIs.',
    skills: ['Node.js', 'Express.js', 'MongoDB'],
  }, authH(main.token))
  const jobA = mainJobRes.body.data?.job?._id

  const otherJobRes = await req('POST', BASE_JOBS, {
    title: 'DevOps Engineer',
    company: 'Grab',
    skills: ['Docker', 'Kubernetes'],
  }, authH(other.token))
  const jobB = otherJobRes.body.data?.job?._id

  const nodataJobRes = await req('POST', BASE_JOBS, { title: 'QA Engineer', company: 'FPT' }, authH(nodata.token))
  const jobC = nodataJobRes.body.data?.job?._id

  const profJobRes = await req('POST', BASE_JOBS, { title: 'Backend Intern', company: 'Tiki' }, authH(profOnly.token))
  const jobD = profJobRes.body.data?.job?._id

  const resJobRes = await req('POST', BASE_JOBS, { title: 'Frontend Engineer', company: 'Shopee' }, authH(resOnly.token))
  const jobE = resJobRes.body.data?.job?._id

  console.log('[Setup] Done. jobA=%s jobB=%s jobC=%s jobD=%s jobE=%s', jobA, jobB, jobC, jobD, jobE)

  const matchUrl = (id) => `${BASE_JOBS}/${id}/match`

  // ── 1. Valid matching request ────────────────────────────
  console.log('\n[1] Valid matching request (match-main, jobA)')
  {
    const { status, body } = await req('POST', matchUrl(jobA), {}, authH(main.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.match present', !!body.data?.match)
    const schema = validateMatchSchema(body.data?.match ?? {})
    check('match has all required keys', schema.hasAllKeys)
    check('all five arrays are arrays', schema.arraysOk)
    check('matchScore is integer 0-100', schema.scoreInt && schema.scoreRange)
  }

  // ── 2. Missing JWT ───────────────────────────────────────
  console.log('\n[2] Missing JWT')
  {
    const { status, body } = await req('POST', matchUrl(jobA), {})
    console.log(`  [${status}]`)
    check('expect 401', status === 401)
    check('expect success=false', body.success === false)
  }

  // ── 3. Malformed Job ID ──────────────────────────────────
  console.log('\n[3] Malformed Job ID')
  {
    const { status, body } = await req('POST', matchUrl('not-an-object-id'), {}, authH(main.token))
    console.log(`  [${status}]`)
    check('expect 400', status === 400)
    check('expect Invalid job ID message', body.message === 'Invalid job ID')
  }

  // ── 4. Job belonging to another user ─────────────────────
  console.log('\n[4] Job belonging to another user (main tries other.jobB)')
  {
    const { status, body } = await req('POST', matchUrl(jobB), {}, authH(main.token))
    console.log(`  [${status}]`)
    check('expect 404', status === 404)
    check('expect Job not found message', body.message === 'Job not found')
  }

  // ── 5. Missing/nonexistent Job ───────────────────────────
  console.log('\n[5] Nonexistent Job')
  {
    const { status, body } = await req('POST', matchUrl('6a7c000000000000000000ff'), {}, authH(main.token))
    console.log(`  [${status}]`)
    check('expect 404', status === 404)
    check('expect Job not found message', body.message === 'Job not found')
  }

  // ── 6. User with neither Profile nor Resume ──────────────
  console.log('\n[6] User with neither Profile nor Resume (nodata, jobC)')
  {
    const { status, body } = await req('POST', matchUrl(jobC), {}, authH(nodata.token))
    console.log(`  [${status}]`)
    check('expect 400', status === 400)
    check('expect profile/resume message', body.message === 'Please create a profile or resume to use AI matching')
  }

  // ── 7. User with only Profile ────────────────────────────
  console.log('\n[7] User with only Profile (profOnly, jobD)')
  {
    const { status, body } = await req('POST', matchUrl(jobD), {}, authH(profOnly.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.match present', !!body.data?.match)
  }

  // ── 8. User with only Resume ─────────────────────────────
  console.log('\n[8] User with only Resume (resOnly, jobE)')
  {
    const { status, body } = await req('POST', matchUrl(jobE), {}, authH(resOnly.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.match present', !!body.data?.match)
  }

  // ── 9. Unknown/injection fields cannot alter ownership ───
  console.log('\n[9] Injection fields in body cannot alter ownership')
  {
    const { status, body } = await req('POST', matchUrl(jobA), {
      user: nodata.userId,
      job: jobB,
      userId: nodata.userId,
      matchScore: 100,
      randomField: 'should be ignored',
    }, authH(main.token))
    console.log(`  [${status}]`)
    check('expect 200 (URL param wins, body ignored)', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.match present', !!body.data?.match)
    check('injected score ignored (mock result used)', body.data?.match?.matchScore !== 100)
  }

  // ── 10. AI_MOCK response has valid schema ────────────────
  console.log('\n[10] AI_MOCK response schema')
  {
    const { status, body } = await req('POST', matchUrl(jobA), {}, authH(main.token))
    console.log(`  [${status}]`)
    const schema = validateMatchSchema(body.data?.match ?? {})
    check('mock match has all required keys', status === 200 && schema.hasAllKeys)
    check('mock arrays are all arrays', schema.arraysOk)
    check('mock matchScore integer 0-100', schema.scoreInt && schema.scoreRange)
  }

  // ── 11. matchScore normalization is 0–100 ────────────────
  console.log('\n[11] matchScore normalization (integer 0-100)')
  {
    const { status, body } = await req('POST', matchUrl(jobA), {}, authH(main.token))
    console.log(`  [${status}] score=${body.data?.match?.matchScore}`)
    const score = body.data?.match?.matchScore
    check('score is integer', Number.isInteger(score))
    check('score in range 0..100', score >= 0 && score <= 100)
  }

  // ── 12. Existing routes continue working ─────────────────
  console.log('\n[12] Existing routes still work')
  {
    const health = await req('GET', `${BASE}/health`)
    check('GET /api/health -> 200', health.status === 200)

    const jobs = await req('GET', BASE_JOBS, undefined, authH(main.token))
    check('GET /api/jobs -> 200', jobs.status === 200)
    check('GET /api/jobs returns array', Array.isArray(jobs.body.data?.jobs))

    const authMe = await req('GET', `${BASE_AUTH}/me`, undefined, authH(main.token))
    check('GET /api/auth/me -> 200', authMe.status === 200)
  }

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
