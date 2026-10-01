import mongoose from 'mongoose'

const aiAnalysisSchema = new mongoose.Schema(
  {
    // User who owns this analysis. Scopes all queries — kept on compound index.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // index: true removed — covered by the compound unique index { user, job }
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      // index: true removed — covered by the compound unique index { user, job }
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    skillsScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    experienceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    backgroundScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    // model / provider removed — never written, always null, explicitly stripped from API responses.
    // Historical AI provenance for job matching is NOT recorded here.
    // Career direction context is stored as a plain ObjectId snapshot (no live ref).
    careerDirectionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    careerDirectionTitle: { type: String, default: null },
    candidateSourceType: { type: String, enum: ['general', 'profile', 'resume'], default: null },
  },
  { timestamps: true }
)

// Compound unique index: at most one AI analysis per User + Job.
aiAnalysisSchema.index({ user: 1, job: 1 }, { unique: true })
// ESR compound index for user's analysis history listing
aiAnalysisSchema.index({ user: 1, createdAt: -1 })
// Job index: retained for queries filtering by job alone (cannot be served by compound index with user prefix).
aiAnalysisSchema.index({ job: 1 })

const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema)

export default AIAnalysis