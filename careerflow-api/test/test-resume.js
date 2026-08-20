// Phase 4 Resume CRUD Test Suite
// Run with: node.exe test-resume.js
// Requires server running on port 5000
// Uses test@example.com account from test-auth.js

const BASE_AUTH = 'http://localhost:5000/api/auth'
const BASE_RESUME = 'http://localhost:5000/api/resume'

let accessToken = ''

const print = (label, status, body) => {
  console.log(`\n[${status}] ${label}`)
  console.log(JSON.stringify(body, null, 2))
}

const authHeader = () => ({ Authorization: `Bearer ${accessToken}` })

const post = async (url, body, headers = {}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

const get = async (url, headers = {}) => {
  const res = await fetch(url, { headers })
  return { status: res.status, body: await res.json() }
}

const patch = async (url, body, headers = {}) => {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

const del = async (url, headers = {}) => {
  const res = await fetch(url, { method: 'DELETE', headers })
  return { status: res.status, body: await res.json() }
}

const run = async () => {
  console.log('======================================')
  console.log('  CareerFlow Phase 4 — Resume Tests')
  console.log('======================================')

  // Setup: login
  {
    const { body } = await post(`${BASE_AUTH}/login`, {
      email: 'test@example.com',
      password: 'Str0ng!pass',
    })
    if (!body.data?.accessToken) {
      console.error('\nCould not login. Run test-auth.js first.')
      process.exit(1)
    }
    accessToken = body.data.accessToken
    console.log('\n[Setup] Logged in as test@example.com')
  }

  // 1. GET resume — should not exist yet
  {
    const { status, body } = await get(BASE_RESUME, authHeader())
    print('1. GET /api/resume when none exists (expect 404)', status, body)
  }

  // 2. GET resume without token
  {
    const { status, body } = await get(BASE_RESUME)
    print('2. GET /api/resume without token (expect 401)', status, body)
  }

  // 3. PATCH resume — first call creates it (upsert)
  {
    const { status, body } = await patch(
      BASE_RESUME,
      {
        title: 'Backend Developer Resume',
        summary: 'Passionate backend developer with Node.js experience.',
        skills: ['Node.js', 'Express.js', 'MongoDB', 'Zod'],
        languages: ['Vietnamese', 'English'],
      },
      authHeader()
    )
    print('3. PATCH /api/resume — first call creates (upsert)', status, body)
  }

  // 4. GET resume — should now exist
  {
    const { status, body } = await get(BASE_RESUME, authHeader())
    print('4. GET /api/resume after first PATCH', status, body)
  }

  // 5. PATCH with experience + education + projects + certifications
  {
    const { status, body } = await patch(
      BASE_RESUME,
      {
        experience: [
          {
            company: 'TechCorp Vietnam',
            position: 'Backend Intern',
            description: 'Built REST APIs with Node.js and MongoDB.',
            startDate: '2023-06-01',
            current: true,
          },
        ],
        education: [
          {
            school: 'HCMUT',
            degree: 'Bachelor',
            fieldOfStudy: 'Computer Science',
            startDate: '2020-09-01',
            endDate: '2024-06-01',
          },
        ],
        projects: [
          {
            name: 'CareerFlow',
            description: 'AI-powered job tracking platform.',
            url: 'https://github.com/example/careerflow',
            techStack: ['Node.js', 'MongoDB', 'React'],
          },
        ],
        certifications: [
          {
            name: 'AWS Certified Developer',
            issuer: 'Amazon Web Services',
            issueDate: '2024-01-01',
          },
        ],
      },
      authHeader()
    )
    print('5. PATCH with all sub-document types', status, body)
  }

  // 6. PATCH subset — verify partial update (only summary changes)
  {
    const { status, body } = await patch(
      BASE_RESUME,
      { summary: 'Updated summary only.' },
      authHeader()
    )
    print('6. PATCH only summary — other fields should remain', status, body)
    const hasSkills = (body.data?.resume?.skills?.length ?? 0) > 0
    console.log(`   Skills still present after partial PATCH: ${hasSkills}`)
  }

  // 7. PATCH with invalid project URL
  {
    const { status, body } = await patch(
      BASE_RESUME,
      { projects: [{ name: 'Bad Project', url: 'not-a-valid-url' }] },
      authHeader()
    )
    print('7. PATCH with invalid URL in project (expect 422)', status, body)
  }

  // 8. PATCH attempt to set user field (should be stripped by Zod)
  {
    const { status, body } = await patch(
      BASE_RESUME,
      { user: '000000000000000000000000', title: 'Hacker Resume' },
      authHeader()
    )
    print('8. PATCH with user field in body (ownership test)', status, body)
    const returnedUser = body.data?.resume?.user
    console.log(`   user in response: ${returnedUser} (must be original user ID)`)
  }

  // 9. PATCH without token
  {
    const { status, body } = await patch(BASE_RESUME, { title: 'Ghost' })
    print('9. PATCH without token (expect 401)', status, body)
  }

  // 10. PATCH with unknown/extra fields (Zod strips them)
  {
    const { status, body } = await patch(
      BASE_RESUME,
      { title: 'Clean Title', unknownField: 'should be stripped' },
      authHeader()
    )
    print('10. PATCH with unknown field (stripped by Zod)', status, body)
    const hasUnknown = 'unknownField' in (body.data?.resume ?? {})
    console.log(`   unknownField in response: ${hasUnknown} (must be false)`)
  }

  // 11. DELETE resume
  {
    const { status, body } = await del(BASE_RESUME, authHeader())
    print('11. DELETE /api/resume', status, body)
  }

  // 12. GET after DELETE — should be 404 again
  {
    const { status, body } = await get(BASE_RESUME, authHeader())
    print('12. GET /api/resume after DELETE (expect 404)', status, body)
  }

  // 13. DELETE when resume doesn't exist — should be 404
  {
    const { status, body } = await del(BASE_RESUME, authHeader())
    print('13. DELETE /api/resume when none exists (expect 404)', status, body)
  }

  console.log('\n======================================')
  console.log('  Tests complete — check results above')
  console.log('======================================')
}

run().catch(console.error)
