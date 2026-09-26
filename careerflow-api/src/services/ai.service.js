import ApiError from '../utils/ApiError.js'
import { generateStructuredText as geminiGenerateStructuredText } from './providers/gemini.provider.js'

const AI_MOCK = process.env.AI_MOCK === 'true'

const providers = {
  gemini: geminiGenerateStructuredText,
}

const generateMockResult = () => ({
  skillsScore: 90,
  experienceScore: 85,
  backgroundScore: 85,
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

// Deterministic mock resume parse. The output passes the same Zod schema as the
// real provider result and is validated through the same normalize path.
const generateMockResumeParse = () => ({
  title: 'Backend Developer Resume',
  summary: 'Backend developer with experience designing and building REST APIs using Node.js, Express and MongoDB.',
  skills: ['Node.js', 'Express.js', 'MongoDB', 'REST APIs', 'JavaScript'],
  languages: ['English', 'Vietnamese'],
  experience: [
    {
      company: 'TechCorp Vietnam',
      position: 'Backend Developer',
      description: 'Designed and built REST APIs with Node.js, Express.js and MongoDB.',
      startDate: '2022-03-01',
      current: true,
    },
    {
      company: 'Startup Lab',
      position: 'Backend Intern',
      description: 'Implemented API endpoints and automated database migrations.',
      startDate: '2021-06-01',
      endDate: '2021-12-31',
    },
  ],
  education: [
    {
      school: 'HCMUT',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      startDate: '2017-09-01',
      endDate: '2021-06-01',
    },
  ],
  projects: [
    {
      name: 'CareerFlow',
      description: 'AI-powered job application management platform.',
      url: '',
      techStack: ['Node.js', 'MongoDB', 'React'],
    },
  ],
  certifications: [
    {
      name: 'AWS Certified Developer - Associate',
      issuer: 'Amazon Web Services',
      issueDate: '2023-05-01',
      expiryDate: '',
      url: '',
    },
  ],
  profile: {
    fullName: 'Test Candidate',
    phone: '',
    location: 'Ho Chi Minh City',
    headline: 'Backend Developer',
    yearsOfExperience: 3,
  },
})

const generateMockCareerDirection = () => ({
  title: 'Backend Developer',
  description: 'Transition to backend development with focus on Node.js, APIs, and databases.',
  focusSkills: ['Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'REST APIs', 'GraphQL', 'Docker', 'Redis', 'TypeScript', 'System Design'],
  targetRoles: ['Backend Developer', 'Node.js Developer', 'API Engineer'],
  careerLevel: 'junior',
  primaryFocus: ['backend', 'apis', 'databases'],
  secondaryFocus: ['cloud', 'system_design'],
  learningPriorities: ['Node.js internals', 'Database optimization', 'Microservices patterns', 'Cloud deployment (AWS/GCP)'],
  rationale: 'Based on your goal to transition into backend development, this direction emphasizes server-side technologies while leveraging your existing programming foundation.',
  suggestedNextSteps: ['Build a REST API with Node.js/Express', 'Learn PostgreSQL', 'Deploy to cloud platform'],
  baseType: 'resume',
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
  } catch (error) {
    console.error('AI provider failed:', {
      provider: providerName,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      status: error?.status || error?.response?.status,
      message: error?.message,
      code: error?.code || error?.response?.statusText
    })
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
  } catch (error) {
    console.error('AI provider failed:', {
      provider: providerName,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      status: error?.status || error?.response?.status,
      message: error?.message,
      code: error?.code || error?.response?.statusText
    })
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
  } catch (error) {
    console.error('AI provider failed:', {
      provider: providerName,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      status: error?.status || error?.response?.status,
      message: error?.message,
      code: error?.code || error?.response?.statusText
    })
    throw new ApiError(503, 'AI Service Unavailable')
  }
}

const generateResumeParseJSON = async (prompt, schema) => {
  if (AI_MOCK) {
    return generateMockResumeParse()
  }

  const providerName = process.env.DEFAULT_AI_PROVIDER || 'gemini'
  const provider = providers[providerName]
  if (!provider) {
    throw new ApiError(503, 'AI Service Unavailable')
  }

  try {
    const text = await provider(prompt, schema)
    return parseJson(text)
  } catch (error) {
    console.error('AI provider failed:', {
      provider: providerName,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      status: error?.status || error?.response?.status,
      message: error?.message,
      code: error?.code || error?.response?.statusText
    })
    throw new ApiError(503, 'AI Service Unavailable')
  }
}

const generateCareerDirectionJSON = async (prompt, schema) => {
  if (AI_MOCK) {
    return generateMockCareerDirection()
  }

  const providerName = process.env.DEFAULT_AI_PROVIDER || 'gemini'
  const provider = providers[providerName]
  if (!provider) {
    throw new ApiError(503, 'AI Service Unavailable')
  }

  try {
    const text = await provider(prompt, schema)
    return parseJson(text)
  } catch (error) {
    console.error('AI provider failed:', {
      provider: providerName,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      status: error?.status || error?.response?.status,
      message: error?.message,
      code: error?.code || error?.response?.statusText
    })
    throw new ApiError(503, 'AI Service Unavailable')
  }
}

export {
  generateStructuredJSON,
  generateInterviewPreparationJSON,
  generateAnswerEvaluationJSON,
  generateResumeParseJSON,
  generateCareerDirectionJSON,
}
