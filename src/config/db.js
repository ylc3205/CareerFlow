import mongoose from 'mongoose'

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DATABASE_NAME,
  })
  console.log(`MongoDB connected: ${conn.connection.host}`)
}

export default connectDB
