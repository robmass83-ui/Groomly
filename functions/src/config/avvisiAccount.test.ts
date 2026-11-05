import { describe, expect, it, vi } from 'vitest'
import { scriviAvvisoAccount } from './avvisiAccount'

vi.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => 'ADESSO' } }))

function finto() {
  const set = vi.fn(async (_dati: Record<string, unknown>) => undefined)
  const doc = vi.fn(() => ({ id: 'av1', set }))
  const collection = vi.fn((_percorso: string) => ({ doc }))
  return { db: { collection }, collection, set }
}

describe('scriviAvvisoAccount', () => {
  it('scrive nella sottoraccolta dell’account con la data del server', async () => {
    const { db, collection, set } = finto()
    const id = await scriviAvvisoAccount(db as never, 'uid1', { tipo: 'novita', titolo: 'T', testo: 'X', origine: 'assistenza' })
    expect(id).toBe('av1')
    expect(collection).toHaveBeenCalledWith('accounts/uid1/avvisi')
    expect(set).toHaveBeenCalledWith({ tipo: 'novita', titolo: 'T', testo: 'X', origine: 'assistenza', creato: 'ADESSO' })
  })

  it('porta con sé traduzioni e comunicazione', async () => {
    const { db, set } = finto()
    const traduzioni = { de: { titolo: 'H', testo: 'T' } }
    await scriviAvvisoAccount(db as never, 'uid1', { tipo: 'novita', titolo: 'T', testo: 'X', origine: 'comunicazione', traduzioni, comunicazioneId: 'c1' })
    expect(set.mock.calls[0]?.[0]).toMatchObject({ traduzioni, comunicazioneId: 'c1' })
  })

  it('rifiuta un uid che scende nel percorso', async () => {
    const { db, set } = finto()
    await expect(scriviAvvisoAccount(db as never, 'a/b', { tipo: 'novita', titolo: 'T', testo: 'X', origine: 'assistenza' })).rejects.toThrow()
    expect(set).not.toHaveBeenCalled()
  })
})
