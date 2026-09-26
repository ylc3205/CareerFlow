import { defineConfig } from 'vitest/config'
import path from 'path'

// Dedicated Vitest config. The Vite build config (vite.config.js) is intentionally
// kept unchanged; this mirrors the same "src" alias for test files.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    css: false,
    testTimeout: 15000,
  },
})