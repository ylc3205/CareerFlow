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
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    questions: { type: [interviewQuestionSchema], default: [] },
    model: { type: String, default: null },
    provider: { type: String, default: null },
  },
  { timestamps: true }
)

// Compound unique index: at most one preparation per User + Interview.
interviewPreparationSchema.index({ user: 1, interview: 1 }, { unique: true })

const InterviewPreparation = mongoose.model('InterviewPreparation', interviewPreparationSchema)

export default InterviewPreparation