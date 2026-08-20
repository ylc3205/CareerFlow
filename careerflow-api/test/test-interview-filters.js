// Phase 16 Interview List Filter / Search / Pagination Test Suite
// Run: node test-interview-filters.js
//
// IMPORTANT — start the server in deterministic MOCK mode first:
//
//   1. Ensure .env contains:  AI_MOCK=true
//   2. Start the server:      node.cmd src/server.js
//   3. In another terminal:   node test-interview-filters.js
//
// This suite verifies GET /api/interviews supports status filtering,
// search through the linked application's job title/company (two-hop),
// and pagination while staying scoped to the authenticated user and
// remaining backward-compatible (data.interviews stays an array;
// pagination additive).

import 'dotenv/config'
import mongoose from 'mongoose'
import Interview from '../src/models/interview.model.js'
import Application from '../src/models/application.model.js'
import Job from '../src/models/job.model.js'

const BASE = 'http://localhost:5000/api'
const BASE_AUTH = `${BASE}/auth`
const BASE_JOBS = `${BASE}/jobs`
const BASE_APP = `${BASE}/applications`
const BASE_INT = `${BASE}/interviews`

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

const createInt = async (token, appId, title, status) => {
  const res = await req(
    'POST',
    BASE_INT,
    { application: appId, title, scheduledDate: new Date().toISOString(), status },
    authH(token)
  )
  return res.body.data?.interview?._id
}

