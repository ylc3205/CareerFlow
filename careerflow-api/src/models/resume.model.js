import mongoose from 'mongoose'

const resumeExperienceSchema = new mongoose.Schema(
  {
    company: { type: String, trim: true },
    position: { type: String, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
  },
  { _id: true }
)

const resumeEducationSchema = new mongoose.Schema(
  {
    school: { type: String, trim: true },
    degree: { type: String, trim: true },
    fieldOfStudy: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: true }
)

const resumeProjectSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    url: { type: String, trim: true },
    techStack: { type: [String], default: [] },
  },
  { _id: true }
)

const resumeCertificationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    issuer: { type: String, trim: true },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    url: { type: String, trim: true },
  },
  { _id: true }
)

const resumeOriginalFileSchema = new mongoose.Schema(
  {
    fileUrl: { type: String },
    publicId: { type: String },
    originalFileName: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
  },
  { _id: false }
)

// AI-parsed proposal that has NOT been confirmed by the user yet.
//
// Mirrors the main fields so the user can review/edit the draft and only
// confirmed values are written to the main Resume fields.
const resumeDraftSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    summary: { type: String, trim: true },

    skills: { type: [String], default: [] },

    languages: { type: [String], default: [] },

    experience: {
      type: [resumeExperienceSchema],
      default: [],
    },

    education: {
      type: [resumeEducationSchema],
      default: [],
    },

    projects: {
      type: [resumeProjectSchema],
      default: [],
    },

    certifications: {
      type: [resumeCertificationSchema],
      default: [],
    },

    profile: {
      fullName: { type: String, trim: true },
      phone: { type: String, trim: true },
      location: { type: String, trim: true },
      headline: { type: String, trim: true },
      yearsOfExperience: { type: Number },
    },
  },
  { _id: false }
)

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    title: {
      type: String,
      trim: true,
    },

    summary: {
      type: String,
      trim: true,
    },

    skills: {
      type: [String],
      default: [],
    },

    experience: {
      type: [resumeExperienceSchema],
      default: [],
    },

    education: {
      type: [resumeEducationSchema],
      default: [],
    },

    projects: {
      type: [resumeProjectSchema],
      default: [],
    },

    certifications: {
      type: [resumeCertificationSchema],
      default: [],
    },

    languages: {
      type: [String],
      default: [],
    },

    originalFile: {
      type: resumeOriginalFileSchema,
      default: null,
    },

    draft: {
      type: resumeDraftSchema,
      default: null,
    },

    importStatus: {
      type: String,
      enum: ['none', 'draft', 'confirmed'],
      default: 'none',
    },

  },
  {
    timestamps: true,
  }
)

const Resume = mongoose.model('Resume', resumeSchema)

export default Resume