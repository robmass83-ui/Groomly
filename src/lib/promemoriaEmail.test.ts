import { describe, expect, it } from 'vitest'
import { BREVO_TEMPLATE, chiavePromemoria, selezionaPromemoria } from './promemoriaEmail'

describe('promemoria email', () => {
  it('non manda due volte lo stesso appuntamento e lo stesso giorno', () => {
    const voce = { id: 'vis-1', email: 'ada@cliente.it', giorno: '2026-10-26' }
    const prima = selezionaPromemoria([voce, { ...voce, email: '' }, { id: 'vis-2', email: 'leo@cliente.it', giorno: '2026-10-26' }], new Set(), 0)
    expect(prima.invio.map((item) => item.id)).toEqual(['vis-1', 'vis-2'])
    const seconda = selezionaPromemoria([voce], new Set([chiavePromemoria('vis-1', '2026-10-26')]), 0)
    expect(seconda.invio).toEqual([])
  })

  it('il 301° resta in coda', () => {
    const voci = Array.from({ length: 5 }, (_, index) => ({ id: `v${index}`, email: `c${index}@cliente.it`, giorno: '2026-10-26' }))
    const scelti = selezionaPromemoria(voci, new Set(), 299, 300)
    expect(scelti.invio).toHaveLength(1)
    expect(scelti.inCoda).toHaveLength(4)
    expect(BREVO_TEMPLATE.promemoria).toBe(12)
  })
})
