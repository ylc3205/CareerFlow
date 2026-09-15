import mongoose from 'mongoose'

export const CAREER_DIRECTION_BASE_TYPES = ['profile', 'resume']

export const CAREER_LEVELS = ['intern', 'junior', 'mid', 'senior', 'unspecified']

export const FOCUS_AREAS = [
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
]

export const GENERATION_MODES = [
  'manual',
  'ai_from_idea',
  'ai_from_background',
  'template_based',
]

const careerDirectionSchema = new mongoose.Schema(
  {
    // index: true removed — covered by the compound index { user, createdAt: -1 }
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    focusSkills: {
      type: [String],
      default: [],
    },
    targetRoles: {
      type: [String],
      default: [],
    },
    baseType: {
      type: String,
      enum: CAREER_DIRECTION_BASE_TYPES,
      required: true,
      default: 'resume',
    },
    careerLevel: {
      type: String,
      enum: CAREER_LEVELS,
      default: 'unspecified',
    },
    primaryFocus: {
      type: [String],
      enum: FOCUS_AREAS,
      default: [],
    },
    secondaryFocus: {
      type: [String],
      enum: FOCUS_AREAS,
      default: [],
    },
    learningPriorities: {
      type: [String],
      default: [],
    },
    rationale: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    suggestedNextSteps: {
      type: [String],
      default: [],
    },
    generationMetadata: {
      mode: {
        type: String,
        enum: GENERATION_MODES,
      },
      userIdea: String,
      contextSources: [String],
      modelVersion: String,
      generatedAt: Date,
      requestId: String,
    },
  },
  { timestamps: true }
)

careerDirectionSchema.index({ user: 1, createdAt: -1 })

const CareerDirection = mongoose.model('CareerDirection', careerDirectionSchema)

export default CareerDirection
