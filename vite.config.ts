import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// Il sito admin non è un'app nativa: questi plugin non devono entrare nel suo bundle.
const PLUGIN_NATIVI = [
  '@capacitor-firebase/analytics',
  '@capacitor-firebase/crashlytics',
  '@capacitor/app',
  '@capacitor/browser',
  '@capacitor/camera',
  '@capacitor/file-viewer',
  '@capacitor/filesystem',
  '@capacitor/local-notifications',
  '@capacitor/push-notifications',
  '@capacitor/share',
  '@revenuecat/purchases-capacitor',
]

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_FIREBASE_')
  if (command === 'build' && !env.VITE_FIREBASE_API_KEY) {
    throw new Error('Manca VITE_FIREBASE_API_KEY: la build lascerebbe il login cloud spento')
  }
  return {
    plugins: [react(), tailwindcss()],
    ...(mode === 'admin' ? {
      build: { outDir: 'dist-admin', rollupOptions: { input: 'admin.html' } },
      resolve: { alias: Object.fromEntries(PLUGIN_NATIVI.map((nome) => [nome, resolve(import.meta.dirname, 'src/lib/stubNativi/vuoto.ts')])) },
    } : {}),
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      testTimeout: 15_000,
      exclude: [
        '**/.worktrees/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/dist-admin/**',
        '**/*.emulator.test.ts',
        'src/pages/AppointmentPage.test.tsx',
        'src/pages/DogsPage.test.tsx',
        'src/pages/LoginPage.test.tsx',
        'src/pages/appointments.test.tsx',
        'scripts/**',
      ],
    },
  }
})
