import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getShutdownStatus,
  setShutdownStatus,
  resetShutdownStatus,
  createShutdownHandler,
} from './lifecycle.js'

describe('lifecycle & graceful shutdown', () => {
  beforeEach(() => {
    resetShutdownStatus()
  })

  it('tracks shutdown status correctly', () => {
    expect(getShutdownStatus()).toBe(false)
    setShutdownStatus(true)
    expect(getShutdownStatus()).toBe(true)
    resetShutdownStatus()
    expect(getShutdownStatus()).toBe(false)
  })

  it('executes graceful shutdown closing server and mongoose', async () => {
    const mockServer = {
      close: vi.fn((cb) => cb && cb(null)),
    }
    const mockMongoose = {
      connection: {
        readyState: 1,
        close: vi.fn().mockResolvedValue(true),
      },
    }
    const exitFn = vi.fn()
    const log = vi.fn()
    const errorLog = vi.fn()

    const shutdown = createShutdownHandler({
      server: mockServer,
      mongooseInstance: mockMongoose,
      timeoutMs: 1000,
      exitFn,
      log,
      errorLog,
    })

    await shutdown('SIGTERM', 0)

    expect(getShutdownStatus()).toBe(true)
    expect(mockServer.close).toHaveBeenCalled()
    expect(mockMongoose.connection.close).toHaveBeenCalledWith(false)
    expect(exitFn).toHaveBeenCalledWith(0)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('SIGTERM'))
  })

  it('prevents duplicate shutdown invocations', async () => {
    const mockServer = {
      close: vi.fn((cb) => cb && cb(null)),
    }
    const mockMongoose = {
      connection: {
        readyState: 1,
        close: vi.fn().mockResolvedValue(true),
      },
    }
    const exitFn = vi.fn()

    const shutdown = createShutdownHandler({
      server: mockServer,
      mongooseInstance: mockMongoose,
      exitFn,
      log: vi.fn(),
      errorLog: vi.fn(),
    })

    await shutdown('SIGTERM')
    await shutdown('SIGINT')

    // server.close and mongoose close should only be called once
    expect(mockServer.close).toHaveBeenCalledTimes(1)
    expect(mockMongoose.connection.close).toHaveBeenCalledTimes(1)
    expect(exitFn).toHaveBeenCalledTimes(1)
  })

  it('passes non-zero exit code for fatal errors', async () => {
    const mockServer = {
      close: vi.fn((cb) => cb && cb(null)),
    }
    const exitFn = vi.fn()

    const shutdown = createShutdownHandler({
      server: mockServer,
      exitFn,
      log: vi.fn(),
      errorLog: vi.fn(),
    })

    await shutdown('uncaughtException', 1)

    expect(exitFn).toHaveBeenCalledWith(1)
  })
})
