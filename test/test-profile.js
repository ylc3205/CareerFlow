// Phase 3 Profile CRUD Test Suite
// Run with: node.exe test-profile.js
// Requires server to be running on port 5000
// Uses the test@example.com account created in test-auth.js

const BASE_AUTH = 'http://localhost:5000/api/auth'
const BASE_PROFILE = 'http://localhost:5000/api/profile'

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

const run = async () => {
  console.log('======================================')
  console.log('  CareerFlow Phase 3 — Profile Tests')
  console.log('======================================')

  // Login to get access token
  {
    const { status, body } = await post(`${BASE_AUTH}/login`, {
      email: 'test@example.com',
      password: 'password123',
    })
    if (!body.data?.accessToken) {
      console.error('\nCould not login. Run test-auth.js first to create test@example.com.')
      process.exit(1)
    }
    accessToken = body.data.accessToken
    console.log('\n[Setup] Logged in as test@example.com')
  }

  // 1. GET profile with valid token (profile should exist — auto-created on register)
  {
    const { status, body } = await get(BASE_PROFILE, authHeader())
    print('1. GET /api/profile with valid token', status, body)
  }

  // 2. GET profile without token
  {
    const { status, body } = await get(BASE_PROFILE)
    print('2. GET /api/profile without token (expect 401)', status, body)
  }

  // 3. PATCH profile with valid data
  {
    const { status, body } = await patch(
      BASE_PROFILE,
      {
        fullName: 'Nguyen Van A',
        headline: 'Junior Backend Developer',
        location: 'Ho Chi Minh City, Vietnam',
        bio: 'Passionate about building clean APIs.',
        skills: ['Node.js', 'Express.js', 'MongoDB'],
        yearsOfExperience: 1,
      },
      authHeader()
    )
    print('3. PATCH /api/profile with valid data', status, body)
  }

  // 4. GET profile after PATCH — verify changes persisted
  {
    const { status, body } = await get(BASE_PROFILE, authHeader())
    print('4. GET /api/profile after PATCH (verify changes)', status, body)
  }

  // 5. PATCH profile with education and experience
  {
    const { status, body } = await patch(
      BASE_PROFILE,
      {
        education: [
          {
            school: 'Ho Chi Minh City University of Technology',
            degree: 'Bachelor',
            fieldOfStudy: 'Computer Science',
            startDate: '2020-09-01',
            endDate: '2024-06-01',
          },
        ],
        experience: [
          {
            company: 'TechCorp Vietnam',
            position: 'Backend Intern',
            description: 'Worked on Node.js APIs.',
            startDate: '2023-06-01',
            current: true,
          },
        ],
      },
      authHeader()
    )
    print('5. PATCH /api/profile with education + experience', status, body)
  }

  // 6. PATCH with invalid data — yearsOfExperience negative
  {
    const { status, body } = await patch(
      BASE_PROFILE,
      { yearsOfExperience: -5 },
      authHeader()
    )
    print('6. PATCH with invalid yearsOfExperience (expect 422)', status, body)
  }

  // 7. PATCH attempt to change user ownership (user field should be ignored/stripped by Zod)
  {
    const { status, body } = await patch(
      BASE_PROFILE,
      { user: '000000000000000000000000', fullName: 'Hacker' },
      authHeader()
    )
    print('7. PATCH attempt to override user field', status, body)
    const returnedUserId = body.data?.profile?.user
    console.log(`   Ownership preserved: user in response = ${returnedUserId} (should be original user ID)`)
  }

  // 8. PATCH without token
  {
    const { status, body } = await patch(BASE_PROFILE, { fullName: 'Ghost' })
    print('8. PATCH /api/profile without token (expect 401)', status, body)
  }

  // 9. PATCH only one field — verify other fields unchanged
  {
    const { status, body } = await patch(
      BASE_PROFILE,
      { bio: 'Updated bio only.' },
      authHeader()
    )
    print('9. PATCH only bio — other fields should remain', status, body)
  }

  console.log('\n======================================')
  console.log('  Tests complete — check results above')
  console.log('======================================')
}

run().catch(console.error)
