import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')

describe('configurazione Firebase', () => {
  it('firebase.json non pubblica Storage e storage.rules non esiste', () => {
    const config = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf8')) as Record<string, unknown>
    expect(config.storage).toBeUndefined()
    expect(existsSync(resolve(root, 'storage.rules'))).toBe(false)
  })

  it('le regole mettono i tetti a files', () => {
    const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8')
    expect(rules).toContain('match /salon/shared/files/{fileId}')
    expect(rules).toContain('thumb.size() < 25000')
    expect(rules).toContain('dati.size() <= 716800')
    expect(rules).toContain('dati.size() <= 614400')
    expect(rules).toContain("kind != 'files'")
    expect(rules).not.toContain('match /salon/{document=**}')
  })

  it('solo il backup importa firebase/storage', () => {
    const client = readFileSync(resolve(root, 'src/data/firebase/client.ts'), 'utf8')
    const uses = client.split('\n').filter((line) => line.includes("import('firebase/storage')"))
    expect(uses.length).toBeLessThanOrEqual(2)
    expect(client).not.toContain('uploadDataUrl')
  })
})
