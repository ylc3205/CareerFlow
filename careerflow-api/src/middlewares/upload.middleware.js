import multer from 'multer'
import ApiError from '../utils/ApiError.js'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ALLOWED_EXTENSIONS = ['.pdf', '.docx']

const RESUME_MAX_SIZE_MB = Number(process.env.RESUME_MAX_SIZE_MB) || 10
const MAX_FILE_SIZE_BYTES = RESUME_MAX_SIZE_MB * 1024 * 1024

const isAllowedFile = (file) => {
  if (!file) return false
  const ext = file.originalname ? file.originalname.toLowerCase().split('.').pop() : ''
  return (
    ALLOWED_MIME_TYPES.includes(file.mimetype) &&
    ALLOWED_EXTENSIONS.includes(`.${ext}`)
  )
}

const storage = multer.memoryStorage()

const uploadResumeFile = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isAllowedFile(file)) {
      return cb(new ApiError(400, 'Unsupported file type. Only PDF and DOCX files are allowed.'))
    }
    return cb(null, true)
  },
}).single('file')

export { uploadResumeFile, RESUME_MAX_SIZE_MB, MAX_FILE_SIZE_BYTES }