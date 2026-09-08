import { beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/careerflow-test'

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI)
})

afterAll(async () => {
  await mongoose.connection.close()
})