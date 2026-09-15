import mongoose from 'mongoose'

export const APPLICATION_STATUSES = [
  'applied',
  'screening',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
]

const applicationSchema = new mongoose.Schema(
  {
    // index: true removed — covered by the compound unique index { user, job }
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'applied',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

// One user can have only ONE application per job.
// Two different users can both apply to the same job.
applicationSchema.index({ user: 1, job: 1 }, { unique: true })

const Application = mongoose.model('Application', applicationSchema)

export default Application
