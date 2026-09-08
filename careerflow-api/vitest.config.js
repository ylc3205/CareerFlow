import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.js'],
    setupFiles: ['./test/setup.js'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})