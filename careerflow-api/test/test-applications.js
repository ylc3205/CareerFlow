// Phase 6 Application Management Test Suite — 26 cases
// Run: node test-applications.js
// Requires server on port 5000 and test@example.com to exist.
// Also creates a second user (test2@example.com) to verify cross-user security.

const BASE_AUTH = 'http://localhost:5000/api/auth'
const BASE_JOBS = 'http://localhost:5000/api/jobs'
const BASE_APP = 'http://localhost:5000/api/applications'

let token = ''       // test@example.com
let token2 = ''      // test2@example.com
let jobId = ''       // job owned by user1
let jobId2 = ''      // second job for user1
let appId = ''       // application created by user1
let appId2 = ''      // user2's application (for cross-user tests)

const p = (label, status, body) => {
  console.log(`\n[${status}] ${label}`)
  console.log(JSON.stringify(body, null, 2))
}

const authH = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' })

const req = async (method, url, body, headers = {}) => {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  return { status: res.status, body: await res.json() }
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 6 — Application Tests')
  console.log('==========================================')

  // ── Setup: User 1 ─────────────────────────────────────────────
  {
    const { body } = await req('POST', `${BASE_AUTH}/login`, {
      email: 'test@example.com',
      password: 'password123',
    })
    if (!body.data?.accessToken) {
      console.error('\n[FATAL] Cannot login test@example.com. Run test-auth.js first.')
      process.exit(1)
    }
    token = body.data.accessToken
    console.log('\n[Setup] User 1: test@example.com logged in')
  }

  // ── Setup: User 2 ─────────────────────────────────────────────
  {
    // Register user2 if not exists
    await req('POST', `${BASE_AUTH}/register`, {
      email: 'test2@example.com',
      password: 'password123',
    })
    const { body } = await req('POST', `${BASE_AUTH}/login`, {
      email: 'test2@example.com',
      password: 'password123',
    })
    if (!body.data?.accessToken) {
      console.error('\n[FATAL] Cannot login test2@example.com.')
      process.exit(1)
    }
    token2 = body.data.accessToken
    console.log('[Setup] User 2: test2@example.com logged in')
  }

  // ── Setup: Create a job owned by user1 ────────────────────────
  {
    const { body } = await req('POST', BASE_JOBS, {
      title: 'Backend Developer',
      company: 'VNG Corporation',
      location: 'Ho Chi Minh City',
      employmentType: 'full-time',
      workplaceType: 'hybrid',
      skills: ['Node.js', 'MongoDB'],
    }, authH(token))
    if (!body.data?.job?._id) {
      console.error('\n[FATAL] Cannot create test job.')
      process.exit(1)
    }
    jobId = body.data.job._id
    console.log(`[Setup] Job created: ${jobId}`)
  }

  // ── Setup: Create a second job owned by user1 (for duplicate test) ─
  {
    const { body } = await req('POST', BASE_JOBS, {
      title: 'Frontend Developer',
      company: 'Tiki',
    }, authH(token))
    jobId2 = body.data?.job?._id
    console.log(`[Setup] Job 2 created: ${jobId2}`)
  }

  // ── Setup: Create a job owned by user2 (for cross-user test) ─
  {
    await req('POST', BASE_JOBS, {
      title: 'DevOps Engineer',
      company: 'Grab Vietnam',
    }, authH(token2))
    console.log('[Setup] User2 job created')
  }

  // ── POST ──────────────────────────────────────────────────────

  // 1. POST valid application
  {
    const { status, body } = await req('POST', BASE_APP, {
      job: jobId,
      status: 'applied',
      appliedAt: '2026-08-12',
      coverLetter: 'I am very interested in this role.',
      notes: 'Applied through LinkedIn.',
    }, authH(token))
    p('1. POST valid application (expect 201)', status, body)
    appId = body.data?.application?._id
    console.log(`   application._id: ${appId}`)
  }

  // 2. POST without token
  {
    const { status, body } = await req('POST', BASE_APP, { job: jobId })
    p('2. POST without token (expect 401)', status, body)
  }

  // 3. POST missing job field
  {
    const { status, body } = await req('POST', BASE_APP, {
      status: 'applied',
    }, authH(token))
    p('3. POST missing job (expect 422)', status, body)
  }

  // 4. POST invalid job ObjectId format (Zod catches it)
  {
    const { status, body } = await req('POST', BASE_APP, {
      job: 'not-an-object-id',
    }, authH(token))
    p('4. POST invalid job ObjectId (expect 422)', status, body)
  }

  // 5. POST nonexistent job (valid ObjectId, no such job)
  {
    const { status, body } = await req('POST', BASE_APP, {
      job: '6a7c000000000000000000ff',
    }, authH(token))
    p('5. POST nonexistent job (expect 404)', status, body)
  }

  // 6. POST application for another user's job (user1 tries to apply to user2's job)
  {
    // Get user2's job id
    const listRes = await req('GET', BASE_JOBS, undefined, authH(token2))
    const user2Jobs = listRes.body.data?.jobs ?? []
    const user2JobId = user2Jobs[0]?._id
    if (!user2JobId) {
      console.log('\n[SKIP] 6. Could not find user2 job for cross-user test')
    } else {
      const { status, body } = await req('POST', BASE_APP, {
        job: user2JobId,
      }, authH(token))
      p('6. POST for another user\'s job (expect 404)', status, body)
    }
  }

  // 7. POST duplicate application (same user + same job)
  {
    const { status, body } = await req('POST', BASE_APP, {
      job: jobId,
    }, authH(token))
    p('7. POST duplicate application, same user+job (expect 409)', status, body)
  }

  // 8. POST with user field in body (ownership injection)
  {
    const { status, body } = await req('POST', BASE_APP, {
      job: jobId2,
      user: '000000000000000000000000',
    }, authH(token))
    p('8. POST with user in body (expect 201, user stripped)', status, body)
    const userNotInjected = body.data?.application?.user !== '000000000000000000000000'
    console.log(`   user field injection blocked: ${userNotInjected}`)
  }

  // 9. POST with unknown fields (Zod strips them)
  {
    // Need a fresh job for this (jobId2 and jobId are taken — create another)
    const jobRes = await req('POST', BASE_JOBS, { title: 'QA Engineer', company: 'FPT' }, authH(token))
    const freshJobId = jobRes.body.data?.job?._id
    const { status, body } = await req('POST', BASE_APP, {
      job: freshJobId,
      unknownField: 'should be stripped',
    }, authH(token))
    p('9. POST with unknown fields (expect 201, unknown absent)', status, body)
    const stripped = !('unknownField' in (body.data?.application ?? {}))
    console.log(`   unknownField absent: ${stripped}`)
  }

  // ── GET list ──────────────────────────────────────────────────

  // 10. GET all applications (user1 sees only their own)
  {
    const { status, body } = await req('GET', BASE_APP, undefined, authH(token))
    p('10. GET /api/applications (expect 200 + array)', status, body)
    console.log(`   Count: ${body.data?.applications?.length ?? 0}`)
    const jobPopulated = !!body.data?.applications?.[0]?.job?.title
    console.log(`   Job populated (has title): ${jobPopulated}`)
    const noUserLeak = !body.data?.applications?.[0]?.job?.user
    console.log(`   job.user NOT exposed: ${noUserLeak}`)
  }

  // 11. GET without token
  {
    const { status, body } = await req('GET', BASE_APP)
    p('11. GET without token (expect 401)', status, body)
  }

  // ── GET one ───────────────────────────────────────────────────

  // 12. GET one valid application
  {
    const { status, body } = await req('GET', `${BASE_APP}/${appId}`, undefined, authH(token))
    p('12. GET /api/applications/:id valid (expect 200)', status, body)
  }

  // 13. GET malformed ObjectId
  {
    const { status, body } = await req('GET', `${BASE_APP}/bad-id`, undefined, authH(token))
    p('13. GET malformed ObjectId (expect 400)', status, body)
  }

  // 14. GET another user's application (user2 setup: create app for user2)
  {
    // Get user2's job
    const listRes = await req('GET', BASE_JOBS, undefined, authH(token2))
    const user2Jobs = listRes.body.data?.jobs ?? []
    const user2JobId = user2Jobs[0]?._id
    if (user2JobId) {
      const appRes = await req('POST', BASE_APP, { job: user2JobId }, authH(token2))
      appId2 = appRes.body.data?.application?._id
      console.log(`\n[Setup] User2 application created: ${appId2}`)
    }

    if (!appId2) {
      console.log('\n[SKIP] 14. Could not create user2 application')
    } else {
      const { status, body } = await req('GET', `${BASE_APP}/${appId2}`, undefined, authH(token))
      p('14. GET another user\'s application (expect 404)', status, body)
    }
  }

  // 15. GET one without token
  {
    const { status, body } = await req('GET', `${BASE_APP}/${appId}`)
    p('15. GET one without token (expect 401)', status, body)
  }

  // ── PATCH ─────────────────────────────────────────────────────

  // 16. PATCH status
  {
    const { status, body } = await req('PATCH', `${BASE_APP}/${appId}`, {
      status: 'screening',
      notes: 'Heard back from recruiter.',
    }, authH(token))
    p('16. PATCH status (expect 200)', status, body)
    console.log(`   status updated to: ${body.data?.application?.status}`)
  }

  // 17. PATCH invalid status
  {
    const { status, body } = await req('PATCH', `${BASE_APP}/${appId}`, {
      status: 'ghosted',
    }, authH(token))
    p('17. PATCH invalid status (expect 422)', status, body)
  }

  // 18. PATCH malformed ObjectId
  {
    const { status, body } = await req('PATCH', `${BASE_APP}/bad-id`, {
      status: 'screening',
    }, authH(token))
    p('18. PATCH malformed ObjectId (expect 400)', status, body)
  }

  // 19. PATCH another user's application
  {
    if (!appId2) {
      console.log('\n[SKIP] 19. No user2 application available')
    } else {
      const { status, body } = await req('PATCH', `${BASE_APP}/${appId2}`, {
        status: 'offer',
      }, authH(token))
      p('19. PATCH another user\'s application (expect 404)', status, body)
    }
  }

  // 20. PATCH attempting to change job field (Zod strips it)
  {
    const originalApp = await req('GET', `${BASE_APP}/${appId}`, undefined, authH(token))
    const originalJobId = originalApp.body.data?.application?.job?._id

    const { status, body } = await req('PATCH', `${BASE_APP}/${appId}`, {
      job: '6a7c000000000000000000ff',
      notes: 'Trying to change job',
    }, authH(token))
    p('20. PATCH attempting to change job (expect 200, job unchanged)', status, body)
    const jobUnchanged = body.data?.application?.job?._id === originalJobId ||
                         String(body.data?.application?.job) === String(originalJobId)
    console.log(`   job remains unchanged: ${jobUnchanged}`)
  }

  // 21. PATCH attempting to change user field (Zod strips it)
  {
    const { status, body } = await req('PATCH', `${BASE_APP}/${appId}`, {
      user: '000000000000000000000000',
      notes: 'Trying to change user',
    }, authH(token))
    p('21. PATCH attempting to change user (expect 200, user unchanged)', status, body)
    const userUnchanged = body.data?.application?.user !== '000000000000000000000000'
    console.log(`   user remains unchanged: ${userUnchanged}`)
  }

  // ── DELETE ────────────────────────────────────────────────────

  // 22. DELETE application
  {
    const { status, body } = await req('DELETE', `${BASE_APP}/${appId}`, undefined, authH(token))
    p('22. DELETE application (expect 200)', status, body)
  }

  // 23. GET deleted application (should 404 now)
  {
    const { status, body } = await req('GET', `${BASE_APP}/${appId}`, undefined, authH(token))
    p('23. GET deleted application (expect 404)', status, body)
  }

  // 24. DELETE nonexistent application
  {
    const { status, body } = await req('DELETE', `${BASE_APP}/${appId}`, undefined, authH(token))
    p('24. DELETE nonexistent application (expect 404)', status, body)
  }

  // 25. DELETE malformed ObjectId
  {
    const { status, body } = await req('DELETE', `${BASE_APP}/bad-id`, undefined, authH(token))
    p('25. DELETE malformed ObjectId (expect 400)', status, body)
  }

  // 26. DELETE another user's application
  {
    if (!appId2) {
      console.log('\n[SKIP] 26. No user2 application available')
    } else {
      const { status, body } = await req('DELETE', `${BASE_APP}/${appId2}`, undefined, authH(token))
      p('26. DELETE another user\'s application (expect 404)', status, body)
    }
  }

  console.log('\n==========================================')
  console.log('  Tests complete — check results above')
  console.log('==========================================')
}

run().catch(console.error)
