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

// Complexity-valid fixture password (lowercase + uppercase + digit + special).
const STRONG_PASSWORD = 'Str0ng!pass'
const longPassword = (n) => `A1!${'a'.repeat(n - 3)}`
const longEmail = () => `${'a'.repeat(250)}@example.com`

const run = async () => {
  console.log('======================================')
  console.log('  CareerFlow Phase 2 — Auth Tests')
  console.log('======================================')

  // 1. Register valid user (strong password)
  {
    const { status, body } = await post('/register', { email: 'test@example.com', password: STRONG_PASSWORD })
    print('1. Register valid user (expect 201)', status, body)
    if (body.data?.accessToken) accessToken = body.data.accessToken
  }

  // 2. Register duplicate email
  {
    const { status, body } = await post('/register', { email: 'test@example.com', password: STRONG_PASSWORD })
    print('2. Register duplicate email (expect 409)', status, body)
  }

  // 3. Register invalid email
  {
    const { status, body } = await post('/register', { email: 'not-an-email', password: STRONG_PASSWORD })
    print('3. Register invalid email (expect 422)', status, body)
  }

  // 4. Register — missing lowercase
  {
    const { status, body } = await post('/register', { email: 'nolo@example.com', password: 'STRONG!PASS1' })
    print('4. Register missing lowercase (expect 422)', status, body)
  }

  // 5. Register — missing uppercase
  {
    const { status, body } = await post('/register', { email: 'noupper@example.com', password: 'strong!pass1' })
    print('5. Register missing uppercase (expect 422)', status, body)
  }

  // 6. Register — missing digit
  {
    const { status, body } = await post('/register', { email: 'nodigit@example.com', password: 'Strong!pass' })
    print('6. Register missing digit (expect 422)', status, body)
  }

  // 7. Register — missing special character
  {
    const { status, body } = await post('/register', { email: 'nospecial@example.com', password: 'Strong1pass' })
    print('7. Register missing special character (expect 422)', status, body)
  }

  // 8. Register — 7-character password
  {
    const { status, body } = await post('/register', { email: 'short@example.com', password: 'Str0ng!' })
    print('8. Register 7-character password (expect 422)', status, body)
  }

  // 9. Register — 72-character valid password
  {
    const { status, body } = await post('/register', { email: 'longok@example.com', password: longPassword(72) })
    print('9. Register 72-character valid password (expect 201)', status, body)
  }

  // 10. Register — 73-character password
  {
    const { status, body } = await post('/register', { email: 'toolong@example.com', password: longPassword(73) })
    print('10. Register 73-character password (expect 422)', status, body)
  }

  // 11. Register — email >254 characters
  {
    const { status, body } = await post('/register', { email: longEmail(), password: STRONG_PASSWORD })
    print('11. Register email >254 characters (expect 422)', status, body)
  }

  // 12. Login valid credentials
  {
    const { status, body } = await post('/login', { email: 'test@example.com', password: STRONG_PASSWORD })
    print('12. Login valid credentials (expect 200)', status, body)
    if (body.data?.accessToken) accessToken = body.data.accessToken
  }

  // 13. Login — password >72 characters (no complexity check, but length capped)
  {
    const { status, body } = await post('/login', { email: 'test@example.com', password: longPassword(73) })
    print('13. Login password >72 characters (expect 422)', status, body)
  }

  // 14. Login wrong password
  {
    const { status, body } = await post('/login', { email: 'test@example.com', password: 'wrongpassword' })
    print('14. Login wrong password (expect 401)', status, body)
  }

  // 15. Login non-existent email
  {
    const { status, body } = await post('/login', { email: 'nobody@example.com', password: STRONG_PASSWORD })
    print('15. Login non-existent email (expect 401)', status, body)
  }

  // 16. GET /me with valid token
  {
    const { status, body } = await get('/me', { Authorization: `Bearer ${accessToken}` })
    print('16. GET /me with valid token', status, body)
  }

  // 17. GET /me without token
  {
    const { status, body } = await get('/me')
    print('17. GET /me without token (expect 401)', status, body)
  }

  // 18. GET /me with invalid token
  {
    const { status, body } = await get('/me', { Authorization: 'Bearer invalid.token.here' })
    print('18. GET /me with invalid token (expect 401)', status, body)
  }

  // 19. Refresh token (cookie-based — note: Node fetch does not forward cookies automatically)
  {
    const res = await fetch(`${BASE}/refresh`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    })
    const body = await res.json()
    print('19. Refresh token', res.status, body)
    if (body.data?.accessToken) accessToken = body.data.accessToken
  }

  // 20. Logout
  {
    const res = await fetch(`${BASE}/logout`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    })
    const setCookie = res.headers.get('set-cookie')
    const body = await res.json()
    print('20. Logout', res.status, body)
    console.log('   set-cookie on logout:', setCookie ?? '(none)')
  }

  console.log('\n======================================')
  console.log('  Tests complete — check results above')
  console.log('======================================')
}

run().catch(console.error)