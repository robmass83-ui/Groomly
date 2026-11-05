import { describe, expect, it, vi } from 'vitest'
import { DESTINATARIO_CAMPIONE, inviaCampione, pianoCampione } from './campioneEmail'

describe('campione email', () => {
  it('non spedisce senza claim o senza chiave', async () => {
    const invia = vi.fn()
    expect(pianoCampione()).toHaveLength(75)
    await expect(inviaCampione({ admin: false, apiKey: 'x', invia })).resolves.toEqual({ spedite: 0, motivo: 'negato' })
    await expect(inviaCampione({ admin: true, invia })).resolves.toEqual({ spedite: 0, motivo: 'chiave assente' })
    expect(invia).not.toHaveBeenCalled()
  })

  it('manda settantacinque email solo a info', async () => {
    const invia = vi.fn(async () => undefined)
    const esito = await inviaCampione({ admin: true, apiKey: 'x', invia })
    expect(esito).toEqual({ spedite: 75 })
    expect(invia).toHaveBeenCalledTimes(75)
    for (const chiamata of invia.mock.calls) expect(chiamata[0]).toBe(DESTINATARIO_CAMPIONE)
  })
})
