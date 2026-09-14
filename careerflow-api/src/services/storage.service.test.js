import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ApiError from '../utils/ApiError.js'
import cloudinary from '../config/cloudinary.js'

vi.mock('../config/cloudinary.js', () => ({
  default: {
    uploader: {
      upload_stream: vi.fn(),
      destroy: vi.fn(),
    },
  },
}))

describe('storage.service', () => {
  let tempStorageDir
  const originalEnvStorageMock = process.env.STORAGE_MOCK
  const originalEnvStorageDir = process.env.STORAGE_MOCK_DIR

  beforeEach(() => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-storage-test-'))
    process.env.STORAGE_MOCK = 'true'
    process.env.STORAGE_MOCK_DIR = tempStorageDir
    vi.clearAllMocks()
  })

  afterEach(async () => {
    process.env.STORAGE_MOCK = originalEnvStorageMock
    process.env.STORAGE_MOCK_DIR = originalEnvStorageDir
    try {
      await fs.promises.rm(tempStorageDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  })

  describe('Filesystem-backed STORAGE_MOCK mode', () => {
    it('uploadResumeFile writes actual buffer to disk and returns metadata', async () => {
      const { uploadResumeFile, resolveStoragePath } = await import('./storage.service.js')

      const dummyBuffer = Buffer.from('PDF file content header and body', 'utf8')
      const file = {
        originalname: 'my-resume.pdf',
        mimetype: 'application/pdf',
        size: dummyBuffer.length,
        buffer: dummyBuffer,
      }

      const meta = await uploadResumeFile('user-123', file)

      expect(meta.publicId).toMatch(/^careerflow\/resumes\/user-123\/my-resume-[a-f0-9]+$/)
      expect(meta.fileUrl).toBe(`https://res.cloudinary.com/mock/raw/upload/v1/${meta.publicId}`)
      expect(meta.originalFileName).toBe('my-resume.pdf')
      expect(meta.mimeType).toBe('application/pdf')
      expect(meta.fileSize).toBe(dummyBuffer.length)

      const diskPath = resolveStoragePath(meta.publicId)
      expect(fs.existsSync(diskPath)).toBe(true)

      const onDisk = await fs.promises.readFile(diskPath)
      expect(onDisk.equals(dummyBuffer)).toBe(true)
    })

    it('downloadResumeFile reads actual file bytes from disk', async () => {
      const { uploadResumeFile, downloadResumeFile } = await import('./storage.service.js')

      const dummyBuffer = Buffer.from('Sample DOCX binary data', 'utf8')
      const file = {
        originalname: 'resume.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: dummyBuffer.length,
        buffer: dummyBuffer,
      }

      const meta = await uploadResumeFile('user-456', file)
      const downloaded = await downloadResumeFile(meta.fileUrl, meta.publicId)

      expect(downloaded.equals(dummyBuffer)).toBe(true)
    })

    it('downloadResumeFile throws 404 "Uploaded file not found" when physical file is missing', async () => {
      const { downloadResumeFile } = await import('./storage.service.js')

      const missingPublicId = 'careerflow/resumes/user-999/nonexistent-file-1234'
      const fakeUrl = `https://res.cloudinary.com/mock/raw/upload/v1/${missingPublicId}`

      await expect(downloadResumeFile(fakeUrl, missingPublicId)).rejects.toSatisfy((err) => {
        return err instanceof ApiError && err.statusCode === 404 && err.message === 'Uploaded file not found'
      })
    })

    it('deleteFile deletes the physical file from disk and returns true', async () => {
      const { uploadResumeFile, deleteFile, resolveStoragePath } = await import('./storage.service.js')

      const file = {
        originalname: 'delete-me.pdf',
        mimetype: 'application/pdf',
        size: 10,
        buffer: Buffer.from('0123456789'),
      }

      const meta = await uploadResumeFile('user-del', file)
      const diskPath = resolveStoragePath(meta.publicId)
      expect(fs.existsSync(diskPath)).toBe(true)

      const result = await deleteFile(meta.publicId)
      expect(result).toBe(true)
      expect(fs.existsSync(diskPath)).toBe(false)
    })

    it('deleteFile returns false when file is already missing and never throws', async () => {
      const { deleteFile } = await import('./storage.service.js')

      const result = await deleteFile('careerflow/resumes/user-missing/already-gone-abc')
      expect(result).toBe(false)
    })

    it('persists data across service reinitialization / process restart', async () => {
      const storageService1 = await import('./storage.service.js')

      const dummyBuffer = Buffer.from('Persistent Resume Content', 'utf8')
      const file = {
        originalname: 'persistent.pdf',
        mimetype: 'application/pdf',
        size: dummyBuffer.length,
        buffer: dummyBuffer,
      }

      const meta = await storageService1.uploadResumeFile('user-persist', file)

      // Simulate complete module reload (simulating service / worker restart)
      vi.resetModules()
      const storageService2 = await import('./storage.service.js')

      const readBack = await storageService2.downloadResumeFile(meta.fileUrl, meta.publicId)
      expect(readBack.equals(dummyBuffer)).toBe(true)
    })

    it('resolves default directory when STORAGE_MOCK_DIR is not set', async () => {
      delete process.env.STORAGE_MOCK_DIR
      const { getStorageDir, DEFAULT_STORAGE_DIR } = await import('./storage.service.js')

      expect(getStorageDir()).toBe(DEFAULT_STORAGE_DIR)
      expect(DEFAULT_STORAGE_DIR).toMatch(/[/\\]\.storage$/)
    })

    it('traversal protection: resolveStoragePath rejects path traversal attempts', async () => {
      const { resolveStoragePath } = await import('./storage.service.js')

      const expectTraversal = (fn, expectedMsg = 'Invalid storage path: traversal detected') => {
        try {
          fn()
          expect.unreachable('Should have thrown')
        } catch (err) {
          expect(err.statusCode).toBe(400)
          expect(err.message).toBe(expectedMsg)
        }
      }

      expectTraversal(() => resolveStoragePath('../../etc/passwd'))
      expectTraversal(() => resolveStoragePath('../secret.txt'))
      expectTraversal(() => resolveStoragePath('careerflow/resumes/../../../outside.txt'))
      expectTraversal(() => resolveStoragePath('/absolute/path'))
      expectTraversal(() => resolveStoragePath('null\0byte'), 'Invalid storage publicId')
      expectTraversal(() => resolveStoragePath(''), 'Invalid storage publicId')
      expectTraversal(() => resolveStoragePath(null), 'Invalid storage publicId')
    })
  })

  describe('Real Cloudinary mode (STORAGE_MOCK=false)', () => {
    beforeEach(() => {
      process.env.STORAGE_MOCK = 'false'
    })

    it('uploadResumeFile delegates to cloudinary.uploader.upload_stream', async () => {
      const { uploadResumeFile } = await import('./storage.service.js')

      cloudinary.uploader.upload_stream.mockImplementation((opts, callback) => {
        const stream = {
          end: (buf) => {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/real/raw/upload/v1/remote.pdf',
              public_id: 'careerflow/resumes/user-cld/remote.pdf',
            })
          },
        }
        return stream
      })

      const file = {
        originalname: 'real.pdf',
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('cloudinary data'),
      }

      const meta = await uploadResumeFile('user-cld', file)
      expect(meta.fileUrl).toBe('https://res.cloudinary.com/real/raw/upload/v1/remote.pdf')
      expect(meta.publicId).toBe('careerflow/resumes/user-cld/remote.pdf')
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalled()
    })

    it('deleteFile delegates to cloudinary.uploader.destroy', async () => {
      const { deleteFile } = await import('./storage.service.js')

      cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' })

      const result = await deleteFile('careerflow/resumes/user-cld/del.pdf')
      expect(result).toBe(true)
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'careerflow/resumes/user-cld/del.pdf',
        { resource_type: 'raw' }
      )
    })
  })
})
