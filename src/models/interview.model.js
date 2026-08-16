import mongoose from 'mongoose'

export const INTERVIEW_TYPES = [
  'phone',
  'video',
  'onsite',
  'take-home',
  'other',
]

export const INTERVIEW_STATUSES = [
  'scheduled',
  'completed',
  'canceled',
  'no-show',
]

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: INTERVIEW_TYPES,
      default: 'video',
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: INTERVIEW_STATUSES,
      default: 'scheduled',
    },
    interviewerNames: {
      type: String,
      trim: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    feedback: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

const Interview = mongoose.model('Interview', interviewSchema)

export default Interview
