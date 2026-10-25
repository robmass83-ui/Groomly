import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_FIREBASE_')
  if (command === 'build' && !env.VITE_FIREBASE_API_KEY) {
    throw new Error('Manca VITE_FIREBASE_API_KEY: la build lascerebbe il login cloud spento')
  }
  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      testTimeout: 15_000,
      exclude: ['**/.worktrees/**', '**/node_modules/**', '**/dist/**', '**/*.emulator.test.ts'],
    },
  }
})
