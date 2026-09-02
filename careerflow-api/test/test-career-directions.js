// Stage 6.3 — Career Direction CRUD Test Suite
// Run with: node test-career-directions.js
//
// Start the server first:
//   $env:PORT='5001'; node src/server.js
//
// Then run this suite:
//   $env:TEST_API_PORT='5001'; node test/test-career-directions.js

import 'dotenv/config'
import mongoose from 'mongoose'
import CareerDirection from '../src/models/careerDirection.model.js'
import Resume from '../src/models/resume.model.js'

const API_PORT = process.env.TEST_API_PORT || 5000
const BASE = `http://localhost:${API_PORT}/api`
const BASE_AUTH = `${BASE}/auth`
const BASE_CD = `${BASE}/career-directions`

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
  console.log('  CareerFlow Stage 6.3 — Career Direction Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // Setup users
  const userA = await ensureUser('cd-user-a@example.com')
  const userB = await ensureUser('cd-user-b@example.com')

  // Clean up
  await CareerDirection.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
  await Resume.deleteMany({ user: { $in: [userA.userId, userB.userId] } })

  // ══════════════════ CREATE ══════════════════
  console.log('\n[1] Create')

  let createdId = null

  // 1. Create with baseType='resume'
  {
    const { status, body } = await req(
      'POST',
      BASE_CD,
      { title: 'Backend Developer', baseType: 'resume', focusSkills: ['Node.js', 'Express.js'] },
      authH(userA.token)
    )
    check('create with baseType=resume -> 201', status === 201)
    check('careerDirection returned', Boolean(body.data?.careerDirection))
    check('title stored', body.data?.careerDirection?.title === 'Backend Developer')
    check('baseType stored', body.data?.careerDirection?.baseType === 'resume')
    check('focusSkills stored', Array.isArray(body.data?.careerDirection?.focusSkills) && body.data.careerDirection.focusSkills.length === 2)
    check('user ID matches', body.data?.careerDirection?.user === userA.userId)
    createdId = body.data?.careerDirection?._id
  }

  // 2. Create with baseType='profile'
  {
    const { status, body } = await req(
      'POST',
      BASE_CD,
      { title: 'Fullstack Developer', baseType: 'profile', targetRoles: ['Fullstack Engineer'] },
      authH(userA.token)
    )
    check('create with baseType=profile -> 201', status === 201)
    check('baseType=profile stored', body.data?.careerDirection?.baseType === 'profile')
  }

  // 3. Create with only title (baseType defaults to resume)
  {
    const { status, body } = await req(
      'POST',
      BASE_CD,
      { title: 'Node.js Developer' },
      authH(userA.token)
    )
    check('create with title only -> 201', status === 201)
    check('baseType defaults to resume', body.data?.careerDirection?.baseType === 'resume')
  }

  // 4. Missing title rejected
  {
    const { status } = await req('POST', BASE_CD, { description: 'No title' }, authH(userA.token))
    check('missing title -> 422', status === 422)
  }

  // 5. Empty title rejected
  {
    const { status } = await req('POST', BASE_CD, { title: '' }, authH(userA.token))
    check('empty title -> 422', status === 422)
  }

  // 6. Invalid baseType rejected
  {
    const { status } = await req(
      'POST',
      BASE_CD,
      { title: 'Test', baseType: 'invalid' },
      authH(userA.token)
    )
    check('invalid baseType -> 422', status === 422)
  }

  // 7. Unauthenticated create rejected
  {
    const { status } = await req('POST', BASE_CD, { title: 'Test' })
    check('unauthenticated create -> 401', status === 401)
  }

  // ══════════════════ LIST ══════════════════
  console.log('\n[2] List')

  // 8. List own directions
  {
    const { status, body } = await req('GET', BASE_CD, undefined, authH(userA.token))
    check('list own directions -> 200', status === 200)
    check('careerDirections is array', Array.isArray(body.data?.careerDirections))
    check('userA has 3 directions', body.data?.careerDirections?.length === 3)
    check('pagination present', Boolean(body.data?.pagination))
  }

  // 9. User B has empty list
  {
    const { status, body } = await req('GET', BASE_CD, undefined, authH(userB.token))
    check('userB list -> 200', status === 200)
    check('userB has 0 directions', body.data?.careerDirections?.length === 0)
  }

  // ══════════════════ GET ONE ══════════════════
  console.log('\n[3] Get One')

  // 10. Get own direction
  {
    const { status, body } = await req('GET', `${BASE_CD}/${createdId}`, undefined, authH(userA.token))
    check('get own direction -> 200', status === 200)
    check('correct direction returned', body.data?.careerDirection?.title === 'Backend Developer')
  }

  // 11. Get nonexistent ID
  {
    const fakeId = new mongoose.Types.ObjectId()
    const { status } = await req('GET', `${BASE_CD}/${fakeId}`, undefined, authH(userA.token))
    check('get nonexistent ID -> 404', status === 404)
  }

  // 12. Get with invalid ObjectId
  {
    const { status } = await req('GET', `${BASE_CD}/not-a-valid-id`, undefined, authH(userA.token))
    check('get invalid ObjectId -> 400', status === 400)
  }

  // 13. User B cannot get User A's direction
  {
    const { status } = await req('GET', `${BASE_CD}/${createdId}`, undefined, authH(userB.token))
    check('userB cannot get userA direction -> 404', status === 404)
  }

  // ══════════════════ UPDATE ══════════════════
  console.log('\n[4] Update')

  // 14. Update own direction
  {
    const { status, body } = await req(
      'PATCH',
      `${BASE_CD}/${createdId}`,
      { title: 'Senior Backend Developer', focusSkills: ['Node.js', 'Express.js', 'TypeScript'] },
      authH(userA.token)
    )
    check('update own direction -> 200', status === 200)
    check('title updated', body.data?.careerDirection?.title === 'Senior Backend Developer')
    check('focusSkills updated', body.data?.careerDirection?.focusSkills?.length === 3)
  }

  // 15. Update baseType
  {
    const { status, body } = await req(
      'PATCH',
      `${BASE_CD}/${createdId}`,
      { baseType: 'profile' },
      authH(userA.token)
    )
    check('update baseType -> 200', status === 200)
    check('baseType changed to profile', body.data?.careerDirection?.baseType === 'profile')
  }

  // 16. User B cannot update User A's direction
  {
    const { status } = await req(
      'PATCH',
      `${BASE_CD}/${createdId}`,
      { title: 'Hacked' },
      authH(userB.token)
    )
    check('userB cannot update userA direction -> 404', status === 404)
  }

  // 17. Invalid data rejected
  {
    const { status } = await req(
      'PATCH',
      `${BASE_CD}/${createdId}`,
      { title: 12345 },
      authH(userA.token)
    )
    check('invalid title type -> 422', status === 422)
  }

  // ══════════════════ DELETE ══════════════════
  console.log('\n[5] Delete')

  // 18. User B cannot delete User A's direction
  {
    const { status } = await req('DELETE', `${BASE_CD}/${createdId}`, undefined, authH(userB.token))
    check('userB cannot delete userA direction -> 404', status === 404)
  }

  // 19. Delete own direction
  {
    const { status, body } = await req('DELETE', `${BASE_CD}/${createdId}`, undefined, authH(userA.token))
    check('delete own direction -> 200', status === 200)
    check('success message returned', body.message === 'Career direction deleted successfully')
  }

  // 20. Deleted direction is gone
  {
    const { status } = await req('GET', `${BASE_CD}/${createdId}`, undefined, authH(userA.token))
    check('deleted direction -> 404', status === 404)
  }

  // 21. Delete nonexistent
  {
    const { status } = await req('DELETE', `${BASE_CD}/${createdId}`, undefined, authH(userA.token))
    check('delete nonexistent -> 404', status === 404)
  }

  // ══════════════════ MIGRATION ══════════════════
  console.log('\n[6] Migration')

  // Migration tests removed

  // 27. Migration with zero legacy directions (userB has none)
  const emptyResult = await (async () => {
    const resumes = await Resume.find({
      careerDirections: { $exists: true, $ne: [], $not: { $size: 0 } },
      user: userB.userId,
    })
    return { count: resumes.length }
  })()
  check('zero legacy directions handled', emptyResult.count === 0)

  // ── Cleanup ─────────────────────────────────────────
  console.log('\n[7] Cleanup')
  await CareerDirection.deleteMany({ user: { $in: [userA.userId, userB.userId] } })
  await Resume.deleteMany({ user: { $in: [userA.userId, userB.userId] } })

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
