import mongoose from 'mongoose'

export const CAREER_DIRECTION_BASE_TYPES = ['profile', 'resume']

const careerDirectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
  },
  { timestamps: true }
)

careerDirectionSchema.index({ user: 1, createdAt: -1 })

const CareerDirection = mongoose.model('CareerDirection', careerDirectionSchema)

export default CareerDirection
