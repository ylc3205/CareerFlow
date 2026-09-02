import { GoogleGenAI } from '@google/genai'

const DEFAULT_MODEL = 'gemini-2.5-flash'

const generateStructuredText = async (prompt, schema) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const ai = new GoogleGenAI({ apiKey })

  const config = { responseMimeType: 'application/json' }
  if (schema) {
    config.responseSchema = schema
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config,
  })

  return response.text
}

export { generateStructuredText }
