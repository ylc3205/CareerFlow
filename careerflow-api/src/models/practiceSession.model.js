import mongoose from 'mongoose'

export const PRACTICE_STATUSES = ['not_started', 'in_progress', 'completed']

const evaluationSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100 },
    technicalScore: { type: Number, min: 0, max: 100 },
    communicationScore: { type: Number, min: 0, max: 100 },
    behavioralScore: { type: Number, min: 0, max: 100 },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    feedback: { type: String, default: '' },
    suggestedAnswer: { type: String, default: '' },
  },
  { _id: false }
)

const practiceAnswerSchema = new mongoose.Schema(
  {
    questionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['technical', 'behavioral', 'situational'],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    answer: {
      type: String,
      default: '',
      trim: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    evaluation: { type: evaluationSchema, default: null },
    answeredAt: { type: Date, default: null },
  },
  { _id: false }
)

const summarySchema = new mongoose.Schema(
  {
    overallScore: { type: Number, min: 0, max: 100, default: null },
    technicalScore: { type: Number, min: 0, max: 100, default: null },
    communicationScore: { type: Number, min: 0, max: 100, default: null },
    behavioralScore: { type: Number, min: 0, max: 100, default: null },
    strongAreas: { type: [String], default: [] },
    weakAreas: { type: [String], default: [] },
  },
  { _id: false }
)

const practiceSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
    },
    preparation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewPreparation',
      required: true,
    },
    status: {
      type: String,
      enum: PRACTICE_STATUSES,
      default: 'not_started',
    },
    answers: { type: [practiceAnswerSchema], default: [] },
    summary: { type: summarySchema, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// Multiple practice sessions per interview are allowed (no unique constraint).
practiceSessionSchema.index({ user: 1, interview: 1 })
practiceSessionSchema.index({ user: 1, interview: 1, status: 1 })
// Phase 19 analytics/history read patterns.
practiceSessionSchema.index({ user: 1, status: 1, createdAt: -1 })
practiceSessionSchema.index({ user: 1, status: 1, completedAt: -1 })

const PracticeSession = mongoose.model('PracticeSession', practiceSessionSchema)

export default PracticeSession