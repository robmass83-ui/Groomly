import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/firestoreRules.emulator.test.ts', 'src/lib/legaleArchivi.emulator.test.ts'],
    // Le prove condividono un solo emulatore: quelle delle regole lo svuotano a ogni giro.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
})
