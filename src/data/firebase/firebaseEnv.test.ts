import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('configurazione Firebase nella build', () => {
  it('legge le variabili in modo statico, così Vite le mette nell’APK', () => {
    const enabled = readFileSync('src/data/firebase/enabled.ts', 'utf8')
    const client = readFileSync('src/data/firebase/client.ts', 'utf8')
    expect(enabled).toContain('import.meta.env.VITE_FIREBASE_API_KEY')
    for (const name of [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ]) {
      expect(client).toContain(`import.meta.env.${name}`)
    }
  })
})
