// Phase 12 AI Match Overview (Summary) Test Suite
// Run: node test-ai-analysis-summary.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-ai-analysis-summary.js
//
// This suite verifies GET /api/ai-analyses/summary aggregates only the
// authenticated user's persisted AI analyses and job coverage.

import 'dotenv/config'
import mongoose from 'mongoose'
import AIAnalysis from '../src/models/aiAnalysis.model.js'
import Job from '../src/models/job.model.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
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

const createJob = async (token, title, company) => {
  const res = await req('POST', BASE_JOBS, { title, company, skills: ['Node.js'] }, authH(token))
  return res.body.data?.job?._id
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 12 — AI Match Overview (Summary) Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const userA = await ensureUser('aianalysis-summary-a@example.com')
  const userB = await ensureUser('aianalysis-summary-b@example.com')
  const userC = await ensureUser('aianalysis-summary-c@example.com')

  // Clear leftover jobs/analyses from previous runs so this suite is
  // deterministic regardless of accumulated test data.
  await Job.deleteMany({ user: { $in: [userA.userId, userB.userId, userC.userId] } })
  await AIAnalysis.deleteMany({ user: { $in: [userA.userId, userB.userId, userC.userId] } })

  // userA: 3 jobs, analyses on 2 of them (scores 60 and 95) — deterministic seed.
  const jobA1 = await createJob(userA.token, 'Backend Developer', 'VNG')
  const jobA2 = await createJob(userA.token, 'Frontend Developer', 'Shopee')
  const jobA3 = await createJob(userA.token, 'DevOps Engineer', 'Grab')
  await AIAnalysis.create([
    { user: userA.userId, job: jobA1, matchScore: 60 },
    { user: userA.userId, job: jobA2, matchScore: 95 },
  ])

  // userB: 1 job, no analyses.
  const jobB = await createJob(userB.token, 'QA Engineer', 'FPT')

  console.log('[Setup] Done. userA jobs=%s,%s,%s userB job=%s', jobA1, jobA2, jobA3, jobB)

  const summaryUrl = `${BASE_ANALYSES}/summary`

  // ── 1. Totals + average ─────────────────────────────────
  console.log('\n[1] Summary totals and average (userA)')
  let summary = null
  {
    const { status, body } = await req('GET', summaryUrl, undefined, authH(userA.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    summary = body.data?.summary
    check('totalAnalyses === 2', summary?.totalAnalyses === 2)
    check('averageMatchScore === 77.5', summary?.averageMatchScore === 77.5)
  }

  // ── 2. Highest / lowest match ───────────────────────────
  console.log('\n[2] Highest and lowest match (userA)')
  {
    check('highestMatch references jobA2', summary?.highestMatch?.job?._id === jobA2)
    check('highestMatch score === 95', summary?.highestMatch?.matchScore === 95)
    check('highestMatch job title populated', summary?.highestMatch?.job?.title === 'Frontend Developer')
    check('highestMatch job company populated', summary?.highestMatch?.job?.company === 'Shopee')
    check('lowestMatch references jobA1', summary?.lowestMatch?.job?._id === jobA1)
    check('lowestMatch score === 60', summary?.lowestMatch?.matchScore === 60)
    check('lowestMatch job title populated', summary?.lowestMatch?.job?.title === 'Backend Developer')
  }

  // ── 3. Matched / unmatched jobs ─────────────────────────
  console.log('\n[3] Job coverage (userA)')
  {
    check('matchedJobs === 2', summary?.matchedJobs === 2)
    check('unmatchedJobs === 1 (jobA3 has no analysis)', summary?.unmatchedJobs === 1)
  }

  // ── 4. Cross-user isolation ─────────────────────────────
  console.log('\n[4] Cross-user isolation (userB summary ignores userA)')
  {
    const { status, body } = await req('GET', summaryUrl, undefined, authH(userB.token))
    check('expect 200', status === 200)
    const s = body.data?.summary
    check('userB totalAnalyses === 0', s?.totalAnalyses === 0)
    check('userB matchedJobs === 0', s?.matchedJobs === 0)
    check('userB unmatchedJobs === 1 (own job only)', s?.unmatchedJobs === 1)
    check('userB highestMatch === null', s?.highestMatch === null)
    check('userB lowestMatch === null', s?.lowestMatch === null)
  }

  // ── 5. Empty state ──────────────────────────────────────
  console.log('\n[5] Empty state (userC: no jobs, no analyses)')
  {
    const { status, body } = await req('GET', summaryUrl, undefined, authH(userC.token))
    check('expect 200', status === 200)
    const s = body.data?.summary
    check('totalAnalyses === 0', s?.totalAnalyses === 0)
    check('averageMatchScore === 0', s?.averageMatchScore === 0)
    check('matchedJobs === 0', s?.matchedJobs === 0)
    check('unmatchedJobs === 0', s?.unmatchedJobs === 0)
    check('highestMatch === null', s?.highestMatch === null)
    check('lowestMatch === null', s?.lowestMatch === null)
  }

  // ── 6. No token ─────────────────────────────────────────
  console.log('\n[6] GET summary without token (expect 401)')
  {
    const { status, body } = await req('GET', summaryUrl)
    console.log(`  [${status}]`)
    check('expect 401', status === 401)
    check('expect success=false', body.success === false)
  }

  // ── 7. Cleanup test data ────────────────────────────────
  await Job.deleteMany({ user: { $in: [userA.userId, userB.userId, userC.userId] } })
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