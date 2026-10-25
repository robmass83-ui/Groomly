import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    testTimeout: 20_000,
    include: [
      'src/pages/AppointmentPage.test.tsx',
      'src/pages/DogsPage.test.tsx',
      'src/pages/LoginPage.test.tsx',
      'src/pages/appointments.test.tsx',
    ],
  },
})
