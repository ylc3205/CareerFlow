// Phase 10 AI Analysis Persistence Test Suite
// Run: node test-ai-analysis.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-ai-analysis.js
//
// This suite verifies that AI match results are persisted to MongoDB
// and reused on subsequent requests without re-calling the AI provider.

import 'dotenv/config'
import mongoose from 'mongoose'
import Profile from './src/models/profile.model.js'
import AIAnalysis from './src/models/aiAnalysis.model.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_PROFILE = `${BASE}/profile`

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

const deleteAnalysisDirectly = async (userId, jobId) => {
  await AIAnalysis.deleteMany({ user: userId, job: jobId })
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 10 — AI Analysis Persistence Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const userA = await ensureUser('aianalysis-a@example.com')
  const userB = await ensureUser('aianalysis-b@example.com')
  const noData = await ensureUser('aianalysis-nodata@example.com')

  // userA: add profile details (has profile data)
  await req('PATCH', BASE_PROFILE, {
    skills: ['Node.js', 'Express.js', 'MongoDB'],
    experience: [
      { company: 'TechCorp', position: 'Backend Intern', description: 'Built REST APIs with Node.js.', startDate: '2023-06-01', current: true },
    ],
  }, authH(userA.token))

  // noData: delete auto-created profile, no resume -> NEITHER
  await deleteProfileDirectly(noData.userId)

  // Jobs
  const jobARes = await req('POST', BASE_JOBS, {
    title: 'Backend Developer',
    company: 'VNG',
    description: 'Build REST APIs with Node.js, Express and MongoDB.',
    requirements: 'Node.js, Express, MongoDB.',
    responsibilities: 'Design and maintain APIs.',
    skills: ['Node.js', 'Express.js', 'MongoDB'],
  }, authH(userA.token))
  const jobA = jobARes.body.data?.job?._id

  const jobNoDataRes = await req('POST', BASE_JOBS, { title: 'QA Engineer', company: 'FPT' }, authH(noData.token))
  const jobNoData = jobNoDataRes.body.data?.job?._id

  console.log('[Setup] Done. jobA=%s jobNoData=%s', jobA, jobNoData)

  const matchUrl = (id) => `${BASE_JOBS}/${id}/match`

  // ── 1. First Match ───────────────────────────────────────
  console.log('\n[1] First match request (userA, jobA)')
  let firstResponse = null
  {
    const { status, body } = await req('POST', matchUrl(jobA), {}, authH(userA.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    check('expect data.match present', !!body.data?.match)

    const count = await AIAnalysis.countDocuments({ user: userA.userId, job: jobA })
    check('AIAnalysis created in MongoDB (count=1)', count === 1)

    firstResponse = body.data?.match
  }

  // ── 2. Analysis Exists (reuse, no AI re-call) ───────────
  console.log('\n[2] Second match request (should reuse persisted analysis)')
  {
    const { status, body } = await req('POST', matchUrl(jobA), {}, authH(userA.token))
    console.log(`  [${status}]`)
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)

    const sameMatch = JSON.stringify(body.data?.match) === JSON.stringify(firstResponse)
    check('same persisted analysis returned', sameMatch)

    const count = await AIAnalysis.countDocuments({ user: userA.userId, job: jobA })
    check('no new analysis created (count still 1)', count === 1)
  }

  // ── 3. Database Verification ────────────────────────────
  console.log('\n[3] Direct MongoDB verification')
  {
    const count = await AIAnalysis.countDocuments({ user: userA.userId, job: jobA })
    check('countDocuments({user, job}) === 1', count === 1)

    const doc = await AIAnalysis.findOne({ user: userA.userId, job: jobA })
    check('persisted doc has matchScore 0-100', doc && doc.matchScore >= 0 && doc.matchScore <= 100)
    check('persisted doc has required match fields',
      doc && Array.isArray(doc.matchedSkills) && Array.isArray(doc.missingSkills) &&
      Array.isArray(doc.strengths) && Array.isArray(doc.weaknesses) && Array.isArray(doc.recommendations))
  }

  // ── 4. Unique Constraint ─────────────────────────────────
  console.log('\n[4] Unique constraint on {user, job}')
  {
    const dup = new AIAnalysis({
      user: userA.userId,
      job: jobA,
      matchScore: 50,
      matchedSkills: ['x'],
      missingSkills: [],
      strengths: [],
      weaknesses: [],
      recommendations: [],
    })
    let rejected = false
    try {
      await dup.save()
    } catch (err) {
      rejected = true
      check('duplicate rejected with code 11000', err && err.code === 11000)
    }
    check('duplicate insert rejected by database', rejected)

    const count = await AIAnalysis.countDocuments({ user: userA.userId, job: jobA })
    check('still exactly one analysis (count=1)', count === 1)
  }

  // ── 5. Cross-user Access ─────────────────────────────────
  console.log('\n[5] Cross-user access (userB tries userA jobA)')
  {
    const { status, body } = await req('POST', matchUrl(jobA), {}, authH(userB.token))
    console.log(`  [${status}]`)
    check('expect 404', status === 404)
    check('expect Job not found message', body.message === 'Job not found')

    const leaked = await AIAnalysis.countDocuments({ user: userB.userId, job: jobA })
    check('no analysis leaked to userB (count=0)', leaked === 0)
  }

  // ── 6. Missing Profile and Resume ────────────────────────
  console.log('\n[6] Missing profile and resume (noData, jobNoData)')
  {
    const { status, body } = await req('POST', matchUrl(jobNoData), {}, authH(noData.token))
    console.log(`  [${status}]`)
    check('expect 400', status === 400)
    check('expect profile/resume message', body.message === 'Please create a profile or resume to use AI matching')

    const count = await AIAnalysis.countDocuments({ user: noData.userId, job: jobNoData })
    check('no analysis created for missing-data user (count=0)', count === 0)
  }

  // ── 7. AI_MOCK mode ──────────────────────────────────────
  console.log('\n[7] AI_MOCK mode (this suite runs entirely in mock mode)')
  {
    check('AI_MOCK enabled in test env', process.env.AI_MOCK === 'true')
  }

  // ── 8. Cleanup safety (leave no cross-test pollution) ────
  await deleteAnalysisDirectly(userA.userId, jobA)

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