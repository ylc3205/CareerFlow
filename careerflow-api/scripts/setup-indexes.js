import 'dotenv/config'
import mongoose from 'mongoose'

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME })
  console.log('Connected to:', mongoose.connection.name)

  const db = mongoose.connection.db

  // Clean up ALL test job data FIRST so there are no duplicates blocking index creation
  const cleaned = await db.collection('jobs').deleteMany({})
  console.log('Cleaned up jobs:', cleaned.deletedCount, 'documents removed')

  // Now create the compound unique index with partialFilterExpression
  await db.collection('jobs').createIndex(
    { user: 1, sourceUrl: 1 },
    {
      unique: true,
      partialFilterExpression: { sourceUrl: { $type: 'string' } },
      name: 'user_1_sourceUrl_1',
    }
  )
  console.log('Index created successfully')

  // Verify
  const indexes = await db.collection('jobs').indexes()
  console.log('Job indexes:')
  indexes.forEach(i =>
    console.log(
      ' -', i.name,
      JSON.stringify(i.key),
      i.unique ? 'UNIQUE' : '',
      i.partialFilterExpression ? 'partial=' + JSON.stringify(i.partialFilterExpression) : ''
    )
  )

  await mongoose.disconnect()
}

run().catch(console.error)
