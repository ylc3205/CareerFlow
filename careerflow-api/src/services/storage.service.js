import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cloudinary from '../config/cloudinary.js'
import ApiError from '../utils/ApiError.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_STORAGE_DIR = path.resolve(__dirname, '../../.storage')

const isStorageMock = () => process.env.STORAGE_MOCK === 'true'

const getStorageDir = () => {
  if (process.env.STORAGE_MOCK_DIR) {
    return path.resolve(process.env.STORAGE_MOCK_DIR)
  }
  return DEFAULT_STORAGE_DIR
}

const resolveStoragePath = (publicId) => {
  if (!publicId || typeof publicId !== 'string') {
    throw new ApiError(400, 'Invalid storage publicId')
  }
  if (publicId.includes('\0')) {
    throw new ApiError(400, 'Invalid storage publicId')
  }
  const storageDir = getStorageDir()
  const targetPath = path.resolve(storageDir, publicId)
  const relative = path.relative(storageDir, targetPath)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new ApiError(400, 'Invalid storage path: traversal detected')
  }
  return targetPath
}

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

// Upload the raw CV file. In STORAGE_MOCK mode the buffer is persisted to the
// local filesystem (.storage or STORAGE_MOCK_DIR); otherwise uploaded to Cloudinary.
const uploadResumeFile = async (userId, file) => {
  const originalFileName = String(file.originalname || 'resume')
  const mimeType = file.mimetype || 'application/octet-stream'
  const fileSize = file.size || Buffer.byteLength(file.buffer || Buffer.alloc(0))

  if (isStorageMock()) {
    const publicId = `${RESUME_FOLDER(userId)}/${slugify(originalFileName)}-${simpleHash(
      `${userId}:${originalFileName}:${fileSize}`
    )}`
    const filePath = resolveStoragePath(publicId)
    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
      await fs.promises.writeFile(filePath, file.buffer || Buffer.alloc(0))
    } catch (err) {
      if (err instanceof ApiError) throw err
      console.error(`[storage] Failed to write mock file ${filePath}:`, err.message)
      throw new ApiError(500, 'Failed to save uploaded file to storage')
    }

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

// Best-effort deletion. Never throws — a storage failure must not block
// downstream work such as replacing a file or deleting the Resume.
const deleteFile = async (publicId) => {
  if (!publicId) return true
  if (isStorageMock()) {
    try {
      const filePath = resolveStoragePath(publicId)
      await fs.promises.unlink(filePath)
      return true
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false
      }
      console.error(`[storage] Failed to delete mock file ${publicId}:`, err.message)
      return false
    }
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
// the buffer is read from the filesystem; otherwise fetched via HTTP.
const downloadResumeFile = async (fileUrl, publicId) => {
  if (isStorageMock()) {
    const filePath = resolveStoragePath(publicId)
    try {
      return await fs.promises.readFile(filePath)
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new ApiError(404, 'Uploaded file not found')
      }
      throw new ApiError(422, 'Unable to read the uploaded file')
    }
  }

  try {
    const res = await fetch(fileUrl)
    if (res.status === 404) {
      throw new ApiError(404, 'Uploaded file not found')
    }
    if (!res.ok) throw new Error(`download failed with status ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('empty file')
    }
    return Buffer.from(arrayBuffer)
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(422, 'Unable to read the uploaded file')
  }
}

export {
  uploadResumeFile,
  deleteFile,
  downloadResumeFile,
  resolveStoragePath,
  getStorageDir,
  DEFAULT_STORAGE_DIR,
}
