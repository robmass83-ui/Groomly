import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('collegamento emulatori', () => {
  it('importa connect solo dentro il flag', () => {
    const source = readFileSync(resolve('src/data/firebase/client.ts'), 'utf8')
    expect(source).toContain("import.meta.env.VITE_EMULATORS !== '1'")
    expect(source).toContain('connectAuthEmulator')
    expect(source).not.toMatch(/^import[^\n]*connectAuthEmulator/m)
    expect(source).not.toMatch(/^import[^\n]*connectFirestoreEmulator/m)
    expect(source).not.toMatch(/^import[^\n]*connectFunctionsEmulator/m)
  })
})
