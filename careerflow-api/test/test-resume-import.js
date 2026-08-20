// Phase 20 — Resume CV Upload / AI Parsing / Career Direction Test Suite
// Run with: node test-resume-import.js
//
// Start the server first with mock modes enabled in the shell env:
//   $env:PORT='5001'; $env:AI_MOCK='true'; $env:STORAGE_MOCK='true'; node.cmd src/server.js
//
// Then run this suite with the matching port:
//   $env:TEST_API_PORT='5001'; $env:AI_MOCK='true'; node test/test-resume-import.js
//
// Requirements:
//   1. Server running on port 5000 with AI_MOCK=true (no Gemini calls).
//   2. STORAGE_MOCK=true (no Cloudinary credentials required).
//   3. This suite also needs AI_MOCK=true in the TEST process env for the
//      unit-level 502 assertions (the imported service must be in mock mode).
//
// No real Cloudinary account is required.

import 'dotenv/config'
import zlib from 'node:zlib'
import mongoose from 'mongoose'
import Resume from '../src/models/resume.model.js'
import Profile from '../src/models/profile.model.js'
import { normalizeResume, validateResumeDraft } from '../src/services/resumeParse.service.js'
import ApiError from '../src/utils/ApiError.js'

const API_PORT = process.env.TEST_API_PORT || 5000
const BASE = `http://localhost:${API_PORT}/api`
const BASE_AUTH = `${BASE}/auth`
const BASE_RESUME = `${BASE}/resume`
const BASE_PROFILE = `${BASE}/profile`

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

