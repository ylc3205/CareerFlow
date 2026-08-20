import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../src/models/user.model.js'

const emails = [
  'jobfilter-a@example.com',
  'jobfilter-b@example.com',
  'applicationfilter-a@example.com',
  'applicationfilter-b@example.com',
  'interviewfilter-a@example.com',
  'interviewfilter-b@example.com',
  'match-main@example.com',
  'match-other@example.com',
  'match-nodata@example.com',
  'match-profile@example.com',
  'match-resume@example.com',
  'aianalysis-summary-a@example.com',
  'aianalysis-summary-b@example.com',
  'aianalysis-summary-c@example.com',
  'aianalysis-delete-a@example.com',
  'aianalysis-delete-b@example.com',
  'aianalyses-list-a@example.com',
  'aianalyses-list-b@example.com',
  'aianalyses-list-c@example.com',
  'dbg-upload@example.com',
]

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })
  const res = await User.deleteMany({ email: { $in: emails } })
  console.log(`Deleted ${res.deletedCount} legacy test users`)
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
