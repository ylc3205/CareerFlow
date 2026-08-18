// Phase 5 Job Management Test Suite — 26 cases
// Run with: node test-jobs.js
// Requires server running on port 5000
// Uses test@example.com account

const BASE_AUTH = 'http://localhost:5000/api/auth'
const BASE_JOBS = 'http://localhost:5000/api/jobs'

let token = ''
let jobId1 = ''  // full job with sourceUrl
let jobId2 = ''  // minimal job (no sourceUrl)

const p = (label, status, body) => {
  console.log(`\n[${status}] ${label}`)
  console.log(JSON.stringify(body, null, 2))
}

const authH = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

const req = async (method, url, body, headers = {}) => {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  return { status: res.status, body: await res.json() }
}

const run = async () => {
  console.log('======================================')
  console.log('  CareerFlow Phase 5 — Job Tests')
  console.log('======================================')

  // Setup: login
  {
    const { body } = await req('POST', `${BASE_AUTH}/login`, {
      email: 'test@example.com',
      password: 'password123',
    })
    if (!body.data?.accessToken) {
      console.error('\n[FATAL] Could not login. Ensure test@example.com exists.')
      process.exit(1)
    }
    token = body.data.accessToken
    console.log('\n[Setup] Logged in as test@example.com')
  }

  // ── POST ──────────────────────────────────────────────────────

  // 1. POST full valid job
  {
    const { status, body } = await req('POST', BASE_JOBS, {
      title: 'Backend Developer',
      company: 'VNG Corporation',
      description: 'Join our platform team to build REST APIs.',
      location: 'Ho Chi Minh City, Vietnam',
      employmentType: 'full-time',
      workplaceType: 'hybrid',
      skills: ['Node.js', 'MongoDB', 'AWS'],
      requirements: '2+ years Node.js. Bachelor degree preferred.',
      responsibilities: 'Design APIs, code review, collaborate with frontend.',
      salary: { min: 1500, max: 2500, currency: 'USD', period: 'monthly' },
      source: 'LinkedIn',
      sourceUrl: 'https://www.linkedin.com/jobs/view/111111111',
      postedAt: '2026-08-01',
      deadline: '2026-09-01',
      status: 'saved',
      notes: 'Looks like a great fit.',
    }, authH())
    p('1. POST full valid job (expect 201)', status, body)
    jobId1 = body.data?.job?._id
  }

  // 2. POST minimal job (title + company only, no sourceUrl)
  {
    const { status, body } = await req('POST', BASE_JOBS, {
      title: 'Frontend Engineer',
      company: 'Tiki',
    }, authH())
    p('2. POST minimal job — title + company only (expect 201)', status, body)
    jobId2 = body.data?.job?._id
    const hasDefaults = body.data?.job?.status === 'saved' &&
                        Array.isArray(body.data?.job?.skills)
    console.log(`   Default status='saved', skills=[]: ${hasDefaults}`)
  }

  // 3. POST without token
  {
    const { status, body } = await req('POST', BASE_JOBS, { title: 'X', company: 'Y' })
    p('3. POST without token (expect 401)', status, body)
  }

  // 4. POST missing title
  {
    const { status, body } = await req('POST', BASE_JOBS, { company: 'Shopee' }, authH())
    p('4. POST missing title (expect 422)', status, body)
  }

  // 5. POST missing company
  {
    const { status, body } = await req('POST', BASE_JOBS, { title: 'SWE' }, authH())
    p('5. POST missing company (expect 422)', status, body)
  }

  // 6. POST invalid employmentType
  {
    const { status, body } = await req('POST', BASE_JOBS, {
      title: 'Dev', company: 'X', employmentType: 'permanent',
    }, authH())
    p('6. POST invalid employmentType (expect 422)', status, body)
  }

  // 7. POST invalid workplaceType
  {
    const { status, body } = await req('POST', BASE_JOBS, {
      title: 'Dev', company: 'X', workplaceType: 'anywhere',
    }, authH())
    p('7. POST invalid workplaceType (expect 422)', status, body)
  }

  // 8. POST invalid sourceUrl
  {
    const { status, body } = await req('POST', BASE_JOBS, {
      title: 'Dev', company: 'X', sourceUrl: 'not-a-url',
    }, authH())
    p('8. POST invalid sourceUrl (expect 422)', status, body)
  }

  // 9. POST with user field in body (ownership injection attempt)
  {
    const { status, body } = await req('POST', BASE_JOBS, {
      title: 'Injected Job',
      company: 'HackerCorp',
      user: '000000000000000000000000',
    }, authH())
    p('9. POST with user field in body (expect 201, ownership unchanged)', status, body)
    const isOwnershipCorrect = body.data?.job?.user !== '000000000000000000000000'
    console.log(`   user field stripped by Zod: ${isOwnershipCorrect}`)
  }

  // 10. POST with unknown fields (Zod strips them)
  {
    const { status, body } = await req('POST', BASE_JOBS, {
      title: 'Clean Job',
      company: 'CleanCorp',
      unknownField: 'should be gone',
    }, authH())
    p('10. POST with unknown fields (expect 201, unknown stripped)', status, body)
    const absent = !('unknownField' in (body.data?.job ?? {}))
    console.log(`   unknownField absent from response: ${absent}`)
  }

  // 11. POST duplicate sourceUrl (same user — same URL as test 1)
  {
    const { status, body } = await req('POST', BASE_JOBS, {
      title: 'Duplicate Job',
      company: 'VNG',
      sourceUrl: 'https://www.linkedin.com/jobs/view/111111111',
    }, authH())
    p('11. POST duplicate sourceUrl, same user (expect 409)', status, body)
  }

  // ── GET list ──────────────────────────────────────────────────

  // 12. GET list all jobs
  {
    const { status, body } = await req('GET', BASE_JOBS, undefined, authH())
    p('12. GET /api/jobs list (expect 200 + array)', status, body)
    console.log(`   Jobs in list: ${body.data?.jobs?.length ?? 0}`)
    const sortedDesc = (() => {
      const jobs = body.data?.jobs ?? []
      if (jobs.length < 2) return true
      return new Date(jobs[0].createdAt) >= new Date(jobs[1].createdAt)
    })()
    console.log(`   Sorted newest-first: ${sortedDesc}`)
  }

  // 13. GET list without token
  {
    const { status, body } = await req('GET', BASE_JOBS)
    p('13. GET /api/jobs without token (expect 401)', status, body)
  }

  // ── GET one ───────────────────────────────────────────────────

  // 14. GET one job by valid ID
  {
    const { status, body } = await req('GET', `${BASE_JOBS}/${jobId1}`, undefined, authH())
    p('14. GET /api/jobs/:id valid (expect 200)', status, body)
  }

  // 15. GET one job — malformed ObjectId
  {
    const { status, body } = await req('GET', `${BASE_JOBS}/not-an-id`, undefined, authH())
    p('15. GET /api/jobs/:id malformed ID (expect 400)', status, body)
  }

  // 16. GET one job — valid ObjectId but wrong user
  {
    const fakeId = '6a7c000000000000000000ff'
    const { status, body } = await req('GET', `${BASE_JOBS}/${fakeId}`, undefined, authH())
    p('16. GET /api/jobs/:id — valid ID, wrong user (expect 404)', status, body)
  }

  // 17. GET one job without token
  {
    const { status, body } = await req('GET', `${BASE_JOBS}/${jobId1}`)
    p('17. GET /api/jobs/:id without token (expect 401)', status, body)
  }

  // ── PATCH ─────────────────────────────────────────────────────

  // 18. PATCH job — status update only
  {
    const { status, body } = await req('PATCH', `${BASE_JOBS}/${jobId1}`, {
      status: 'applied',
      notes: 'Applied via email on 12 Aug.',
    }, authH())
    p('18. PATCH job status + notes (expect 200)', status, body)
    console.log(`   status updated to: ${body.data?.job?.status}`)
  }

  // 19. PATCH job — invalid status value
  {
    const { status, body } = await req('PATCH', `${BASE_JOBS}/${jobId1}`, {
      status: 'ghosted',
    }, authH())
    p('19. PATCH invalid status value (expect 422)', status, body)
  }

  // 20. PATCH job — malformed ObjectId
  {
    const { status, body } = await req('PATCH', `${BASE_JOBS}/bad-id`, { status: 'applied' }, authH())
    p('20. PATCH malformed ObjectId (expect 400)', status, body)
  }

  // 21. PATCH job belonging to another user
  {
    const fakeId = '6a7c000000000000000000ff'
    const { status, body } = await req('PATCH', `${BASE_JOBS}/${fakeId}`, { status: 'applied' }, authH())
    p('21. PATCH job not owned by user (expect 404)', status, body)
  }

  // 25. PATCH — change sourceUrl to one that already exists (E11000 on update)
  {
    const { status, body } = await req('PATCH', `${BASE_JOBS}/${jobId2}`, {
      sourceUrl: 'https://www.linkedin.com/jobs/view/111111111',
    }, authH())
    p('25. PATCH duplicate sourceUrl on existing job (expect 409)', status, body)
  }

  // ── DELETE ────────────────────────────────────────────────────

  // 22. DELETE job
  {
    const { status, body } = await req('DELETE', `${BASE_JOBS}/${jobId1}`, undefined, authH())
    p('22. DELETE /api/jobs/:id (expect 200)', status, body)
  }

  // 23. DELETE nonexistent job
  {
    const { status, body } = await req('DELETE', `${BASE_JOBS}/${jobId1}`, undefined, authH())
    p('23. DELETE already-deleted job (expect 404)', status, body)
  }

  // 24. DELETE malformed ObjectId
  {
    const { status, body } = await req('DELETE', `${BASE_JOBS}/bad-id`, undefined, authH())
    p('24. DELETE malformed ObjectId (expect 400)', status, body)
  }

  // 26. POST multiple jobs without sourceUrl — all should succeed (no index collision)
  {
    const a = await req('POST', BASE_JOBS, { title: 'No URL Job A', company: 'AnyCorpA' }, authH())
    const b = await req('POST', BASE_JOBS, { title: 'No URL Job B', company: 'AnyCorpB' }, authH())
    const c = await req('POST', BASE_JOBS, { title: 'No URL Job C', company: 'AnyCorpC' }, authH())
    const allPass = [a, b, c].every(r => r.status === 201)
    console.log(`\n[201/201/201] 26. POST multiple jobs without sourceUrl — all 201: ${allPass}`)
    if (!allPass) {
      console.log('  A:', a.status, JSON.stringify(a.body))
      console.log('  B:', b.status, JSON.stringify(b.body))
      console.log('  C:', c.status, JSON.stringify(c.body))
    }
  }

  console.log('\n======================================')
  console.log('  Tests complete — check results above')
  console.log('======================================')
}

run().catch(console.error)
