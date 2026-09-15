import mongoose from 'mongoose'

const interviewQuestionSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
)

const interviewPreparationSchema = new mongoose.Schema(
  {
    // User who owns this preparation. Scoped by compound unique index { user, interview }.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // index: true removed — covered by the compound unique index { user, interview }
    },
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
    },
    // job removed — write-only field, never read back, never queried.
    // Job context is always derived via Interview → Application → Job at query time.
    questions: { type: [interviewQuestionSchema], default: [] },
    // model / provider removed — never written, always null, never consumed by any service or frontend.
  },
  { timestamps: true }
)

// Compound unique index: at most one preparation per User + Interview.
interviewPreparationSchema.index({ user: 1, interview: 1 }, { unique: true })

const InterviewPreparation = mongoose.model('InterviewPreparation', interviewPreparationSchema)

export default InterviewPreparation