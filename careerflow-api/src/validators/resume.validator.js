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
})
