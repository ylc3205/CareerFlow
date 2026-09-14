import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import mongoose from 'mongoose'
import Resume from '../src/models/resume.model.js'
import User from '../src/models/user.model.js'
import { resolveStoragePath } from '../src/services/storage.service.js'

const PORT = 5099
const BASE = `http://localhost:${PORT}/api`
const EMAIL = 'restart-regression@example.com'
const PASSWORD = 'Str0ng!pass'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let serverProcess = null

const startServer = async () => {
  const env = {
    ...process.env,
    PORT: String(PORT),
    STORAGE_MOCK: 'true',
    AI_MOCK: 'true',
  }

  serverProcess = spawn('node', ['src/server.js'], {
    cwd: path.resolve(''),
    env,
    stdio: 'pipe',
  })

  // Wait for server to become responsive
  const start = Date.now()
  while (Date.now() - start < 15000) {
    try {
      const res = await fetch(`${BASE}/health`)
      if (res.ok) return
    } catch {
      // wait
    }
    await sleep(300)
  }
  throw new Error('Server failed to start on port ' + PORT)
}

const stopServer = async () => {
  if (serverProcess) {
    serverProcess.kill('SIGKILL')
    serverProcess = null
    await sleep(1000)
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

const upload = async (url, filePath, filename, mime, headers = {}) => {
  const buffer = fs.readFileSync(filePath)
  const fd = new FormData()
  fd.append('file', new Blob([buffer], { type: mime }), filename)
  const res = await fetch(url, { method: 'POST', headers, body: fd })
  let json
  try {
    json = await res.json()
  } catch {
    json = {}
  }
  return { status: res.status, body: json }
}

const run = async () => {
  console.log('====================================================')
  console.log('  BUG-RESUME-PASS1-001 Restart & Storage Regression ')
  console.log('====================================================\n')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  try {
    // 1. Start backend process
    console.log('[Step 0] Starting initial backend process on port ' + PORT + '...')
    await startServer()
    console.log('  -> Backend running successfully.\n')

    // Clean up test user
    const existingUser = await User.findOne({ email: EMAIL })
    if (existingUser) {
      await Resume.deleteMany({ user: existingUser._id })
      await User.deleteOne({ _id: existingUser._id })
    }

    // Register test user
    const reg = await req('POST', `${BASE}/auth/register`, { email: EMAIL, password: PASSWORD })
    const token = reg.body?.data?.accessToken
    const userId = reg.body?.data?.user?._id
    if (!token) throw new Error('Registration failed: ' + JSON.stringify(reg.body))
    const authH = { Authorization: `Bearer ${token}` }
    console.log('[Setup] Test user registered:', EMAIL, userId)

    // ── 1. Upload PDF ──────────────────────────────────────────
    console.log('\n[Step 1] Upload PDF from sample-cv.pdf')
    const upRes = await upload(`${BASE}/resume/upload`, 'sample-cv.pdf', 'sample-cv.pdf', 'application/pdf', authH)
    console.log('  Upload status:', upRes.status)
    const publicId = upRes.body?.data?.resume?.originalFile?.publicId
    console.log('  publicId:', publicId)
    if (!publicId) throw new Error('No publicId returned')

    const physicalPath = resolveStoragePath(publicId)
    console.log('  Physical file path on disk:', physicalPath)
    console.log('  File exists physically on disk:', fs.existsSync(physicalPath))
    if (!fs.existsSync(physicalPath)) throw new Error('Uploaded file missing on disk!')

    // ── 2. Parse with AI ───────────────────────────────────────
    console.log('\n[Step 2] Parse with AI')
    const parseRes1 = await req('POST', `${BASE}/resume/parse`, {}, authH)
    console.log('  Parse status:', parseRes1.status)
    console.log('  Draft title:', parseRes1.body?.data?.draft?.title)
    console.log('  Draft skills:', parseRes1.body?.data?.draft?.skills)
    if (parseRes1.status !== 200 || !parseRes1.body?.data?.draft) {
      throw new Error('Initial parse failed: ' + JSON.stringify(parseRes1.body))
    }

    // ── 3. Confirm success ────────────────────────────────────
    console.log('\n[Step 3] Confirm resume draft')
    const confirmRes = await req('POST', `${BASE}/resume/confirm`, {
      title: parseRes1.body.data.draft.title || 'Senior Engineer',
      summary: parseRes1.body.data.draft.summary || 'Confirmed summary',
      skills: parseRes1.body.data.draft.skills || ['Node.js'],
    }, authH)
    console.log('  Confirm status:', confirmRes.status)
    console.log('  importStatus:', confirmRes.body?.data?.resume?.importStatus)
    if (confirmRes.status !== 200 || confirmRes.body?.data?.resume?.importStatus !== 'confirmed') {
      throw new Error('Confirm failed: ' + JSON.stringify(confirmRes.body))
    }

    // ── 4. Completely restart backend ─────────────────────────
    console.log('\n[Step 4] COMPLETELY KILLING BACKEND PROCESS...')
    await stopServer()
    console.log('  -> Backend process completely terminated.')

    console.log('  Starting a brand new backend process on port ' + PORT + '...')
    await startServer()
    console.log('  -> Brand new backend process is up and running.')

    // Verify physical file is still present on disk
    console.log('  Verifying file on disk persists after backend restart:', fs.existsSync(physicalPath))
    if (!fs.existsSync(physicalPath)) throw new Error('File disappeared after restart!')

    // ── 5. Parse the same uploaded CV again ────────────────────
    console.log('\n[Step 5] Parse the same uploaded CV again on new backend process')
    const parseRes2 = await req('POST', `${BASE}/resume/parse`, {}, authH)
    console.log('  Parse status:', parseRes2.status)
    console.log('  Draft title:', parseRes2.body?.data?.draft?.title)
    if (parseRes2.status !== 200 || !parseRes2.body?.data?.draft) {
      throw new Error('Parse after restart failed: ' + JSON.stringify(parseRes2.body))
    }
    console.log('  -> SUCCESS: Parse succeeded after complete backend restart!')

    // ── 6. Confirm success again ──────────────────────────────
    console.log('\n[Step 6] Confirm success')
    const confirmRes2 = await req('POST', `${BASE}/resume/confirm`, {
      title: 'Senior Engineer Confirmed After Restart',
      summary: 'Re-confirmed after restart',
    }, authH)
    console.log('  Confirm status:', confirmRes2.status)
    if (confirmRes2.status !== 200) throw new Error('Second confirm failed')

    // ── 7. Test DOCX parse ────────────────────────────────────
    console.log('\n[Step 7] Test DOCX upload & parse')
    const docxUp = await upload(
      `${BASE}/resume/upload`,
      'sample-cv.docx',
      'sample-cv.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      authH
    )
    console.log('  DOCX upload status:', docxUp.status)
    const docxPublicId = docxUp.body?.data?.resume?.originalFile?.publicId
    const docxDiskPath = resolveStoragePath(docxPublicId)
    console.log('  DOCX disk path:', docxDiskPath)
    console.log('  DOCX exists on disk:', fs.existsSync(docxDiskPath))
    if (!fs.existsSync(docxDiskPath)) throw new Error('DOCX file missing on disk!')

    const docxParse = await req('POST', `${BASE}/resume/parse`, {}, authH)
    console.log('  DOCX parse status:', docxParse.status)
    if (docxParse.status !== 200 || !docxParse.body?.data?.draft) {
      throw new Error('DOCX parse failed: ' + JSON.stringify(docxParse.body))
    }
    console.log('  -> SUCCESS: DOCX parsed successfully!')

    // ── 8. Verify missing file returns 404 ─────────────────────
    console.log('\n[Step 8] Verify missing file returns 404 "Uploaded file not found"')
    // Delete the physical file from disk behind the scenes
    fs.unlinkSync(docxDiskPath)
    console.log('  Physically deleted file from disk. Exists now:', fs.existsSync(docxDiskPath))

    const missingParse = await req('POST', `${BASE}/resume/parse`, {}, authH)
    console.log('  Missing file parse status (expect 404):', missingParse.status)
    console.log('  Missing file error message (expect "Uploaded file not found"):', missingParse.body?.message)
    if (missingParse.status !== 404 || missingParse.body?.message !== 'Uploaded file not found') {
      throw new Error(`Expected 404 "Uploaded file not found", got ${missingParse.status}: ${JSON.stringify(missingParse.body)}`)
    }
    console.log('  -> SUCCESS: Missing physical file correctly returned HTTP 404 "Uploaded file not found"!')

    // Cleanup test user
    console.log('\n[Cleanup] Cleaning up regression user...')
    await Resume.deleteMany({ user: userId })
    await User.deleteOne({ _id: userId })

    console.log('\n====================================================')
    console.log('  ALL 8 REGRESSION STEPS PASSED SUCCESSFULLY!')
    console.log('====================================================')
  } finally {
    await stopServer()
    await mongoose.disconnect()
  }
}

run().catch(async (err) => {
  console.error('\n[REGRESSION FAILED]:', err)
  await stopServer()
  process.exit(1)
})
