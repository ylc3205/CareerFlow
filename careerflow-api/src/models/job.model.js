import mongoose from 'mongoose'

export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'internship', 'contract', 'freelance']
export const WORKPLACE_TYPES = ['remote', 'hybrid', 'onsite']
export const JOB_STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed']

const salarySchema = new mongoose.Schema(
  {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, trim: true, default: 'USD' },
    period: { type: String, enum: ['hourly', 'monthly', 'yearly'] },
  },
  { _id: false }
)

const jobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // index: true removed — covered by compound indexes with user prefix
    },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES },
    workplaceType: { type: String, enum: WORKPLACE_TYPES },
    skills: { type: [String], default: [] },
    requirements: { type: String, trim: true },
    responsibilities: { type: String, trim: true },
    salary: { type: salarySchema },
    source: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    postedAt: { type: Date },
    deadline: { type: Date },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: 'saved',
    },
    notes: { type: String, trim: true },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

// ESR compound indexes for active job listing and status filtering
jobSchema.index({ user: 1, isDeleted: 1, createdAt: -1 })
jobSchema.index({ user: 1, isDeleted: 1, status: 1, createdAt: -1 })

// Compound unique index: one user cannot save the same URL twice across active jobs.
// Uses $type: 'string' and isDeleted: false in partialFilterExpression:
//   - Only indexes active documents where sourceUrl is an actual non-null string
//   - Soft-deleted documents (isDeleted: true) are excluded, allowing the same URL to be re-saved
//   - Documents without sourceUrl, or with sourceUrl: undefined/null, are excluded
//   - Empty string sourceUrl values are normalized to undefined by the service
//     before writing, so they are also excluded from the index
jobSchema.index(
  { user: 1, sourceUrl: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceUrl: { $type: 'string' }, isDeleted: false },
  }
)

const Job = mongoose.model('Job', jobSchema)

export default Job
