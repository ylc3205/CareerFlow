// Phase 13 AI Analysis Delete Endpoint Test Suite
// Run: node test-ai-analysis-delete.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-ai-analysis-delete.js
//
// This suite verifies DELETE /api/ai-analyses/:id removes only the
// authenticated user's persisted AI analysis, is scoped/isolated, and
// enables the re-analyze workflow (delete stale analysis, then re-match).

import 'dotenv/config'
import mongoose from 'mongoose'
import AIAnalysis from '../src/models/aiAnalysis.model.js'
import Job from '../src/models/job.model.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_ANALYSES = `${BASE}/ai-analyses`

const PASSWORD = 'Str0ng!pass'

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

const matchJob = async (token, jobId) => {
  return req('POST', `${BASE_JOBS}/${jobId}/match`, {}, authH(token))
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 13 — AI Analysis Delete Endpoint Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const userA = await ensureUser('aianalysis-delete-a@example.com')
  const userB = await ensureUser('aianalysis-delete-b@example.com')

  // Clear leftover jobs/analyses from previous runs so this suite is
  // deterministic regardless of accumulated test data.
  await Job.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
  await AIAnalysis.deleteMany({ user: { $in: [userA.userId, userB.userId] } })

  const jobA1 = await createJob(userA.token, 'Backend Developer', 'VNG')
  const jobB1 = await createJob(userB.token, 'QA Engineer', 'FPT')

  // Persist one analysis per user.
  await matchJob(userA.token, jobA1)
  await matchJob(userB.token, jobB1)

  const analysisA1 = await AIAnalysis.findOne({ user: userA.userId, job: jobA1 })
  const analysisB1 = await AIAnalysis.findOne({ user: userB.userId, job: jobB1 })

  console.log(
    '[Setup] Done. jobA1=%s analysisA1=%s jobB1=%s analysisB1=%s',
    jobA1,
    analysisA1?._id,
    jobB1,
    analysisB1?._id
  )

  // ── 1. Happy path ───────────────────────────────────────
  console.log('\n[1] DELETE own analysis (userA)')
  {
    const { status, body } = await req(
      'DELETE',
      `${BASE_ANALYSES}/${analysisA1._id}`,
      undefined,
      authH(userA.token)
    )
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('message present', typeof body.message === 'string' && body.message.length > 0)
    const remaining = await AIAnalysis.countDocuments({ user: userA.userId, job: jobA1 })
    check('analysis actually removed (count=0)', remaining === 0)
  }

  // ── 2. Re-analyze refresh ───────────────────────────────
  console.log('\n[2] Re-match after delete creates a fresh analysis (refresh workflow)')
  let analysisA2 = null
  {
    const { status, body } = await matchJob(userA.token, jobA1)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    const recreated = await AIAnalysis.findOne({ user: userA.userId, job: jobA1 })
    check('new analysis created (count=1)', !!recreated)
    check('new analysis _id differs from deleted one', String(recreated?._id) !== String(analysisA1._id))
    analysisA2 = recreated
  }

  // ── 3. Authentication failure ───────────────────────────
  console.log('\n[3] DELETE without / with invalid token (expect 401)')
  {
    const noToken = await req('DELETE', `${BASE_ANALYSES}/${analysisA2._id}`)
    check('expect 401 without token', noToken.status === 401)
    check('expect success=false', noToken.body.success === false)
    const badToken = await req(
      'DELETE',
      `${BASE_ANALYSES}/${analysisA2._id}`,
      undefined,
      { Authorization: 'Bearer not-a-valid-token' }
    )
    check('expect 401 with invalid token', badToken.status === 401)
  }

  // ── 4. Validation failure ───────────────────────────────
  console.log('\n[4] DELETE malformed ObjectId (expect 400)')
  {
    const { status, body } = await req('DELETE', `${BASE_ANALYSES}/not-an-id`, undefined, authH(userA.token))
    check('expect 400', status === 400)
    check('message Invalid AI analysis ID', body.message === 'Invalid AI analysis ID')
  }

  // ── 5. Nonexistent analysis ─────────────────────────────
  console.log('\n[5] DELETE well-formed but nonexistent id (expect 404)')
  {
    const fakeId = new mongoose.Types.ObjectId()
    const { status, body } = await req('DELETE', `${BASE_ANALYSES}/${fakeId}`, undefined, authH(userA.token))
    check('expect 404', status === 404)
    check('message AI analysis not found', body.message === 'AI analysis not found')
  }

  // ── 6. Ownership isolation ──────────────────────────────
  console.log('\n[6] Cross-user delete (userB deletes userA analysis)')
  {
    const { status, body } = await req(
      'DELETE',
      `${BASE_ANALYSES}/${analysisA2._id}`,
      undefined,
      authH(userB.token)
    )
    check('expect 404', status === 404)
    check('message AI analysis not found', body.message === 'AI analysis not found')
    const stillThere = await AIAnalysis.countDocuments({ user: userA.userId, job: jobA1 })
    check('userA analysis still exists (count=1)', stillThere === 1)
  }

  // ── 7. UserB deletes own analysis + idempotency ─────────
  console.log('\n[7] UserB deletes own analysis, then delete again (expect 404)')
  {
    const ok = await req(
      'DELETE',
      `${BASE_ANALYSES}/${analysisB1._id}`,
      undefined,
      authH(userB.token)
    )
    check('userB delete own analysis returns 200', ok.status === 200)
    const gone = await AIAnalysis.countDocuments({ user: userB.userId, job: jobB1 })
    check('userB analysis removed (count=0)', gone === 0)
    const again = await req(
      'DELETE',
      `${BASE_ANALYSES}/${analysisB1._id}`,
      undefined,
      authH(userB.token)
    )
    check('delete already-deleted returns 404', again.status === 404)
  }

  // ── 8. List / summary coherence ─────────────────────────
  console.log('\n[8] List and summary reflect deletion')
  {
    let { status, body } = await req('GET', BASE_ANALYSES, undefined, authH(userA.token))
    check('expect 200', status === 200)
    const list = body.data?.analyses ?? []
    check('list contains exactly 1 analysis (jobA1)', list.length === 1 && String(list[0]?.job?._id) === jobA1)

    let summary = (await req('GET', `${BASE_ANALYSES}/summary`, undefined, authH(userA.token))).body.data?.summary
    check('summary totalAnalyses === 1', summary?.totalAnalyses === 1)
    check('summary matchedJobs === 1', summary?.matchedJobs === 1)

    const del = await req('DELETE', `${BASE_ANALYSES}/${analysisA2._id}`, undefined, authH(userA.token))
    check('delete remaining analysis returns 200', del.status === 200)

    const empty = await req('GET', BASE_ANALYSES, undefined, authH(userA.token))
    check('list is empty after delete', Array.isArray(empty.body.data?.analyses) && empty.body.data.analyses.length === 0)

    summary = (await req('GET', `${BASE_ANALYSES}/summary`, undefined, authH(userA.token))).body.data?.summary
    check('summary totalAnalyses === 0', summary?.totalAnalyses === 0)
    check('summary matchedJobs === 0', summary?.matchedJobs === 0)
    check('summary unmatchedJobs === 1 (jobA1 has no analysis)', summary?.unmatchedJobs === 1)
    check('summary highestMatch === null', summary?.highestMatch === null)
    check('summary averageMatchScore === 0', summary?.averageMatchScore === 0)
  }

  // ── 9. Cleanup test data ────────────────────────────────
  console.log('\n[9] Cleanup test data')
  await Job.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
  await AIAnalysis.deleteMany({ user: { $in: [userA.userId, userB.userId] } })

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