export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    matchScore: { type: 'integer' },
    matchedSkills: { type: 'array', items: { type: 'string' } },
    missingSkills: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'matchScore',
    'matchedSkills',
    'missingSkills',
    'strengths',
    'weaknesses',
    'recommendations',
  ],
}

const buildJobMatchPrompt = (jobPayload, candidatePayload) => {
  return [
    'You are an expert technical recruiter and career coach.',
    'Analyze the candidate profile against the job description and evaluate how well the candidate fits the job.',
    '',
    'Return ONLY a valid JSON object matching this exact schema (no markdown, no code fences, no conversational text):',
    JSON.stringify(
      {
        matchScore: 'integer from 0 to 100 representing how well the candidate fits the job',
        matchedSkills: 'skills present in both the job and the candidate',
        missingSkills: 'job skills the candidate is missing',
        strengths: 'candidate strengths relevant to this job',
        weaknesses: 'candidate weaknesses relevant to this job',
        recommendations: 'concise actionable advice to improve the fit',
      },
      null,
      2
    ),
    '',
    'Rules:',
    '- Keep matchScore between 0 and 100.',
    '- Only use the information provided below. Do not invent candidate information.',
    '- matchedSkills, missingSkills, strengths, weaknesses and recommendations must each be arrays of strings.',
    '- Keep recommendations concise, specific and actionable.',
    '',
    'JOB:',
    JSON.stringify(jobPayload),
    '',
    'CANDIDATE:',
    JSON.stringify(candidatePayload),
  ].join('\n')
}

export { buildJobMatchPrompt }
