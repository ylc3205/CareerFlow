import mongoose from 'mongoose'

/**
 * Checks if the current MongoDB connection supports multi-document transactions.
 * Transactions are supported on Replica Sets and Sharded clusters, but NOT on standalone ('Single').
 *
 * @returns {boolean}
 */
export const supportsTransactions = () => {
  try {
    const client = mongoose.connection?.getClient?.() || mongoose.connection?.client
    if (!client || !client.topology) {
      return false
    }
    const topologyType = client.topology.description?.type
    return topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded'
  } catch {
    return false
  }
}

/**
 * Executes a unit of work inside a MongoDB Transaction if supported by the active topology.
 * Falls back safely to direct execution on standalone/local development instances.
 *
 * @param {Function} workFn - async (session) => { ... }
 * @returns {Promise<any>}
 */
export const runInTransaction = async (workFn) => {
  if (!supportsTransactions()) {
    return await workFn(null)
  }

  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => {
      result = await workFn(session)
    })
    return result
  } finally {
    await session.endSession()
  }
}
