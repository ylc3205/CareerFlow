// Shared enum + badge variant maps. Source of truth is the backend models:
//   Application: APPLICATION_STATUSES
//   Interview:   INTERVIEW_TYPES, INTERVIEW_STATUSES

export const APPLICATION_STATUSES = ['applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn']

export const APPLICATION_STATUS_VARIANT = {
  applied: 'primary',
  screening: 'warning',
  interviewing: 'warning',
  offer: 'success',
  rejected: 'destructive',
  withdrawn: 'default',
}

// Progress order shown on the application status timeline.
// rejected and withdrawn are terminal states, not part of the progress order.
export const APPLICATION_PROGRESS = ['applied', 'screening', 'interviewing', 'offer']

export const APPLICATION_TERMINAL = ['rejected', 'withdrawn']

export const INTERVIEW_TYPES = ['phone', 'video', 'onsite', 'take-home', 'other']

export const INTERVIEW_TYPE_VARIANT = {
  phone: 'primary',
  video: 'primary',
  onsite: 'default',
  'take-home': 'warning',
  other: 'default',
}

export const INTERVIEW_STATUSES = ['scheduled', 'completed', 'canceled', 'no-show']

export const INTERVIEW_STATUS_VARIANT = {
  scheduled: 'primary',
  completed: 'success',
  canceled: 'destructive',
  'no-show': 'destructive',
}

export const PRACTICE_STATUSES = ['not_started', 'in_progress', 'completed']

export const PRACTICE_STATUS_LABEL = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
}

export const PRACTICE_STATUS_VARIANT = {
  not_started: 'default',
  in_progress: 'warning',
  completed: 'success',
}

// Practice answer category/difficulty labels and badge variants.
export const PRACTICE_CATEGORY_LABEL = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  situational: 'Situational',
}

export const PRACTICE_CATEGORY_VARIANT = {
  technical: 'primary',
  behavioral: 'warning',
  situational: 'default',
}

export const PRACTICE_DIFFICULTY_LABEL = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const PRACTICE_DIFFICULTY_VARIANT = {
  easy: 'success',
  medium: 'warning',
  hard: 'destructive',
}