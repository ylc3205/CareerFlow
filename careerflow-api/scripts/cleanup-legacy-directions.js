import 'dotenv/config'
import mongoose from 'mongoose'

const run = async () => {
  console.log('Legacy Career Directions Cleanup')
  console.log('================================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })
  console.log('Connected to:', mongoose.connection.name)

  const db = mongoose.connection.db
  const resumesCollection = db.collection('resumes')

  // Check for legacy careerDirections fields
  // 1. Top-level careerDirections (embedded object structure from old resume model)
  // 2. draft.careerDirections (array of strings from AI parsing)

  const legacyTopLevel = await resumesCollection.countDocuments({
    careerDirections: { $exists: true, $ne: [] },
  })

  const legacyDraft = await resumesCollection.countDocuments({
    'draft.careerDirections': { $exists: true, $ne: [] },
  })

  console.log(`\nResumes with legacy top-level careerDirections: ${legacyTopLevel}`)
  console.log(`Resumes with legacy draft.careerDirections: ${legacyDraft}`)

  if (legacyTopLevel === 0 && legacyDraft === 0) {
    console.log('\nNo legacy careerDirections found. Database is clean.')
    await mongoose.disconnect()
    return
  }

  // Perform cleanup
  let unsetTopLevel = 0
  let unsetDraft = 0

  if (legacyTopLevel > 0) {
    const result = await resumesCollection.updateMany(
      { careerDirections: { $exists: true, $ne: [] } },
      { $unset: { careerDirections: '' } }
    )
    unsetTopLevel = result.modifiedCount
    console.log(`\nRemoved top-level careerDirections from ${unsetTopLevel} resume(s)`)
  }

  if (legacyDraft > 0) {
    const result = await resumesCollection.updateMany(
      { 'draft.careerDirections': { $exists: true, $ne: [] } },
      { $unset: { 'draft.careerDirections': '' } }
    )
    unsetDraft = result.modifiedCount
    console.log(`Removed draft.careerDirections from ${unsetDraft} resume(s)`)
  }

  // Verify cleanup
  const remainingTopLevel = await resumesCollection.countDocuments({
    careerDirections: { $exists: true, $ne: [] },
  })

  const remainingDraft = await resumesCollection.countDocuments({
    'draft.careerDirections': { $exists: true, $ne: [] },
  })

  console.log(`\nVerification:`)
  console.log(`  Remaining top-level careerDirections: ${remainingTopLevel}`)
  console.log(`  Remaining draft.careerDirections: ${remainingDraft}`)

  console.log('\nDone.')

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('\n[FATAL] Cleanup failed:', err)
  process.exit(1)
})