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

const generateMockInterviewPreparation = () => ({
  questions: [
    {
      question: 'Explain how you would design a REST API for a job board with Node.js and Express.',
      category: 'technical',
      difficulty: 'medium',
    },
    {
      question: 'Describe a time you debugged a tricky production issue. What was your approach?',
      category: 'behavioral',
      difficulty: 'medium',
    },
    {
      question: 'How do you model MongoDB schemas for relationships like users and applications?',
      category: 'technical',
      difficulty: 'medium',
    },
    {
      question: 'Walk through how you would add pagination and filtering to an existing API endpoint.',
      category: 'technical',
      difficulty: 'easy',
    },
    {
      question: 'A deadline is slipping because a teammate is blocked. How do you handle it?',
      category: 'situational',
      difficulty: 'hard',
    },
    {
      question: 'Tell me about a project where you had to learn a new technology quickly.',
      category: 'behavioral',
      difficulty: 'easy',
    },
  ],
})

// Deterministic mock evaluation. The score varies with the question text so
// that summary aggregation is meaningful, but the same question always yields
// the same evaluation (no Gemini call in AI_MOCK mode).
const generateMockAnswerEvaluation = (questionText) => {
  const hash = Array.from(String(questionText)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const score = 70 + (hash % 11)
  return {
    score,
    technicalScore: Math.max(0, Math.min(100, score)),
    communicationScore: Math.max(0, Math.min(100, score - 4)),
    behavioralScore: Math.max(0, Math.min(100, score + 2)),
    strengths: ['Good understanding of the core concept'],
    weaknesses: ['Could add more detail and concrete examples'],
    feedback: 'Your answer covers the main concept but needs more detail and concrete examples.',
    suggestedAnswer: 'A stronger answer would explain the concept step by step and include a concrete example.',
  }
}

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

const generateInterviewPreparationJSON = async (prompt, schema) => {
  if (AI_MOCK) {
    return generateMockInterviewPreparation()
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

const generateAnswerEvaluationJSON = async (prompt, schema) => {
  if (AI_MOCK) {
    const questionMatch = prompt.match(/"question":\s*"([^"]*)"/)
    return generateMockAnswerEvaluation(questionMatch ? questionMatch[1] : '')
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

export { generateStructuredJSON, generateInterviewPreparationJSON, generateAnswerEvaluationJSON }