const upload = async (url, buffer, filename, mime, headers = {}) => {
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

// ── Self-contained PDF fixture generator (text-based single page) ──────────
const escapePdfString = (s) => String(s).replace(/[\\()]/g, (m) => `\\${m}`)

const buildPdf = (text) => {
  const streamData = text ? `BT /F1 24 Tf 100 700 Td (${escapePdfString(text)}) Tj ET` : ''
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(streamData)} >>\nstream\n${streamData}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body))
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(body)
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`
  body += xref
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(body, 'latin1')
}

// ── Self-contained DOCX fixture generator (minimal zip + word/document.xml) ─
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = (buf) => {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const u16 = (n) => Buffer.from([n & 0xff, (n >>> 8) & 0xff])
const u32 = (n) => Buffer.from([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])

const buildZip = (files) => {
  const localParts = []
  const centralParts = []
  let offset = 0
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8')
    const comp = zlib.deflateRawSync(data)
    const crc = crc32(data)
    localParts.push(
      Buffer.concat([
        u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0x21),
        u32(crc), u32(comp.length), u32(data.length), u16(nameBuf.length), u16(0),
        nameBuf, comp,
      ])
    )
    centralParts.push(
      Buffer.concat([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0x21),
        u32(crc), u32(comp.length), u32(data.length), u16(nameBuf.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), nameBuf,
      ])
    )
    offset += localParts[localParts.length - 1].length
  }
  const cd = Buffer.concat(centralParts)
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(cd.length), u32(offset), u16(0),
  ])
  return Buffer.concat([...localParts, cd, eocd])
}

const buildDocx = (paragraphs) => {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  const paras = paragraphs
    .map((t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`)
    .join('')
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}</w:body></w:document>`
  return buildZip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rels, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(document, 'utf8') },
  ])
}

const run = async () => {
  console.log('==========================================')
  console.log('  CareerFlow Phase 20 — Resume Import Tests')
  console.log('==========================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })

  // ── Fixtures ─────────────────────────────────────────
  const pdfText = 'Jane Doe\nSoftware Engineer with Node.js and MongoDB experience.\n2020-present\n'
  const pdfBuffer = buildPdf(pdfText)
  const pdfEmpty = buildPdf('')
  const docxBuffer = buildDocx(['Jane Doe', 'Software Engineer', 'Node.js and MongoDB developer.'])
  const docxEmpty = buildDocx([])
  const corruptPdf = Buffer.from('this is not a real pdf at all'.repeat(20), 'utf8')

  // ── Setup users ──────────────────────────────────────
  const main = await ensureUser('imp-main@example.com')
  const docxUser = await ensureUser('imp-docx@example.com')
  const edgeUser = await ensureUser('imp-edge@example.com')
  const ghostUser = await ensureUser('imp-ghost@example.com')

  await Resume.deleteMany({ user: { $in: [main.userId, docxUser.userId, edgeUser.userId, ghostUser.userId] } })
  await Profile.deleteMany({ user: { $in: [main.userId, docxUser.userId, edgeUser.userId, ghostUser.userId] } })

  // ══════════════════ UPLOAD ══════════════════════════
  console.log('\n[1] Upload')

  {
    const { status } = await upload(`${BASE_RESUME}/upload`, pdfBuffer, 'resume.pdf', 'application/pdf')
    check('unauthenticated upload -> 401', status === 401)
  }

  {
    const { status } = await upload(
      `${BASE_RESUME}/upload`,
      Buffer.from('plain text', 'utf8'),
      'notes.txt',
      'text/plain',
      authH(main.token)
    )
    check('unsupported file (.txt) -> 400', status === 400)
  }

  {
    const { status } = await upload(
      `${BASE_RESUME}/upload`,
      Buffer.alloc(11 * 1024 * 1024),
      'big.pdf',
      'application/pdf',
      authH(main.token)
    )
    check('oversized file (>10MB) -> 400', status === 400)
  }

  {
    const fd = new FormData()
    const res = await fetch(`${BASE_RESUME}/upload`, {
      method: 'POST',
      headers: authH(main.token),
      body: fd,
    })
    check('missing file field -> 400', res.status === 400)
  }

  let mainPdfPublicId = null
  {
    const { status, body } = await upload(
      `${BASE_RESUME}/upload`,
      pdfBuffer,
      'jane-doe.pdf',
      'application/pdf',
      authH(main.token)
    )
    check('authenticated valid PDF upload -> 200', status === 200)
    const of = body.data?.resume?.originalFile
    check('originalFile persisted', Boolean(of && of.fileUrl && of.publicId && of.originalFileName))
    check('originalFile.fileUrl uses mock Cloudinary URL', of && of.fileUrl.startsWith('https://res.cloudinary.com/mock/'))
    check('originalFile.publicId uses careerflow/resumes folder', of && of.publicId.startsWith('careerflow/resumes/'))
    check('originalFile.mimeType stored', of && of.mimeType === 'application/pdf')
    check('originalFile.fileSize stored', typeof of?.fileSize === 'number' && of.fileSize > 0)
    check('importStatus stays "none" after upload', body.data?.resume?.importStatus === 'none')
    check('no structured resume data written on upload', !body.data?.resume?.title && !body.data?.resume?.summary)
    mainPdfPublicId = of?.publicId || null
  }

  // Replace: uploading a new DOCX over the existing PDF
  {
    const { status, body } = await upload(
      `${BASE_RESUME}/upload`,
      docxBuffer,
      'jane-doe.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      authH(main.token)
    )
    check('replacement DOCX upload -> 200', status === 200)
    const of = body.data?.resume?.originalFile
    check('originalFile replaced with new publicId', Boolean(of && of.publicId !== mainPdfPublicId))
    check('replacement mimeType updated', of && of.mimeType.includes('wordprocessingml'))
    check('old PDF metadata no longer present', of && of.originalFileName === 'jane-doe.docx')
  }

  // Restore a PDF for the main user so the PDF parse flow is covered
  {
    const { status, body } = await upload(
      `${BASE_RESUME}/upload`,
      pdfBuffer,
      'jane-doe.pdf',
      'application/pdf',
      authH(main.token)
    )
    check('re-upload PDF after replacement -> 200', status === 200)
    check('final upload is PDF again', body.data?.resume?.originalFile?.mimeType === 'application/pdf')
  }

  // ══════════════════ PARSE ════════════════════════════
  console.log('\n[2] Parse')

  {
    const { status } = await req('POST', `${BASE_RESUME}/parse`, {}, authH(ghostUser.token))
    check('parse with no Resume (ghost user) -> 404', status === 404)
  }

  {
    // docxUser has NO upload yet — manual resume without originalFile
    await req('PATCH', `${BASE_RESUME}`, { title: 'Manual Only' }, authH(docxUser.token))
    const { status } = await req('POST', `${BASE_RESUME}/parse`, {}, authH(docxUser.token))
    check('parse without uploaded CV file -> 400', status === 400)
  }

  {
    const { status, body } = await req('POST', `${BASE_RESUME}/parse`, {}, authH(main.token))
    check('successful PDF parse -> 200', status === 200)
    const draft = body.data?.draft
    check('draft.summary populated (AI mock)', Boolean(draft && draft.summary))
    check('draft.skills is array (AI mock)', Array.isArray(draft?.skills) && draft.skills.length > 0)
    check('draft.experience is array (AI mock)', Array.isArray(draft?.experience) && draft.experience.length > 0)
    check('draft.profile suggestion present', Boolean(draft && draft.profile))
    check('draft.careerDirections suggestions present', Array.isArray(draft?.careerDirections) && draft.careerDirections.length > 0)
    check('importStatus set to "draft"', body.data?.resume?.importStatus === 'draft')
    check('confirmed main resume fields NOT overwritten', !body.data?.resume?.summary)
  }

  // Ownership: another user cannot parse someone else's CV (no cross-user access)
  {
    const { status } = await req('POST', `${BASE_RESUME}/parse`, {}, authH(docxUser.token))
    check('parse is scoped to own resume (docxUser has no uploaded CV) -> 400', status === 400)
  }

  // DOCX parse on docxUser
  {
    await upload(
      `${BASE_RESUME}/upload`,
      docxBuffer,
      'career.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      authH(docxUser.token)
    )
    const { status, body } = await req('POST', `${BASE_RESUME}/parse`, {}, authH(docxUser.token))
    check('successful DOCX parse -> 200', status === 200)
    check('DOCX parse produces draft', Boolean(body.data?.draft?.summary))
    check('DOCX parse sets importStatus draft', body.data?.resume?.importStatus === 'draft')
  }

  // Extraction failure (corrupt bytes named .pdf)
  {
    await upload(
      `${BASE_RESUME}/upload`,
      corruptPdf,
      'corrupt.pdf',
      'application/pdf',
      authH(edgeUser.token)
    )
    const { status } = await req('POST', `${BASE_RESUME}/parse`, {}, authH(edgeUser.token))
    check('extraction failure (corrupt PDF) -> 422', status === 422)
  }

  // Empty extracted text (scanned / image-only PDF)
  {
    await upload(
      `${BASE_RESUME}/upload`,
      pdfEmpty,
      'empty.pdf',
      'application/pdf',
      authH(edgeUser.token)
    )
    const { status, body } = await req('POST', `${BASE_RESUME}/parse`, {}, authH(edgeUser.token))
    check('empty extracted text (image-only PDF) -> 422', status === 422)
    check('empty-text message returned', body.message === 'No readable text was found in the uploaded file')
  }

  // Empty DOCX
  {
    await upload(
      `${BASE_RESUME}/upload`,
      docxEmpty,
      'empty.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      authH(edgeUser.token)
    )
    const { status } = await req('POST', `${BASE_RESUME}/parse`, {}, authH(edgeUser.token))
    check('empty extracted text (empty DOCX) -> 422', status === 422)
  }

  // AI mock determinism: re-parsing the same CV yields the same draft shape
  {
    const first = await req('POST', `${BASE_RESUME}/parse`, {}, authH(main.token))
    const second = await req('POST', `${BASE_RESUME}/parse`, {}, authH(main.token))
    const a = first.body?.data?.draft
    const b = second.body?.data?.draft
    check('AI mock parse is deterministic (same summary)', Boolean(a && b && a.summary === b.summary))
    check('AI mock parse is deterministic (same skill count)', Array.isArray(a?.skills) && Array.isArray(b?.skills) && a.skills.length === b.skills.length)
  }

  // ── Unit-level: invalid AI output rejected (502) ──────
  console.log('\n[3] Invalid AI output (unit)')
  {
    const throwsApiError = async (fn, code) => {
      try {
        await fn()
        return null
      } catch (err) {
        return err instanceof ApiError ? err.statusCode : null
      }
    }
    const c1 = await throwsApiError(() => validateResumeDraft(normalizeResume({ skills: 'not-an-array' })), 502)
    check('skills as string -> 502', c1 === 502)
    const c2 = await throwsApiError(() => validateResumeDraft(normalizeResume({ title: 12345 })), 502)
    check('title as number -> 502', c2 === 502)
    const c3 = await throwsApiError(() => validateResumeDraft(normalizeResume({ profile: 'nope' })), 502)
    check('profile as string -> 502', c3 === 502)
  }

  // ── Unit-level: AI provider failure (503) ─────────────
  {
    const savedMock = process.env.AI_MOCK
    const savedProvider = process.env.DEFAULT_AI_PROVIDER
    process.env.AI_MOCK = 'false'
    process.env.DEFAULT_AI_PROVIDER = 'nonexistent-provider'
    try {
      const { generateResumeParseJSON } = await import(`../src/services/ai.service.js?provider-failure-${Date.now()}`)
      let status = null
      try {
        await generateResumeParseJSON('prompt', {})
      } catch (err) {
        status = err.statusCode
      }
      check('AI provider failure -> 503', status === 503)
    } finally {
      process.env.AI_MOCK = savedMock
      process.env.DEFAULT_AI_PROVIDER = savedProvider
    }
  }

  // ══════════════════ CONFIRM ═══════════════════════════
  console.log('\n[4] Confirm')

  // Profile before confirmation (must not be changed by any resume operation)
  let profileBefore = null
  {
    const { status, body } = await req('GET', `${BASE_PROFILE}`, undefined, authH(main.token))
    profileBefore = { status, body }
    check('profile exists before confirm (or 404)', status === 200 || status === 404)
  }

  const confirmPayload = {
    title: 'Edited Backend Developer Resume',
    summary: 'User-confirmed summary after reviewing the AI draft.',
    skills: ['Node.js', 'Express.js', 'MongoDB', 'TypeScript'],
    languages: ['English', 'Vietnamese'],
    experience: [
      {
        company: 'Confirmed Co',
        position: 'Senior Backend Engineer',
        description: 'Confirmed role description.',
        startDate: '2020-01-01',
        current: true,
      },
    ],
    education: [],
    projects: [],
    certifications: [],
    careerDirections: [
      { title: 'Node.js Developer', description: 'Focus on server-side APIs' },
      { title: 'Fullstack Developer', description: 'Node.js + React' },
    ],
  }

  {
    const { status, body } = await req('POST', `${BASE_RESUME}/confirm`, confirmPayload, authH(main.token))
    check('valid confirmation -> 200', status === 200)
    const r = body.data?.resume
    check('confirmed title persisted', r?.title === 'Edited Backend Developer Resume')
    check('confirmed summary persisted (user-edited)', r?.summary === 'User-confirmed summary after reviewing the AI draft.')
    check('confirmed skills persisted (user-edited)', Array.isArray(r?.skills) && r.skills.includes('TypeScript'))
    check('confirmed experience persisted', Array.isArray(r?.experience) && r.experience[0]?.company === 'Confirmed Co')
    check('importStatus set to "confirmed"', r?.importStatus === 'confirmed')
    check('originalFile retained after confirm', Boolean(r?.originalFile?.fileUrl))
    check('careerDirections persisted', Array.isArray(r?.careerDirections) && r.careerDirections.length === 2)
    check('careerDirection title stored', r?.careerDirections?.[0]?.title === 'Node.js Developer')
  }

  // Career directions editable via existing PATCH (add/remove before confirm)
  {
    const { status, body } = await req(
      'PATCH',
      `${BASE_RESUME}`,
      { careerDirections: [{ title: 'Backend Developer', description: 'Revised' }] },
      authH(main.token)
    )
    check('PATCH careerDirections -> 200', status === 200)
    check('careerDirections edited via PATCH', body.data?.resume?.careerDirections?.length === 1 && body.data.resume.careerDirections[0].title === 'Backend Developer')
  }

  // Profile must NOT have been auto-changed by any resume operation
  {
    const { status, body } = await req('GET', `${BASE_PROFILE}`, undefined, authH(main.token))
    const unchanged = status === profileBefore.status && JSON.stringify(body) === JSON.stringify(profileBefore.body)
    check('Profile unchanged after upload/parse/confirm', unchanged)
  }

  // Profile changes only via explicit confirmation (existing PATCH /api/profile)
  {
    // The profile API has no upsert; create the document first (the register
    // flow does not auto-create one).
    await Profile.updateOne(
      { user: main.userId },
      { $setOnInsert: { user: main.userId } },
      { upsert: true }
    )
    const { status, body } = await req(
      'PATCH',
      `${BASE_PROFILE}`,
      { fullName: 'Jane Doe (explicit)', headline: 'Backend Engineer' },
      authH(main.token)
    )
    check('explicit PATCH /api/profile -> 200', status === 200)
    check('explicit profile change persisted', body.data?.profile?.fullName === 'Jane Doe (explicit)')
  }

  // ══════════════════ DISCARD ═══════════════════════════
  console.log('\n[5] Discard')

  {
    await req('POST', `${BASE_RESUME}/parse`, {}, authH(main.token))
    const before = await req('GET', `${BASE_RESUME}`, undefined, authH(main.token))
    check('re-parse sets draft again', Boolean(before.body?.data?.resume?.draft) && before.body.data.resume.importStatus === 'draft')

    const { status, body } = await req('POST', `${BASE_RESUME}/discard`, {}, authH(main.token))
    check('discard -> 200', status === 200)
    check('draft removed after discard', body.data?.resume?.draft === null || body.data?.resume?.draft === undefined)
    check('importStatus reset to "none"', body.data?.resume?.importStatus === 'none')
    check('originalFile preserved after discard', Boolean(body.data?.resume?.originalFile?.fileUrl))
  }

  // ══════════════════ DELETE ═══════════════════════════
  console.log('\n[6] Delete')

  // Normal delete (asset known to mock store)
  {
    const { status } = await req('DELETE', `${BASE_RESUME}`, undefined, authH(docxUser.token))
    check('DELETE resume -> 200', status === 200)
    const after = await req('GET', `${BASE_RESUME}`, undefined, authH(docxUser.token))
    check('Resume removed from Mongo (GET -> 404)', after.status === 404)
  }

  // Cloudinary deletion failure does NOT block Mongo deletion: point the
  // resume at an asset the mock store does not know (deleteFile returns false).
  {
    const user = edgeUser
    await req('PATCH', `${BASE_RESUME}`, { title: 'Orphan Asset Resume' }, authH(user.token))
    await Resume.findOneAndUpdate(
      { user: user.userId },
      {
        $set: {
          originalFile: {
            publicId: `careerflow/resumes/${user.userId}/missing-asset`,
            fileUrl: 'https://res.cloudinary.com/mock/raw/upload/v1/missing',
            originalFileName: 'missing.pdf',
            mimeType: 'application/pdf',
            fileSize: 0,
          },
        },
      },
      { upsert: true }
    )
    const { status } = await req('DELETE', `${BASE_RESUME}`, undefined, authH(user.token))
    check('DELETE succeeds when Cloudinary deletion fails -> 200', status === 200)
    const after = await req('GET', `${BASE_RESUME}`, undefined, authH(user.token))
    check('Resume still removed from Mongo despite storage failure', after.status === 404)
  }

  // ── Cleanup ───────────────────────────────────────────
  console.log('\n[7] Cleanup')
  await Resume.deleteMany({ user: { $in: [main.userId, docxUser.userId, edgeUser.userId, ghostUser.userId] } })
  await Profile.deleteMany({ user: { $in: [main.userId, docxUser.userId, edgeUser.userId, ghostUser.userId] } })

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
