import { describe, expect, it, vi } from 'vitest'
import { DESTINATARIO_CAMPIONE, inviaCampione, pianoCampione } from './campioneEmail'

describe('campione email', () => {
  it('non spedisce se non è Roberto o manca la chiave', async () => {
    const invia = vi.fn()
    expect(pianoCampione()).toHaveLength(33)
    await expect(inviaCampione({ email: 'laura.masala@tiscali.it', apiKey: 'x', invia })).resolves.toEqual({ spedite: 0, motivo: 'negato' })
    await expect(inviaCampione({ email: 'masala.roberto@hotmail.it', invia })).resolves.toEqual({ spedite: 0, motivo: 'chiave assente' })
    expect(invia).not.toHaveBeenCalled()
  })

  it('manda trentatre email solo a info', async () => {
    const invia = vi.fn(async () => undefined)
    const esito = await inviaCampione({ email: 'masala.roberto@hotmail.it', apiKey: 'x', invia })
    expect(esito).toEqual({ spedite: 33 })
    expect(invia).toHaveBeenCalledTimes(33)
    for (const chiamata of invia.mock.calls) expect(chiamata[0]).toBe(DESTINATARIO_CAMPIONE)
  })
})
