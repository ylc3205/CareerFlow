import mongoose from 'mongoose'

const educationSchema = new mongoose.Schema(
  {
    school: { type: String, trim: true },
    degree: { type: String, trim: true },
    fieldOfStudy: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: true }
)

const experienceSchema = new mongoose.Schema(
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

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    headline: { type: String, trim: true },
    bio: { type: String, trim: true },
    skills: { type: [String], default: [] },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
  },
  { timestamps: true }
)

const Profile = mongoose.model('Profile', profileSchema)

export default Profile
