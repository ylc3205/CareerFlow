import ApiError from '../utils/ApiError.js'
import { generateStructuredText as geminiGenerateStructuredText } from './providers/gemini.provider.js'

const AI_MOCK = process.env.AI_MOCK === 'true'

const providers = {
  gemini: geminiGenerateStructuredText,
}

const generateMockResult = () => ({
  matchScore: 87,
  matchedSkills: ['Node.js', 'Express.js', 'MongoDB'],
  missingSkills: ['Redis', 'Docker'],
  strengths: ['Backend experience', 'REST API design'],
  weaknesses: ['Limited cloud infrastructure experience'],
  recommendations: ['Learn Docker basics', 'Add Redis caching layer'],
})

const parseJson = (text) => {
  if (!text) return null
  let str = String(text).trim()
  const fence = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fence) str = fence[1]
  try {
    const parsed = JSON.parse(str)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const generateStructuredJSON = async (prompt, schema) => {
  if (AI_MOCK) {
    return generateMockResult()
  }

  const providerName = process.env.DEFAULT_AI_PROVIDER || 'gemini'
  const provider = providers[providerName]
  if (!provider) {
    throw new ApiError(503, 'AI Service Unavailable')
  }

  try {
    const text = await provider(prompt, schema)
    return parseJson(text)
  } catch {
    throw new ApiError(503, 'AI Service Unavailable')
  }
}

export { generateStructuredJSON }
