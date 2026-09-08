// Stage 7.3 — Career Direction AI Generation Behavioral Test Suite
// Run with: node test/test-career-direction-generation.js
//
// Start the server first with AI_MOCK enabled (deterministic AI, no Gemini calls):
//   $env:PORT='5001'; $env:AI_MOCK='true'; node src/server.js
//
// Then run this suite:
//   $env:TEST_API_PORT='5001'; node test/test-career-direction-generation.js

import 'dotenv/config'
import mongoose from 'mongoose'
import CareerDirection from '../src/models/careerDirection.model.js'

const API_PORT = process.env.TEST_API_PORT || 5000
const BASE = `http://localhost:${API_PORT}/api`
const BASE_AUTH = `${BASE}/auth`
const BASE_GEN = `${BASE}/career-directions/generate`

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

const VALID_CONTEXT_SOURCES = { resume: false, profile: false, existingDirections: false }

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Stage 7.3 — Career Direction AI Generation Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // Setup user
  const user = await ensureUser('cd-gen-user@example.com')

  // Clean up any leftovers from previous runs
  await CareerDirection.deleteMany({ user: user.userId })

  // Persistence boundary: capture baseline BEFORE any generation request
  const beforeCount = await CareerDirection.countDocuments({ user: user.userId })
  check('beforeCount captured', Number.isFinite(beforeCount))

  // ══════════════════ VALID GENERATION ══════════════════
  console.log('\n[1] Valid Generation')

  // A. AI from Idea
  {
    const { status, body } = await req(
      'POST',
      BASE_GEN,
      {
        mode: 'ai_from_idea',
        userIdea: 'I want to be a backend developer',
        contextSources: VALID_CONTEXT_SOURCES,
      },
      authH(user.token)
    )
    check('ai_from_idea -> 200', status === 200)
    check('ai_from_idea success === true', body.success === true)
    check('ai_from_idea generatedDirection exists', Boolean(body.data?.generatedDirection))
    check('ai_from_idea metadata exists', Boolean(body.data?.metadata))
    check('ai_from_idea metadata.mode === ai_from_idea', body.data?.metadata?.mode === 'ai_from_idea')
    check('ai_from_idea metadata.userIdea echoed', body.data?.metadata?.userIdea === 'I want to be a backend developer')
    check('ai_from_idea title present', typeof body.data?.generatedDirection?.title === 'string' && body.data.generatedDirection.title.length > 0)
    check('ai_from_idea focusSkills is array', Array.isArray(body.data?.generatedDirection?.focusSkills))
    check('ai_from_idea targetRoles is array', Array.isArray(body.data?.generatedDirection?.targetRoles))
    check('ai_from_idea baseType === resume (mock)', body.data?.generatedDirection?.baseType === 'resume')
  }

  // B. AI from Background
  {
    const { status, body } = await req(
      'POST',
      BASE_GEN,
      {
        mode: 'ai_from_background',
        contextSources: { resume: true, profile: false, existingDirections: false },
      },
      authH(user.token)
    )
    check('ai_from_background -> 200', status === 200)
    check('ai_from_background success === true', body.success === true)
    check('ai_from_background generatedDirection exists', Boolean(body.data?.generatedDirection))
    check('ai_from_background metadata exists', Boolean(body.data?.metadata))
    check('ai_from_background metadata.mode === ai_from_background', body.data?.metadata?.mode === 'ai_from_background')
    check('ai_from_background contextSources includes resume', Array.isArray(body.data?.metadata?.contextSources) && body.data.metadata.contextSources.includes('resume'))
    check('ai_from_background title present', typeof body.data?.generatedDirection?.title === 'string' && body.data.generatedDirection.title.length > 0)
  }

  // C. Template Based
  {
    const { status, body } = await req(
      'POST',
      BASE_GEN,
      {
        mode: 'template_based',
        templateRole: 'Developer',
        contextSources: VALID_CONTEXT_SOURCES,
      },
      authH(user.token)
    )
    check('template_based -> 200', status === 200)
    check('template_based success === true', body.success === true)
    check('template_based generatedDirection exists', Boolean(body.data?.generatedDirection))
    check('template_based metadata exists', Boolean(body.data?.metadata))
    check('template_based metadata.mode === template_based', body.data?.metadata?.mode === 'template_based')
    check('template_based title present', typeof body.data?.generatedDirection?.title === 'string' && body.data.generatedDirection.title.length > 0)
  }

  // ══════════════════ INVALID REQUESTS ══════════════════
  console.log('\n[2] Invalid Requests')

  // 1. Missing mode
  {
    const { status } = await req(
      'POST',
      BASE_GEN,
      { userIdea: 'I want to be a backend developer', contextSources: VALID_CONTEXT_SOURCES },
      authH(user.token)
    )
    check('missing mode -> 422', status === 422)
  }

  // 2. Invalid mode
  {
    const { status } = await req(
      'POST',
      BASE_GEN,
      { mode: 'invalid', userIdea: 'I want to be a backend developer', contextSources: VALID_CONTEXT_SOURCES },
      authH(user.token)
    )
    check('invalid mode -> 422', status === 422)
  }

  // 3. manual mode is not a generation mode
  {
    const { status } = await req(
      'POST',
      BASE_GEN,
      { mode: 'manual', userIdea: 'I want to be a backend developer', contextSources: VALID_CONTEXT_SOURCES },
      authH(user.token)
    )
    check('mode manual -> 422', status === 422)
  }

  // 4. Missing required contextSources
  {
    const { status } = await req(
      'POST',
      BASE_GEN,
      { mode: 'ai_from_idea', userIdea: 'I want to be a backend developer' },
      authH(user.token)
    )
    check('missing contextSources -> 422', status === 422)
  }

  // 5. ai_from_idea without userIdea
  {
    const { status } = await req(
      'POST',
      BASE_GEN,
      { mode: 'ai_from_idea', contextSources: VALID_CONTEXT_SOURCES },
      authH(user.token)
    )
    check('ai_from_idea without userIdea -> 422', status === 422)
  }

  // 6. template_based without templateRole
  {
    const { status } = await req(
      'POST',
      BASE_GEN,
      { mode: 'template_based', contextSources: VALID_CONTEXT_SOURCES },
      authH(user.token)
    )
    check('template_based without templateRole -> 422', status === 422)
  }

  // 7. ai_from_background without context or userIdea
  {
    const { status } = await req(
      'POST',
      BASE_GEN,
      { mode: 'ai_from_background', contextSources: VALID_CONTEXT_SOURCES },
      authH(user.token)
    )
    check('ai_from_background without context or idea -> 422', status === 422)
  }

  // ══════════════════ AUTHENTICATION ══════════════════
  console.log('\n[3] Authentication')

  // 8. Unauthenticated generate rejected
  {
    const { status } = await req('POST', BASE_GEN, {
      mode: 'ai_from_idea',
      userIdea: 'I want to be a backend developer',
      contextSources: VALID_CONTEXT_SOURCES,
    })
    check('unauthenticated generate -> 401', status === 401)
  }

  // ══════════════════ PERSISTENCE BOUNDARY ══════════════════
  console.log('\n[4] Persistence Boundary')

  const afterCount = await CareerDirection.countDocuments({ user: user.userId })
  check('generation created no CareerDirection records', afterCount === beforeCount)

  // ── Cleanup ─────────────────────────────────────────
  console.log('\n[5] Cleanup')
  await CareerDirection.deleteMany({ user: user.userId })

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