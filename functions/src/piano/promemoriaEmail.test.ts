import { describe, expect, it, vi } from 'vitest'
import { inviaPromemoria } from './promemoriaEmail'

describe('invio promemoria', () => {
  it('senza chiave non chiama la rete', async () => {
    const fetchImpl = vi.fn()
    const esito = await inviaPromemoria({
      voci: [{ id: 'a', email: 'ada@cliente.it', giorno: '2026-10-26' }],
      gia: new Set(),
      emailOggi: 0,
      fetchImpl,
    })
    expect(esito).toEqual({ stato: 'non_inviata', inviati: 0, inCoda: 1 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('con la chiave usa il template 12 e il reply-to del salone', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"messageId":"1"}', { status: 201 }))
    const esito = await inviaPromemoria({
      apiKey: 'chiave',
      voci: [{ id: 'a', email: 'ada@cliente.it', giorno: '2026-10-26' }],
      gia: new Set(),
      emailOggi: 0,
      replyTo: { email: 'sala@salone.it', name: 'Bauci' },
      fetchImpl,
    })
    expect(esito.stato).toBe('inviata')
    expect(esito.inviati).toBe(1)
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as { htmlContent: string; subject: string; replyTo: { email: string }; templateId?: number }
    expect(body.templateId).toBeUndefined()
    expect(body.subject).toBe('Ci vediamo presto!')
    expect(body.htmlContent).toContain('groomly-logo')
    expect(body.htmlContent).toContain('Bauci ti ricorda il prossimo appuntamento.')
    expect(body.htmlContent).toContain('Non voglio più ricevere queste email')
    expect(body.htmlContent).not.toContain('<a ')
    expect(body.replyTo.email).toBe('sala@salone.it')
  })
})
