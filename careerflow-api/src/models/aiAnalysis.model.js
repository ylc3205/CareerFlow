import mongoose from 'mongoose'

const aiAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    model: { type: String, default: null },
    provider: { type: String, default: null },
    careerDirectionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    careerDirectionTitle: { type: String, default: null },
    candidateSourceType: { type: String, enum: ['general', 'profile', 'resume'], default: null },
  },
  { timestamps: true }
)

// Compound unique index: at most one AI analysis per User + Job.
aiAnalysisSchema.index({ user: 1, job: 1 }, { unique: true })

const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema)

export default AIAnalysis