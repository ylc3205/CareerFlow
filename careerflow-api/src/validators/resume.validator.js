import { z } from 'zod'

const resumeExperienceSchema = z.object({
  company: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  current: z.boolean().optional(),
})

const resumeEducationSchema = z.object({
  school: z.string().max(200).optional(),
  degree: z.string().max(200).optional(),
  fieldOfStudy: z.string().max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

const resumeProjectSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional().or(z.literal('')),
  techStack: z.array(z.string().max(100)).optional(),
})

const resumeCertificationSchema = z.object({
  name: z.string().max(200).optional(),
  issuer: z.string().max(200).optional(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  url: z.string().url().optional().or(z.literal('')),
})

export const updateResumeSchema = z.object({
  title: z.string().max(200).optional(),
  summary: z.string().max(3000).optional(),
  skills: z.array(z.string().max(100)).optional(),
  experience: z.array(resumeExperienceSchema).optional(),
  education: z.array(resumeEducationSchema).optional(),
  projects: z.array(resumeProjectSchema).optional(),
  certifications: z.array(resumeCertificationSchema).optional(),
  languages: z.array(z.string().max(100)).optional(),
  careerDirections: z
    .array(
      z.object({
        title: z.string().max(200).optional(),
        description: z.string().max(500).optional(),
      })
    )
    .optional(),
})

// Zod schema the AI resume parsing output must satisfy before it is stored as
// the user-reviewable draft. Mirrors updateResumeSchema plus the AI-only
// `profile` suggestion and `careerDirections` suggestions.
export const resumeParseSchema = z.object({
  title: z.string().max(200).optional(),
  summary: z.string().max(3000).optional(),
  skills: z.array(z.string().max(100)).optional(),
  languages: z.array(z.string().max(100)).optional(),
  experience: z.array(resumeExperienceSchema).optional(),
  education: z.array(resumeEducationSchema).optional(),
  projects: z.array(resumeProjectSchema).optional(),
  certifications: z.array(resumeCertificationSchema).optional(),
  careerDirections: z.array(z.string().max(200)).optional(),
  profile: z
    .object({
      fullName: z.string().max(100).optional(),
      phone: z.string().max(30).optional(),
      location: z.string().max(200).optional(),
      headline: z.string().max(200).optional(),
      yearsOfExperience: z.number().min(0).optional(),
    })
    .optional(),
})

// Body accepted by POST /api/resume/confirm — the user-confirmed Resume data.
export const confirmResumeSchema = updateResumeSchema
