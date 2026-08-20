import Resume from '../models/resume.model.js'
import ApiError from '../utils/ApiError.js'
import { uploadResumeFile, deleteFile } from './storage.service.js'
import { parseResume as parseResumeDraft } from './resumeParse.service.js'

const getResume = async (userId) => {
  const resume = await Resume.findOne({ user: userId })
  if (!resume) {
    throw new ApiError(404, 'Resume not found')
  }
  return resume
}

const updateResume = async (userId, data) => {
  const resume = await Resume.findOneAndUpdate(
    { user: userId },
    { $set: data },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
  return resume
}

const uploadResume = async (userId, file) => {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new ApiError(400, 'No file uploaded')
  }

  const existing = await Resume.findOne({ user: userId })
  const oldPublicId = existing && existing.originalFile ? existing.originalFile.publicId : null

  // 1. Upload the new file to Cloudinary first.
  const meta = await uploadResumeFile(userId, file)

  // 2. Persist only the Cloudinary metadata in MongoDB (upsert).
  let saved
  try {
    saved = await Resume.findOneAndUpdate(
      { user: userId },
      { $set: { originalFile: meta, importStatus: 'none' }, $unset: { draft: '' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )
  } catch (err) {
    // 2b. MongoDB failed after a successful upload: roll back the new asset and
    // preserve the previous Resume state.
    await deleteFile(meta.publicId)
    throw new ApiError(502, 'Failed to save uploaded file metadata')
  }

  // 3. Best-effort cleanup of the previous CV (never fails the request).
  if (oldPublicId && oldPublicId !== meta.publicId) {
    await deleteFile(oldPublicId)
  }

  return saved
}

const parseResume = async (userId) => parseResumeDraft(userId)

const confirmResume = async (userId, data) => {
  const resume = await Resume.findOne({ user: userId })
  if (!resume) {
    throw new ApiError(404, 'Resume not found')
  }

  resume.set(data)
  resume.importStatus = 'confirmed'
  try {
    await resume.save()
  } catch {
    throw new ApiError(500, 'Failed to save resume')
  }
  return resume
}

const discardDraft = async (userId) => {
  const resume = await Resume.findOne({ user: userId })
  if (!resume) {
    throw new ApiError(404, 'Resume not found')
  }

  resume.draft = null
  resume.importStatus = 'none'
  try {
    await resume.save()
  } catch {
    throw new ApiError(500, 'Failed to discard resume draft')
  }
  return resume
}

const deleteResume = async (userId) => {
  const resume = await Resume.findOne({ user: userId })
  if (!resume) {
    throw new ApiError(404, 'Resume not found')
  }

  // Best-effort Cloudinary cleanup. A storage outage must NOT block the delete.
  if (resume.originalFile && resume.originalFile.publicId) {
    await deleteFile(resume.originalFile.publicId)
  }

  await resume.deleteOne()
}

export { getResume, updateResume, uploadResume, parseResume, confirmResume, discardDraft, deleteResume }