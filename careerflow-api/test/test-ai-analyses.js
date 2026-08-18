// Phase 11 AI Analysis List Endpoint Test Suite
// Run: node test-ai-analyses.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-ai-analyses.js
//
// This suite verifies GET /api/ai-analyses returns only the authenticated
// user's persisted AI analyses, correctly shaped, sorted and isolated.

import 'dotenv/config'
import mongoose from 'mongoose'
import AIAnalysis from '../src/models/aiAnalysis.model.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_PROFILE = `${BASE}/profile`
const BASE_ANALYSES = `${BASE}/ai-analyses`

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

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 11 — AI Analysis List Endpoint Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const userA = await ensureUser('aianalyses-list-a@example.com')
  const userB = await ensureUser('aianalyses-list-b@example.com')
  const userC = await ensureUser('aianalyses-list-c@example.com')

  await req('PATCH', BASE_PROFILE, {
    skills: ['Node.js', 'Express.js', 'MongoDB'],
  }, authH(userA.token))

  const createJob = async (token, title, company) => {
    const res = await req('POST', BASE_JOBS, { title, company, skills: ['Node.js'] }, authH(token))
    return res.body.data?.job?._id
  }

  const jobA1 = await createJob(userA.token, 'Backend Developer', 'VNG')
  const jobA2 = await createJob(userA.token, 'Frontend Developer', 'Shopee')
  const jobB = await createJob(userB.token, 'QA Engineer', 'FPT')

  // Persist analyses: A1 first, then A2 (newest should be A2). B matches its own job.
  await req('POST', `${BASE_JOBS}/${jobA1}/match`, {}, authH(userA.token))
  await req('POST', `${BASE_JOBS}/${jobA2}/match`, {}, authH(userA.token))
  await req('POST', `${BASE_JOBS}/${jobB}/match`, {}, authH(userB.token))

  console.log('[Setup] Done. jobA1=%s jobA2=%s jobB=%s', jobA1, jobA2, jobB)

  // ── 1. Persistence integration ──────────────────────────
  console.log('\n[1] GET /api/ai-analyses returns persisted analyses (userA)')
  let list = null
  {
    const { status, body } = await req('GET', BASE_ANALYSES, undefined, authH(userA.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.analyses array', Array.isArray(body.data?.analyses))
    list = body.data?.analyses ?? []
    const ids = list.map((a) => String(a.job?._id))
    check('contains analysis for jobA1', ids.includes(jobA1))
    check('contains analysis for jobA2', ids.includes(jobA2))
    check('has exactly 2 analyses', list.length === 2)
  }

  // ── 2. Response shape ───────────────────────────────────
  console.log('\n[2] Response shape (no user leak, job populated)')
  {
    const entry = list[0]
    const hasCore =
      entry &&
      typeof entry._id === 'string' &&
      typeof entry.matchScore === 'number' &&
      Array.isArray(entry.matchedSkills) &&
      Array.isArray(entry.missingSkills) &&
      Array.isArray(entry.strengths) &&
      Array.isArray(entry.weaknesses) &&
      Array.isArray(entry.recommendations)
    check('core match fields present', hasCore)
    check('user field NOT exposed', entry && !('user' in entry))
    check('model/provider NOT exposed', entry && !('model' in entry) && !('provider' in entry))
    check('job populated with _id', entry && !!entry.job?._id)
    check('job populated with title', entry && typeof entry.job?.title === 'string')
    check('job populated with company', entry && typeof entry.job?.company === 'string')
    check('has createdAt', entry && typeof entry.createdAt === 'string')
    check('has updatedAt', entry && typeof entry.updatedAt === 'string')
  }

  // ── 3. No token ─────────────────────────────────────────
  console.log('\n[3] GET without token (expect 401)')
  {
    const { status, body } = await req('GET', BASE_ANALYSES)
    console.log(`  [${status}]`)
    check('expect 401', status === 401)
    check('expect success=false', body.success === false)
  }

  // ── 4. Cross-user isolation ─────────────────────────────
  console.log('\n[4] Cross-user isolation (userB list must not contain userA analyses)')
  {
    const { status, body } = await req('GET', BASE_ANALYSES, undefined, authH(userB.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    const ids = (body.data?.analyses ?? []).map((a) => String(a.job?._id))
    check('contains own analysis (jobB)', ids.includes(jobB))
    check('does NOT contain userA jobA1', !ids.includes(jobA1))
    check('does NOT contain userA jobA2', !ids.includes(jobA2))
  }

  // ── 5. Empty list ───────────────────────────────────────
  console.log('\n[5] User with no analyses (expect 200 + empty array)')
  {
    const { status, body } = await req('GET', BASE_ANALYSES, undefined, authH(userC.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect empty array', Array.isArray(body.data?.analyses) && body.data.analyses.length === 0)
  }

  // ── 6. Sort newest-first ────────────────────────────────
  console.log('\n[6] Analyses sorted newest-first')
  {
    const { status, body } = await req('GET', BASE_ANALYSES, undefined, authH(userA.token))
    check('expect 200', status === 200)
    const arr = body.data?.analyses ?? []
    const first = String(arr[0]?.job?._id)
    check('newest analysis (jobA2) first', arr.length === 2 && first === jobA2)
    const timestamps = arr.map((a) => new Date(a.createdAt).getTime())
    const sorted = timestamps.every((t, i) => i === 0 || timestamps[i - 1] >= t)
    check('createdAt descending', sorted)
  }

  // ── 7. Cleanup test data ────────────────────────────────
  await AIAnalysis.deleteMany({ user: { $in: [userA.userId, userB.userId, userC.userId] } })

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