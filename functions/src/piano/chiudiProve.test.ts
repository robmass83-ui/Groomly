import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import { chiudiProveScadute } from './chiudiProve'

const adesso = new Date('2026-11-02T10:00:00.000Z')
const passata = '2026-11-01T10:00:00.000Z'

describe('chiudiProveScadute', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('salons/a/pro/main', { piano: 'salone', stato: 'grazia', fonte: 'play', scadeIl: passata, enabled: true })
    archivio.set('salons/b/pro/main', { piano: 'salone', stato: 'attivo', fonte: 'omaggio', scadeIl: null, enabled: true })
    archivio.set('salons/c/pro/main', { piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: passata, enabled: false })
  })

  it('chiude ogni piano scaduto e lascia stare chi non ha data', async () => {
    expect(await chiudiProveScadute(adesso)).toBe(2)
    expect(archivio.get('salons/a/pro/main')).toMatchObject({
      piano: 'base', stato: 'scaduto', enabled: false, updatedAt: adesso.toISOString(),
    })
    expect(archivio.get('salons/c/pro/main')).toMatchObject({ piano: 'base', stato: 'scaduto' })
    expect(archivio.get('salons/b/pro/main')).toMatchObject({ piano: 'salone', stato: 'attivo', enabled: true })
  })
})
