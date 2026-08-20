// Phase 18 — Frontend Regression Contract Test Suite
// Run: node test-regressions.js
//
// Verifies the backend contract that the approved FE3/FE5 regression fixes
// rely on:
//   1. Optional free-text fields accept '' so the frontend can clear them
//      (applications, interviews, jobs).
//   2. Date-only fields round-trip as YYYY-MM-DD at UTC midnight.
//   3. List endpoints return an empty page with page > totalPages when
//      over-running — the precondition the frontend pagination clamp guards.
//
// Start the server first:  node.cmd src/server.js

import 'dotenv/config'
import mongoose from 'mongoose'
import Job from '../src/models/job.model.js'
import Application from '../src/models/application.model.js'
import Interview from '../src/models/interview.model.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_APP = `${BASE}/applications`
const BASE_INT = `${BASE}/interviews`

// Complexity-valid fixture password (lowercase + uppercase + digit + special).
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

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 18 — Regression Contract Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  const main = await ensureUser('reg-main@example.com')
  await Job.deleteMany({ user: main.userId })
  await Application.deleteMany({ user: main.userId })
  await Interview.deleteMany({ user: main.userId })

  const jobRes = await req('POST', BASE_JOBS, { title: 'Regression Job', company: 'Regression Co' }, authH(main.token))
  const jobId = jobRes.body.data.job._id
  const appRes = await req('POST', BASE_APP, { job: jobId }, authH(main.token))
  const appId = appRes.body.data.application._id
  const intRes = await req('POST', BASE_INT, {
    application: appId,
    title: 'Regression Interview',
    type: 'video',
    scheduledDate: '2026-09-01',
  }, authH(main.token))
  const intId = intRes.body.data.interview._id

  // ── 1. Application optional fields can be cleared ───────
  console.log('\n[1] Application optional fields (coverLetter, notes)')
  {
    const set = await req('PATCH', `${BASE_APP}/${appId}`, { coverLetter: 'Cover', notes: 'Notes' }, authH(main.token))
    check('PATCH sets values -> 200', set.status === 200)
    check('coverLetter stored', set.body.data.application.coverLetter === 'Cover')
    check('notes stored', set.body.data.application.notes === 'Notes')

    const clear = await req('PATCH', `${BASE_APP}/${appId}`, { coverLetter: '', notes: '' }, authH(main.token))
    check('PATCH clears with empty strings -> 200', clear.status === 200)
    check('coverLetter cleared to empty string', clear.body.data.application.coverLetter === '')
    check('notes cleared to empty string', clear.body.data.application.notes === '')

    const got = await req('GET', `${BASE_APP}/${appId}`, undefined, authH(main.token))
    check('cleared values persist on GET', got.body.data.application.coverLetter === '' && got.body.data.application.notes === '')
  }

  // ── 2. Interview optional fields can be cleared ─────────
  console.log('\n[2] Interview optional fields (interviewerNames, meetingLink, location, notes, feedback)')
  {
    const set = await req('PATCH', `${BASE_INT}/${intId}`, {
      interviewerNames: 'Alice',
      meetingLink: 'https://meet.example.com/abc',
      location: 'HQ',
      notes: 'Notes',
      feedback: 'Good',
    }, authH(main.token))
    check('PATCH sets values -> 200', set.status === 200)
    const applied = set.body.data.interview
    check('interviewerNames stored', applied.interviewerNames === 'Alice')
    check('meetingLink stored', applied.meetingLink === 'https://meet.example.com/abc')
    check('location stored', applied.location === 'HQ')
    check('notes stored', applied.notes === 'Notes')
    check('feedback stored', applied.feedback === 'Good')

    const clear = await req('PATCH', `${BASE_INT}/${intId}`, {
      interviewerNames: '',
      meetingLink: '',
      location: '',
      notes: '',
      feedback: '',
    }, authH(main.token))
    check('PATCH clears with empty strings -> 200', clear.status === 200)
    const cleared = clear.body.data.interview
    check('interviewerNames cleared', cleared.interviewerNames === '')
    check('meetingLink cleared', cleared.meetingLink === '')
    check('location cleared', cleared.location === '')
    check('notes cleared', cleared.notes === '')
    check('feedback cleared', cleared.feedback === '')
  }

  // ── 3. Job optional fields can be cleared ───────────────
  console.log('\n[3] Job optional fields (description, notes, sourceUrl, location)')
  {
    const set = await req('PATCH', `${BASE_JOBS}/${jobId}`, {
      description: 'Desc',
      notes: 'Notes',
      sourceUrl: 'https://example.com/job',
      location: 'Remote',
    }, authH(main.token))
    check('PATCH sets values -> 200', set.status === 200)
    check('description stored', set.body.data.job.description === 'Desc')
    check('notes stored', set.body.data.job.notes === 'Notes')
    check('sourceUrl stored', set.body.data.job.sourceUrl === 'https://example.com/job')
    check('location stored', set.body.data.job.location === 'Remote')

    const clear = await req('PATCH', `${BASE_JOBS}/${jobId}`, {
      description: '',
      notes: '',
      sourceUrl: '',
      location: '',
    }, authH(main.token))
    check('PATCH clears with empty strings -> 200', clear.status === 200)
    const cleared = clear.body.data.job
    check('description cleared', cleared.description === '')
    check('notes cleared', cleared.notes === '')
    check('sourceUrl cleared (removed, not stale)', !cleared.sourceUrl)
    check('location cleared', cleared.location === '')

    const got = await req('GET', `${BASE_JOBS}/${jobId}`, undefined, authH(main.token))
    check('cleared job values persist on GET', got.body.data.job.description === '' && !got.body.data.job.sourceUrl)
  }

  // ── 4. Date-only values round-trip exactly ──────────────
  console.log('\n[4] Date-only values preserve exact YYYY-MM-DD (UTC midnight)')
  {
    const set = await req('PATCH', `${BASE_JOBS}/${jobId}`, { deadline: '2026-08-18' }, authH(main.token))
    check('PATCH job deadline -> 200', set.status === 200)
    check('deadline stored at UTC midnight 2026-08-18', /^2026-08-18T00:00:00\.000Z$/.test(set.body.data.job.deadline))

    const got = await req('GET', `${BASE_JOBS}/${jobId}`, undefined, authH(main.token))
    check('deadline preserved on GET (round-trips 2026-08-18)', /^2026-08-18T00:00:00/.test(got.body.data.job.deadline))

    const setApplied = await req('PATCH', `${BASE_APP}/${appId}`, { appliedAt: '2026-08-18' }, authH(main.token))
    check('PATCH application appliedAt -> 200', setApplied.status === 200)
    check('appliedAt stored at UTC midnight 2026-08-18', /^2026-08-18T00:00:00\.000Z$/.test(setApplied.body.data.application.appliedAt))
  }

  // ── 5. Pagination over-run precondition ─────────────────
  console.log('\n[5] List over-run returns empty page with page > totalPages')
  {
    // 21 more jobs -> 22 total -> 2 pages of 20. Request page 3 (over-run).
    for (let i = 0; i < 21; i++) {
      await req('POST', BASE_JOBS, { title: `Overflow Job ${i}`, company: 'Overflow Co' }, authH(main.token))
    }
    const page2 = await req('GET', `${BASE_JOBS}?page=2&limit=20`, undefined, authH(main.token))
    check('page 2 -> 200 with remaining items', page2.status === 200 && page2.body.data.jobs.length === 2)
    check('page 2 totalPages == 2', page2.body.data.pagination.totalPages === 2)

    const page3 = await req('GET', `${BASE_JOBS}?page=3&limit=20`, undefined, authH(main.token))
    check('over-run page 3 -> 200 with empty jobs', page3.status === 200 && page3.body.data.jobs.length === 0)
    check('over-run reports page 3 > totalPages 2', page3.body.data.pagination.page === 3 && page3.body.data.pagination.totalPages === 2)
  }

  // ── 6. Cleanup test data ────────────────────────────────
  console.log('\n[6] Cleanup test data')
  await Job.deleteMany({ user: main.userId })
  await Application.deleteMany({ user: main.userId })
  await Interview.deleteMany({ user: main.userId })

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