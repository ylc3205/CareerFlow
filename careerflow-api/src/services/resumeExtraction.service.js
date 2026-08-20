import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import ApiError from '../utils/ApiError.js'

const MAX_EXTRACTED_CHARS = 50000

const normalizeText = (text) => {
  if (!text) return ''
  return String(text)
    .replace(/\r\n/g, '\n')
    // pdf-parse v2 emits page-marker footer lines like "-- 1 of 2 --";
    // strip them so textless/scanned PDFs reduce to empty text.
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const extractPdfText = async (buffer) => {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  return result ? result.text : ''
}

const extractDocxText = async (buffer) => {
  const result = await mammoth.extractRawText({ buffer })
  return result ? result.value : ''
}

const extractResumeText = async (buffer, mimeType) => {
  if (!buffer || buffer.length === 0) {
    throw new ApiError(422, 'Unable to read the uploaded file')
  }

  let rawText
  try {
    if (mimeType === 'application/pdf') {
      rawText = await extractPdfText(buffer)
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      rawText = await extractDocxText(buffer)
    } else {
      throw new ApiError(400, 'Unsupported file type. Only PDF and DOCX files are allowed.')
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(422, 'Unable to read the uploaded file')
  }

  const text = normalizeText(rawText)
  if (!text) {
    // Covers scanned/image-only PDFs that contain no extractable text.
    throw new ApiError(422, 'No readable text was found in the uploaded file')
  }

  return text.length > MAX_EXTRACTED_CHARS ? text.slice(0, MAX_EXTRACTED_CHARS) : text
}

export { extractResumeText }