const getList = async (token, qs = '') => {
  const { status, body } = await req('GET', `${BASE_INT}${qs}`, undefined, authH(token))
  return { status, body }
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 16 — Interview List Filter/Search/Pagination Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Setup ───────────────────────────────────────────────
  console.log('\n[Setup] Preparing test users and data...')

  const userA = await ensureUser('interviewfilter-a@example.com')
  const userB = await ensureUser('interviewfilter-b@example.com')

  // Clear leftover data from previous runs so this suite is deterministic.
  await Interview.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
  await Application.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
  await Job.deleteMany({ user: { $in: [userA.userId, userB.userId] } })

  // userA: 4 jobs/apps, 5 interviews with distinct statuses and searchable companies.
  const job1 = await createJob(userA.token, 'Backend Developer', 'VNG')
  const job2 = await createJob(userA.token, 'Frontend Developer', 'Shopee')
  const job3 = await createJob(userA.token, 'DevOps Engineer', 'Grab')
  const job4 = await createJob(userA.token, 'Backend Engineer', 'Tiki')

  const app1 = await createApp(userA.token, job1, 'applied')
  const app2 = await createApp(userA.token, job2, 'interviewing')
  const app3 = await createApp(userA.token, job3, 'offer')
  const app4 = await createApp(userA.token, job4, 'rejected')

  const int1 = await createInt(userA.token, app1, 'VNG Screening', 'scheduled')
  const int2 = await createInt(userA.token, app1, 'VNG Tech Round', 'completed')
  const int3 = await createInt(userA.token, app2, 'Shopee HR Call', 'canceled')
  const int4 = await createInt(userA.token, app3, 'Grab Onsite', 'no-show')
  const int5 = await createInt(userA.token, app4, 'Tiki Final', 'scheduled')

  // userB: 1 job + app + interview (ownership isolation).
  const jobB1 = await createJob(userB.token, 'QA Engineer', 'FPT')
  const appB1 = await createApp(userB.token, jobB1, 'applied')
  const intB1 = await createInt(userB.token, appB1, 'FPT Interview', 'scheduled')

  console.log('[Setup] Done. userA ints=%s,%s,%s,%s,%s userB int=%s', int1, int2, int3, int4, int5, intB1)

  // ── 1. Status filter ────────────────────────────────────
  console.log('\n[1] Filter by status (userA)')
  {
    const { status, body } = await getList(userA.token, '?status=scheduled')
    check('expect 200', status === 200)
    check('expect success=true', body.success === true)
    const ints = body.data?.interviews ?? []
    check('only scheduled interviews returned', ints.length === 2 && ints.every((i) => i.status === 'scheduled'))
    const ids = ints.map((i) => String(i._id))
    check('contains int1 and int5', ids.includes(int1) && ids.includes(int5))
    check('pagination total === 2', body.data?.pagination?.total === 2)

    const completed = await getList(userA.token, '?status=completed')
    const completedIds = (completed.body.data?.interviews ?? []).map((i) => String(i._id))
    check('completed filter returns int2', completedIds.length === 1 && completedIds[0] === int2)

    const canceled = await getList(userA.token, '?status=canceled')
    const canceledIds = (canceled.body.data?.interviews ?? []).map((i) => String(i._id))
    check('canceled filter returns int3', canceledIds.length === 1 && canceledIds[0] === int3)

    const noShow = await getList(userA.token, '?status=no-show')
    const noShowIds = (noShow.body.data?.interviews ?? []).map((i) => String(i._id))
    check('no-show filter returns int4', noShowIds.length === 1 && noShowIds[0] === int4)
  }

  // ── 2. Search by linked job title / company (two-hop) ───
  console.log('\n[2] Search by linked job title/company (userA)')
  {
    const byTitle = await getList(userA.token, '?search=backend')
    const tInts = byTitle.body.data?.interviews ?? []
    const tIds = tInts.map((i) => String(i._id))
    check('search "backend" matches title (int1, int2, int5)', tInts.length === 3 && tIds.includes(int1) && tIds.includes(int2) && tIds.includes(int5))
    check('pagination total === 3', byTitle.body.data?.pagination?.total === 3)

    const byCompany = await getList(userA.token, '?search=shopee')
    const cIds = (byCompany.body.data?.interviews ?? []).map((i) => String(i._id))
    check('search "shopee" matches company (int3)', cIds.length === 1 && cIds[0] === int3)

    const caseInsensitive = await getList(userA.token, '?search=TIKI')
    const ciIds = (caseInsensitive.body.data?.interviews ?? []).map((i) => String(i._id))
    check('search is case-insensitive', ciIds.length === 1 && ciIds[0] === int5)
  }

  // ── 3. Combined status + search ─────────────────────────
  console.log('\n[3] Combined status + search (userA)')
  {
    const { body } = await getList(userA.token, '?status=scheduled&search=backend')
    const ints = body.data?.interviews ?? []
    const ids = ints.map((i) => String(i._id))
    check('only scheduled AND matching "backend"', ints.length === 2 && ids.includes(int1) && ids.includes(int5))
    check('pagination total === 2', body.data?.pagination?.total === 2)
  }

  // ── 4. Pagination ───────────────────────────────────────
  console.log('\n[4] Pagination (userA, 5 ints, limit=2)')
  {
    const p1 = await getList(userA.token, '?page=1&limit=2')
    const p1Ints = p1.body.data?.interviews ?? []
    const p1Ids = p1Ints.map((i) => String(i._id))
    // Newest-first ordering: int5 and int4 were created last.
    check('page 1 returns 2 interviews', p1Ints.length === 2)
    check('page 1 has newest ints (int5, int4)', p1Ids.includes(int5) && p1Ids.includes(int4))
    check('page 1 pagination', p1.body.data?.pagination?.page === 1 && p1.body.data?.pagination?.limit === 2)
    check('total === 5', p1.body.data?.pagination?.total === 5)
    check('totalPages === 3', p1.body.data?.pagination?.totalPages === 3)

    const p2 = await getList(userA.token, '?page=2&limit=2')
    const p2Ints = p2.body.data?.interviews ?? []
    const p2Ids = p2Ints.map((i) => String(i._id))
    check('page 2 returns next 2 interviews', p2Ints.length === 2)
    check('page 2 has middle ints (int3, int2)', p2Ids.includes(int3) && p2Ids.includes(int2))
    check('page 2 pagination.page === 2', p2.body.data?.pagination?.page === 2)
  }

  // ── 5. Page/limit normalization ─────────────────────────
  console.log('\n[5] page/limit normalization and clamp (userA)')
  {
    const junk = await getList(userA.token, '?page=abc&limit=xyz')
    check('non-numeric page/limit fall back to defaults', junk.body.data?.pagination?.page === 1 && junk.body.data?.pagination?.limit === 20)

    const clamp = await getList(userA.token, '?limit=500')
    check('limit clamped to 100', clamp.body.data?.pagination?.limit === 100)
    check('clamped limit still returns all ints', (clamp.body.data?.interviews ?? []).length === 5)

    const beyond = await getList(userA.token, '?page=99&limit=20')
    check('page beyond range returns empty interviews', (beyond.body.data?.interviews ?? []).length === 0)
    check('page beyond range keeps total === 5', beyond.body.data?.pagination?.total === 5)
  }

  // ── 6. Empty / edge search ──────────────────────────────
  console.log('\n[6] Empty and edge searches (userA)')
  {
    const noMatch = await getList(userA.token, '?search=zzzzz')
    check('search with no match returns empty', (noMatch.body.data?.interviews ?? []).length === 0)
    check('no-match search total === 0', noMatch.body.data?.pagination?.total === 0)

    const wsSearch = await getList(userA.token, '?search=%20%20')
    check('whitespace search ignored (returns all 5)', (wsSearch.body.data?.interviews ?? []).length === 5)

    const regexChars = await getList(userA.token, `?search=${encodeURIComponent('.*+?^${}[]')}`)
    check('regex special chars do not crash (empty result)', regexChars.status === 200 && (regexChars.body.data?.interviews ?? []).length === 0)
  }

  // ── 7. application + search intersection ────────────────
  console.log('\n[7] application + search intersection (userA)')
  {
    const bothMatch = await getList(userA.token, `?application=${app1}&search=backend`)
    const mIds = (bothMatch.body.data?.interviews ?? []).map((i) => String(i._id))
    check('application + matching search returns app1 ints', bothMatch.status === 200 && mIds.includes(int1) && mIds.includes(int2))

    const noCross = await getList(userA.token, `?application=${app1}&search=shopee`)
    check('application + non-matching search returns empty', (noCross.body.data?.interviews ?? []).length === 0)
  }

  // ── 8. Empty state (valid status, no matches) ───────────
  console.log('\n[8] Status matching nothing (userA)')
  {
    const { status, body } = await getList(userA.token, '?status=canceled&search=backend')
    check('expect 200', status === 200)
    check('interviews is empty array', Array.isArray(body.data?.interviews) && body.data.interviews.length === 0)
    check('total === 0', body.data?.pagination?.total === 0)
    check('totalPages === 0', body.data?.pagination?.totalPages === 0)
  }

  // ── 9. Authentication failure ───────────────────────────
  console.log('\n[9] GET /api/interviews without / with invalid token (expect 401)')
  {
    const noToken = await req('GET', `${BASE_INT}?status=scheduled`)
    check('expect 401 without token', noToken.status === 401)
    check('expect success=false', noToken.body.success === false)
    const badToken = await req('GET', `${BASE_INT}?status=scheduled`, undefined, {
      Authorization: 'Bearer not-a-valid-token',
    })
    check('expect 401 with invalid token', badToken.status === 401)
  }

  // ── 10. Validation failure ──────────────────────────────
  console.log('\n[10] Invalid status / application (expect 400)')
  {
    const badStatus = await getList(userA.token, '?status=ghosted')
    check('expect 400', badStatus.status === 400)
    check('message Invalid status filter', badStatus.body.message === 'Invalid status filter')

    const badApp = await getList(userA.token, '?application=notanid')
    check('expect 400', badApp.status === 400)
    check('message Invalid application ID', badApp.body.message === 'Invalid application ID')
  }

  // ── 11. Ownership isolation ─────────────────────────────
  console.log('\n[11] Cross-user isolation (userB sees only own interviews)')
  {
    const { body } = await getList(userB.token, '?status=scheduled')
    const ids = (body.data?.interviews ?? []).map((i) => String(i._id))
    check('userB sees own scheduled interview', ids.length === 1 && ids[0] === intB1)
    check('userB does NOT see userA interviews', !ids.includes(int1) && !ids.includes(int5))

    const userAList = await getList(userA.token)
    const aIds = (userAList.body.data?.interviews ?? []).map((i) => String(i._id))
    check('userA does NOT see userB interview', !aIds.includes(intB1))

    // Search must only resolve the caller's own jobs/applications.
    const fptSearch = await getList(userA.token, '?search=fpt')
    check('userA search does not resolve userB job (FPT)', (fptSearch.body.data?.interviews ?? []).length === 0)

    // application param scoped to own interviews.
    const otherApp = await getList(userA.token, `?application=${appB1}`)
    check('userA ?application=<userB app> returns empty', (otherApp.body.data?.interviews ?? []).length === 0)
  }

  // ── 12. No query params (backward compatible) ───────────
  console.log('\n[12] No query params — all interviews, newest-first')
  {
    const { status, body } = await getList(userA.token)
    check('expect 200', status === 200)
    check('data.interviews is an array', Array.isArray(body.data?.interviews))
    const ints = body.data?.interviews ?? []
    check('returns all 5 interviews', ints.length === 5)
    check('pagination present (additive)', body.data?.pagination?.total === 5 && body.data?.pagination?.totalPages === 1)
    const ids = ints.map((i) => String(i._id))
    check('newest interview first (int5)', ids[0] === int5)
    const jobPopulated = ints.every((i) => typeof i.application?.job?.title === 'string' && typeof i.application?.job?.company === 'string')
    check('job populated on all interviews', jobPopulated)
  }

  // ── 13. Existing ?application= filter (backward compatible) ──
  console.log('\n[13] GET /api/interviews?application=<id> still works')
  {
    const { status, body } = await getList(userA.token, `?application=${app1}`)
    check('expect 200', status === 200)
    const ids = (body.data?.interviews ?? []).map((i) => String(i._id))
    check('returns only app1 interviews (int1, int2)', ids.length === 2 && ids.includes(int1) && ids.includes(int2))
    check('pagination total === 2', body.data?.pagination?.total === 2)
  }

  // ── 14. Cleanup test data ───────────────────────────────
  console.log('\n[14] Cleanup test data')
  await Interview.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
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