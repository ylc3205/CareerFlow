import 'dotenv/config'
import mongoose from 'mongoose'

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DATABASE_NAME,
  })
  
  const collections = await mongoose.connection.db.listCollections().toArray()
  const names = collections.map(c => c.name).sort()
  console.log('=== Collections ===')
  console.log(names.join('\n'))

  const idx = await mongoose.connection.db.collection('interviews').indexes()
  console.log('\n=== Interview Indexes ===')
  idx.forEach(i => console.log(JSON.stringify(i.key)))

  await mongoose.disconnect()
}

run().catch(console.error)
