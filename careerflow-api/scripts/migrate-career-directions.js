import 'dotenv/config'
import mongoose from 'mongoose'

const run = async () => {
  console.log('Career Direction Migration')
  console.log('==========================')

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })
  console.log('Connected to:', mongoose.connection.name)

  const db = mongoose.connection.db
  const resumesCollection = db.collection('resumes')
  const directionsCollection = db.collection('careerdirections')

  // Find all resumes that have non-empty careerDirections
  const resumes = await resumesCollection
    .find({
      careerDirections: { $exists: true, $ne: [], $not: { $size: 0 } },
    })
    .toArray()

  console.log(`\nResumes scanned: ${resumes.length}`)
  console.log(
    `Resumes with career directions: ${resumes.filter((r) => r.careerDirections && r.careerDirections.length > 0).length}`
  )

  let directionsFound = 0
  let directionsMigrated = 0
  let directionsSkipped = 0
  let errors = 0

  for (const resume of resumes) {
    if (!resume.careerDirections || resume.careerDirections.length === 0) continue

    for (const dir of resume.careerDirections) {
      directionsFound++

      try {
        // Check if a CareerDirection with this legacy _id already exists
        const existing = await directionsCollection.findOne({ _id: dir._id })
        if (existing) {
          directionsSkipped++
          continue
        }

        // Create the new CareerDirection, preserving the legacy _id
        await directionsCollection.insertOne({
          _id: dir._id,
          user: resume.user,
          title: dir.title || 'Untitled Direction',
          description: dir.description || undefined,
          focusSkills: dir.focusSkills || [],
          targetRoles: dir.targetRoles || [],
          baseType: 'resume',
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        directionsMigrated++
      } catch (err) {
        errors++
        console.error(`  Error migrating direction "${dir.title}":`, err.message)
      }
    }
  }

  console.log(`\nDirections found: ${directionsFound}`)
  console.log(`Directions migrated: ${directionsMigrated}`)
  console.log(`Directions skipped (already exist): ${directionsSkipped}`)
  console.log(`Errors: ${errors}`)
  console.log('\nDone.')

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('\n[FATAL] Migration failed:', err)
  process.exit(1)
})
