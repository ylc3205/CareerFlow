import cloudinary from '../config/cloudinary.js'
import ApiError from '../utils/ApiError.js'

const STORAGE_MOCK = process.env.STORAGE_MOCK === 'true'

// In-memory store for STORAGE_MOCK mode so upload → parse round-trips offline
// (the server process retains uploaded buffers keyed by publicId).
const mockStore = new Map()

const RESUME_FOLDER = (userId) => `careerflow/resumes/${userId}`

const slugify = (value) => {
  const base = String(value || 'resume')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base.slice(0, 60) || 'resume'
}

const simpleHash = (value) => {
  let hash = 0
  const str = String(value)
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}

const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error)
      return resolve(result)
    })
    stream.end(buffer)
  })

// Upload the raw CV file to Cloudinary. In STORAGE_MOCK mode no network call
// happens; a deterministic fake URL/publicId is returned instead.
const uploadResumeFile = async (userId, file) => {
  const originalFileName = String(file.originalname || 'resume')
  const mimeType = file.mimetype || 'application/octet-stream'
  const fileSize = file.size || Buffer.byteLength(file.buffer || Buffer.alloc(0))

  if (STORAGE_MOCK) {
    const publicId = `${RESUME_FOLDER(userId)}/${slugify(originalFileName)}-${simpleHash(
      `${userId}:${originalFileName}:${fileSize}`
    )}`
    mockStore.set(publicId, Buffer.from(file.buffer || Buffer.alloc(0)))
    return {
      fileUrl: `https://res.cloudinary.com/mock/raw/upload/v1/${publicId}`,
      publicId,
      originalFileName,
      mimeType,
      fileSize,
    }
  }

  try {
    const result = await uploadBuffer(file.buffer, {
      folder: RESUME_FOLDER(userId),
      resource_type: 'raw',
      use_filename: true,
      unique_filename: true,
    })
    return {
      fileUrl: result.secure_url || result.url,
      publicId: result.public_id,
      originalFileName,
      mimeType,
      fileSize,
    }
  } catch {
    throw new ApiError(502, 'Failed to upload file to cloud storage')
  }
}

// Best-effort deletion. Never throws — a Cloudinary outage must not block
// downstream work such as replacing a file or deleting the Resume.
const deleteFile = async (publicId) => {
  if (!publicId) return true
  if (STORAGE_MOCK) {
    // Simulates a Cloudinary delete. Returns false when the asset is not known
    // (mirrors a failed/not-found deletion) so callers can verify that a
    // storage failure never blocks downstream Mongo work.
    return mockStore.delete(publicId)
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
    return true
  } catch (err) {
    console.error(`[storage] Failed to delete Cloudinary asset ${publicId}:`, err.message)
    return false
  }
}

// Downloads the uploaded CV so its text can be extracted. In STORAGE_MOCK mode
// the buffer comes from the in-memory store instead of the network.
const downloadResumeFile = async (fileUrl, publicId) => {
  if (STORAGE_MOCK) {
    const buffer = mockStore.get(publicId)
    return buffer || Buffer.alloc(0)
  }

  try {
    const res = await fetch(fileUrl)
    if (!res.ok) throw new Error(`download failed with status ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('empty file')
    }
    return Buffer.from(arrayBuffer)
  } catch {
    throw new ApiError(422, 'Unable to read the uploaded file')
  }
}

export { uploadResumeFile, deleteFile, downloadResumeFile }
