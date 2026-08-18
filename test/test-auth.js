// Phase 2 Authentication Test Suite
// Run with: node.exe test-auth.js

const BASE = 'http://localhost:5000/api/auth'
let accessToken = ''
let cookieHeader = ''

const print = (label, status, body) => {
  const ok = typeof body.success !== 'undefined'
  console.log(`\n[${status}] ${label}`)
  console.log(JSON.stringify(body, null, 2))
}

const post = async (path, body, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookieHeader = setCookie.split(';')[0]
  return { status: res.status, body: await res.json() }
}

const get = async (path, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers },
  })
  return { status: res.status, body: await res.json() }
}

const run = async () => {
  console.log('======================================')
  console.log('  CareerFlow Phase 2 — Auth Tests')
  console.log('======================================')

  // 1. Register valid user
  {
    const { status, body } = await post('/register', { email: 'test@example.com', password: 'password123' })
    print('1. Register valid user', status, body)
    if (body.data?.accessToken) accessToken = body.data.accessToken
  }

  // 2. Register duplicate email
  {
    const { status, body } = await post('/register', { email: 'test@example.com', password: 'password123' })
    print('2. Register duplicate email (expect 409)', status, body)
  }

  // 3. Register invalid email
  {
    const { status, body } = await post('/register', { email: 'not-an-email', password: 'password123' })
    print('3. Register invalid email (expect 422)', status, body)
  }

  // 4. Register weak password
  {
    const { status, body } = await post('/register', { email: 'other@example.com', password: '123' })
    print('4. Register weak password (expect 422)', status, body)
  }

  // 5. Login valid credentials
  {
    const { status, body } = await post('/login', { email: 'test@example.com', password: 'password123' })
    print('5. Login valid credentials', status, body)
    if (body.data?.accessToken) accessToken = body.data.accessToken
  }

  // 6. Login wrong password
  {
    const { status, body } = await post('/login', { email: 'test@example.com', password: 'wrongpassword' })
    print('6. Login wrong password (expect 401)', status, body)
  }

  // 7. Login non-existent email
  {
    const { status, body } = await post('/login', { email: 'nobody@example.com', password: 'password123' })
    print('7. Login non-existent email (expect 401)', status, body)
  }

  // 8. GET /me with valid token
  {
    const { status, body } = await get('/me', { Authorization: `Bearer ${accessToken}` })
    print('8. GET /me with valid token', status, body)
  }

  // 9. GET /me without token
  {
    const { status, body } = await get('/me')
    print('9. GET /me without token (expect 401)', status, body)
  }

  // 10. GET /me with invalid token
  {
    const { status, body } = await get('/me', { Authorization: 'Bearer invalid.token.here' })
    print('10. GET /me with invalid token (expect 401)', status, body)
  }

  // 11. Refresh token (cookie-based — note: Node fetch does not forward cookies automatically)
  {
    const res = await fetch(`${BASE}/refresh`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    })
    const body = await res.json()
    print('11. Refresh token', res.status, body)
    if (body.data?.accessToken) accessToken = body.data.accessToken
  }

  // 12. Logout
  {
    const res = await fetch(`${BASE}/logout`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    })
    const setCookie = res.headers.get('set-cookie')
    const body = await res.json()
    print('12. Logout', res.status, body)
    console.log('   set-cookie on logout:', setCookie ?? '(none)')
  }

  console.log('\n======================================')
  console.log('  Tests complete — check results above')
  console.log('======================================')
}

run().catch(console.error)
