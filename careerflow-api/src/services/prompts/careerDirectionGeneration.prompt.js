export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    focusSkills: { type: 'array', items: { type: 'string' } },
    targetRoles: { type: 'array', items: { type: 'string' } },
    careerLevel: {
      type: 'string',
      enum: ['intern', 'junior', 'mid', 'senior', 'unspecified'],
    },
    primaryFocus: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'backend',
          'frontend',
          'apis',
          'databases',
          'cloud',
          'system_design',
          'ai',
          'devops',
          'mobile',
          'data',
          'security',
          'qa',
        ],
      },
    },
    secondaryFocus: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'backend',
          'frontend',
          'apis',
          'databases',
          'cloud',
          'system_design',
          'ai',
          'devops',
          'mobile',
          'data',
          'security',
          'qa',
        ],
      },
    },
    learningPriorities: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
    suggestedNextSteps: { type: 'array', items: { type: 'string' } },
    baseType: { type: 'string', enum: ['profile', 'resume'] },
  },
  required: [
    'title',
    'focusSkills',
    'targetRoles',
    'baseType',
  ],
}

const buildCareerDirectionGenerationPrompt = (input) => {
  const {
    mode,
    userIdea,
    targetRole,
    careerLevel,
    primaryFocus,
    secondaryFocus,
    contextSources,
    templateRole,
    context,
  } = input

  const modeInstructions = {
    ai_from_idea: [
      'MODE: AI from User Idea',
      'The user has explicitly described their career goal.',
      'Build the Career Direction PRIMARILY from the user\'s stated idea.',
      'The user\'s idea is the PRIMARY directive. Do not override it.',
    ],
    ai_from_background: [
      'MODE: AI from Background',
      'The user wants you to analyze their background and suggest a suitable career direction.',
      'Use ONLY the explicitly selected context sources.',
      'If the user also provided an idea, treat it as a guiding preference.',
    ],
    template_based: [
      'MODE: Template-Based',
      `The user selected "${templateRole}" as a starting template.`,
      'Use this role as the foundation.',
      'Apply the user\'s constraints (level, focus areas) and optional context to personalize it.',
    ],
  }

  const contextSections = []

  if (context?.resume) {
    contextSections.push(
      'RESUME (confirmed):',
      JSON.stringify(context.resume, null, 2),
    )
  }

  if (context?.profile) {
    contextSections.push(
      'PROFILE:',
      JSON.stringify(context.profile, null, 2),
    )
  }

  if (context?.existingDirections && context.existingDirections.length > 0) {
    contextSections.push(
      'EXISTING CAREER DIRECTIONS:',
      JSON.stringify(context.existingDirections, null, 2),
    )
  }

  const contextText = contextSections.length > 0
    ? ['\nSELECTED CONTEXT:', ...contextSections].join('\n')
    : '\nNO CONTEXT SELECTED. Generate from user intent only.'

  return [
    'You are an expert career coach helping a user define a structured Career Direction.',
    '',
    ...modeInstructions[mode],
    '',
    'USER INTENT:',
    userIdea ? `User Idea: "${userIdea}"` : 'No explicit idea provided.',
    targetRole ? `Target Role: "${targetRole}"` : 'Target Role: Not specified.',
    careerLevel ? `Career Level: ${careerLevel}` : 'Career Level: Not specified.',
    primaryFocus?.length ? `Primary Focus: ${primaryFocus.join(', ')}` : 'Primary Focus: Not specified.',
    secondaryFocus?.length ? `Secondary Focus: ${secondaryFocus.join(', ')}` : 'Secondary Focus: Not specified.',
    '',
    'CRITICAL RULES:',
    '1. The user\'s explicitly stated career goal (userIdea/targetRole) is the PRIMARY directive. NEVER override it based on background.',
    '2. Resume/Profile context provides transferable skills and background ONLY. It MUST NOT override the user\'s goal.',
    '3. If a user wants to transition from X to Y: Create a Y-focused Career Direction. Use X only as transferable background.',
    '4. NEVER invent: work experience, credentials, certifications, completed projects, or technical skills the user does not have. If something is a recommendation or learning goal, clearly treat it as a target skill rather than existing experience.',
    '5. Clearly distinguish CURRENT BACKGROUND (from context) from TARGET DIRECTION (from user intent).',
    '6. Career recommendations must match the requested career level.',
    '7. AI inference is only allowed to fill gaps when the user did not explicitly specify something.',
    '8. Return ONLY valid JSON matching the schema. No markdown, no code fences, no conversational text.',
    '',
    contextText,
    '',
    'Generate a Career Direction that reflects the user\'s INTENT, enhanced by their selected context.',
  ].join('\n')
}

export { buildCareerDirectionGenerationPrompt }