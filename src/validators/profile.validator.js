import { z } from 'zod'

const educationSchema = z.object({
  school: z.string().max(200).optional(),
  degree: z.string().max(200).optional(),
  fieldOfStudy: z.string().max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

const experienceSchema = z.object({
  company: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  current: z.boolean().optional(),
})

export const updateProfileSchema = z.object({
  fullName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  location: z.string().max(200).optional(),
  headline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  skills: z.array(z.string().max(100)).optional(),
  yearsOfExperience: z.number().min(0).optional(),
  education: z.array(educationSchema).optional(),
  experience: z.array(experienceSchema).optional(),
})
