// Shared fixtures for Career Direction tests.
//
// Shapes mirror the backend contract:
//   POST /career-directions/generate -> { success, data: { generatedDirection, metadata } }
//   POST /career-directions           -> { success, data: { careerDirection } }  (201)
//   GET  /career-directions/:id       -> { success, data: { careerDirection } }

export const mockGeneratedDirection = {
  title: 'Backend Developer',
  description: 'Transition to backend development with focus on Node.js, APIs, and databases.',
  focusSkills: ['Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'REST APIs'],
  targetRoles: ['Backend Developer', 'Node.js Developer', 'API Engineer'],
  careerLevel: 'junior',
  primaryFocus: ['backend', 'apis', 'databases'],
  secondaryFocus: ['cloud', 'system_design'],
  learningPriorities: ['Node.js internals', 'Database optimization', 'Cloud deployment'],
  rationale: 'This direction emphasizes server-side technologies that map to your goal.',
  suggestedNextSteps: ['Build a REST API with Node.js/Express', 'Learn PostgreSQL'],
  baseType: 'resume',
}

export const mockMetadata = {
  mode: 'ai_from_idea',
  userIdea: 'I want to become a Node.js backend developer',
  contextSources: [],
  modelVersion: 'gemini-2.5-flash',
  generatedAt: '2026-09-08T04:00:00.000Z',
  requestId: 'gen_123_abc123',
}

export const mockGenerationResponse = {
  generatedDirection: mockGeneratedDirection,
  metadata: mockMetadata,
}

export const mockSavedDirection = {
  _id: 'cd_1',
  user: 'user_1',
  title: 'Backend Developer',
  description: 'Transition to backend development with focus on Node.js, APIs, and databases.',
  focusSkills: ['Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'REST APIs'],
  targetRoles: ['Backend Developer', 'Node.js Developer', 'API Engineer'],
  careerLevel: 'junior',
  primaryFocus: ['backend', 'apis', 'databases'],
  secondaryFocus: ['cloud', 'system_design'],
  learningPriorities: ['Node.js internals', 'Database optimization', 'Cloud deployment'],
  rationale: 'This direction emphasizes server-side technologies that map to your goal.',
  suggestedNextSteps: ['Build a REST API with Node.js/Express', 'Learn PostgreSQL'],
  baseType: 'resume',
  generationMetadata: mockMetadata,
  createdAt: '2026-09-08T04:05:00.000Z',
  updatedAt: '2026-09-08T04:05:00.000Z',
}

export const mockCreateResponse = {
  careerDirection: mockSavedDirection,
}