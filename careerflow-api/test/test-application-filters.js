// Phase 15 Application List Filter / Search / Pagination Test Suite
// Run: node test-application-filters.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-application-filters.js
//
// This suite verifies GET /api/applications supports status filtering,
// job title/company search, and pagination while staying scoped to the
// authenticated user and remaining backward-compatible (data.applications
// stays an array; pagination additive).

import 'dotenv/config'
import mongoose from 'mongoose'
import Application from '../src/models/application.model.js'
import Job from '../src/models/job.model.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_APP = `${BASE}/applications`

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
  const res = await req('POST', BASE_JOBS, { title, company }, authH(token))
  return res.body.data?.job?._id
}

const createApp = async (token, jobId, status) => {
  const res = await req('POST', BASE_APP, { job: jobId, status }, authH(token))
  return res.body.data?.application?._id
}

const getList = async (token, qs = '') => {
  const { status, body } = await req('GET', `${BASE_APP}${qs}`, undefined, authH(token))
  return { status, body }
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 15 — Application List Filter/Search/Pagination Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const userA = await ensureUser('applicationfilter-a@example.com')
  const userB = await ensureUser('applicationfilter-b@example.com')

  // Clear leftover jobs/applications from previous runs so this suite is deterministic.
  await Job.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
  await Application.deleteMany({ user: { $in: [userA.userId, userB.userId] } })

  // userA: 4 jobs with distinct statuses and searchable titles/companies.
  const job1 = await createJob(userA.token, 'Backend Developer', 'VNG')
  const job2 = await createJob(userA.token, 'Frontend Developer', 'Shopee')
  const job3 = await createJob(userA.token, 'DevOps Engineer', 'Grab')
  const job4 = await createJob(userA.token, 'Backend Engineer', 'Tiki')

  const app1 = await createApp(userA.token, job1, 'applied')
  const app2 = await createApp(userA.token, job2, 'interviewing')
  const app3 = await createApp(userA.token, job3, 'offer')
  const app4 = await createApp(userA.token, job4, 'rejected')

  // userB: 1 job + application (ownership isolation).
  const jobB1 = await createJob(userB.token, 'QA Engineer', 'FPT')
  const appB1 = await createApp(userB.token, jobB1, 'applied')

  console.log('[Setup] Done. userA apps=%s,%s,%s,%s userB app=%s', app1, app2, app3, app4, appB1)

  // ── 1. Status filter ────────────────────────────────────
  console.log('\n[1] Filter by status (userA)')
  {
    const { status, body } = await getList(userA.token, '?status=interviewing')
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    const apps = body.data?.applications ?? []
    check('only interviewing apps returned', apps.length === 1 && apps.every((a) => a.status === 'interviewing'))
    check('contains app2', apps[0]?._id === app2)
    check('pagination total === 1', body.data?.pagination?.total === 1)

    const offer = await getList(userA.token, '?status=offer')
    const offerApps = offer.body.data?.applications ?? []
    check('offer filter returns app3', offerApps.length === 1 && offerApps[0]?._id === app3)

    const rejected = await getList(userA.token, '?status=rejected')
    const rejectedApps = rejected.body.data?.applications ?? []
    check('rejected filter returns app4', rejectedApps.length === 1 && rejectedApps[0]?._id === app4)
  }

  // ── 2. Search by job title / company ────────────────────
  console.log('\n[2] Search by job title/company (userA)')
  {
    const byTitle = await getList(userA.token, '?search=backend')
    const tApps = byTitle.body.data?.applications ?? []
    const tIds = tApps.map((a) => String(a._id))
    check('search "backend" matches title (app1, app4)', tApps.length === 2 && tIds.includes(app1) && tIds.includes(app4))
    check('pagination total === 2', byTitle.body.data?.pagination?.total === 2)

    const byCompany = await getList(userA.token, '?search=shopee')
    const cApps = byCompany.body.data?.applications ?? []
    check('search "shopee" matches company (app2)', cApps.length === 1 && String(cApps[0]._id) === app2)

    const caseInsensitive = await getList(userA.token, '?search=TIKI')
    const ciApps = caseInsensitive.body.data?.applications ?? []
    check('search is case-insensitive', ciApps.length === 1 && String(ciApps[0]._id) === app4)
  }

  // ── 3. Combined status + search ─────────────────────────
  console.log('\n[3] Combined status + search (userA)')
  {
    const { body } = await getList(userA.token, '?status=applied&search=backend')
    const apps = body.data?.applications ?? []
    check('only applied AND matching "backend"', apps.length === 1 && apps[0]?._id === app1)
    check('pagination total === 1', body.data?.pagination?.total === 1)
  }

  // ── 4. Pagination ───────────────────────────────────────
  console.log('\n[4] Pagination (userA, 4 apps, limit=2)')
  {
    const p1 = await getList(userA.token, '?page=1&limit=2')
    const p1Apps = p1.body.data?.applications ?? []
    const p1Ids = p1Apps.map((a) => String(a._id))
    // Newest-first ordering: app4 and app3 were created last.
    check('page 1 returns 2 apps', p1Apps.length === 2)
    check('page 1 has newest apps (app4, app3)', p1Ids.includes(app4) && p1Ids.includes(app3))
    check('page 1 pagination', p1.body.data?.pagination?.page === 1 && p1.body.data?.pagination?.limit === 2)
    check('total === 4', p1.body.data?.pagination?.total === 4)
    check('totalPages === 2', p1.body.data?.pagination?.totalPages === 2)

    const p2 = await getList(userA.token, '?page=2&limit=2')
    const p2Apps = p2.body.data?.applications ?? []
    const p2Ids = p2Apps.map((a) => String(a._id))
    check('page 2 returns remaining 2 apps', p2Apps.length === 2)
    check('page 2 has older apps (app2, app1)', p2Ids.includes(app2) && p2Ids.includes(app1))
    check('page 2 pagination.page === 2', p2.body.data?.pagination?.page === 2)
  }

  // ── 5. Page/limit normalization ─────────────────────────
  console.log('\n[5] page/limit normalization and clamp (userA)')
  {
    const junk = await getList(userA.token, '?page=abc&limit=xyz')
    check('non-numeric page/limit fall back to defaults', junk.body.data?.pagination?.page === 1 && junk.body.data?.pagination?.limit === 20)

    const clamp = await getList(userA.token, '?limit=500')
    check('limit clamped to 100', clamp.body.data?.pagination?.limit === 100)
    check('clamped limit still returns all apps', (clamp.body.data?.applications ?? []).length === 4)

    const beyond = await getList(userA.token, '?page=99&limit=20')
    check('page beyond range returns empty apps', (beyond.body.data?.applications ?? []).length === 0)
    check('page beyond range keeps total === 4', beyond.body.data?.pagination?.total === 4)
  }

  // ── 6. Empty / edge search ──────────────────────────────
  console.log('\n[6] Empty and edge searches (userA)')
  {
    const noMatch = await getList(userA.token, '?search=zzzzz')
    check('search with no match returns empty', (noMatch.body.data?.applications ?? []).length === 0)
    check('no-match search total === 0', noMatch.body.data?.pagination?.total === 0)

    const wsSearch = await getList(userA.token, '?search=%20%20')
    check('whitespace search ignored (returns all 4)', (wsSearch.body.data?.applications ?? []).length === 4)

    const regexChars = await getList(userA.token, `?search=${encodeURIComponent('.*+?^${}[]')}`)
    check('regex special chars do not crash (empty result)', regexChars.status === 200 && (regexChars.body.data?.applications ?? []).length === 0)
  }

  // ── 7. Empty state (status with no apps) ────────────────
  console.log('\n[7] Status matching nothing (userA)')
  {
    const { status, body } = await getList(userA.token, '?status=withdrawn')
    check('expect 200', status === 200)
    check('apps is empty array', Array.isArray(body.data?.applications) && body.data.applications.length === 0)
    check('total === 0', body.data?.pagination?.total === 0)
    check('totalPages === 0', body.data?.pagination?.totalPages === 0)
  }

  // ── 8. Authentication failure ───────────────────────────
  console.log('\n[8] GET /api/applications without / with invalid token (expect 401)')
  {
    const noToken = await req('GET', `${BASE_APP}?status=applied`)
    check('expect 401 without token', noToken.status === 401)
    check('expect success=false', noToken.body.success === false)
    const badToken = await req('GET', `${BASE_APP}?status=applied`, undefined, {
      Authorization: 'Bearer not-a-valid-token',
    })
    check('expect 401 with invalid token', badToken.status === 401)
  }

  // ── 9. Validation failure ───────────────────────────────
  console.log('\n[9] Invalid status filter (expect 400)')
  {
    const { status, body } = await getList(userA.token, '?status=ghosted')
    check('expect 400', status === 400)
    check('message Invalid status filter', body.message === 'Invalid status filter')
  }

  // ── 10. Ownership isolation ─────────────────────────────
  console.log('\n[10] Cross-user isolation (userB sees only own apps)')
  {
    const { body } = await getList(userB.token, '?status=applied')
    const apps = body.data?.applications ?? []
    const ids = apps.map((a) => String(a._id))
    check('userB sees own applied app', ids.length === 1 && ids[0] === appB1)
    check('userB does NOT see userA apps', !ids.includes(app1) && !ids.includes(app2) && !ids.includes(app3) && !ids.includes(app4))

    const userAList = await getList(userA.token)
    const aIds = (userAList.body.data?.applications ?? []).map((a) => String(a._id))
    check('userA does NOT see userB app', !aIds.includes(appB1))

    // Search must only resolve the caller's own jobs.
    const fptSearch = await getList(userA.token, '?search=fpt')
    check('userA search does not resolve userB job (FPT)', (fptSearch.body.data?.applications ?? []).length === 0)
  }

  // ── 11. No query params (backward compatible) ───────────
  console.log('\n[11] No query params — all apps, newest-first')
  {
    const { status, body } = await getList(userA.token)
    check('expect 200', status === 200)
    check('data.applications is an array', Array.isArray(body.data?.applications))
    const apps = body.data?.applications ?? []
    check('returns all 4 apps', apps.length === 4)
    check('pagination present (additive)', body.data?.pagination?.total === 4 && body.data?.pagination?.totalPages === 1)
    const ids = apps.map((a) => String(a._id))
    check('newest app first (app4)', ids[0] === app4)
    const jobPopulated = apps.every((a) => typeof a.job?.title === 'string' && typeof a.job?.company === 'string')
    check('job populated on all apps', jobPopulated)
  }

  // ── 12. Cleanup test data ───────────────────────────────
  console.log('\n[12] Cleanup test data')
  await Application.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
  await Job.deleteMany({ user: { $in: [userA.userId, userB.userId] } })

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