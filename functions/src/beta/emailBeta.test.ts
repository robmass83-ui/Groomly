import { describe, expect, it, vi } from 'vitest'
import { dataBeta, emailBeta, emailOperatore, inviaEmail, type TipoEmailBeta } from './emailBeta'

const TIPI: TipoEmailBeta[] = ['invito', 'invito-ritirato', 'revoca', 'estensione', 'fine-7', 'fine-1']
const FINE = '2026-12-04T23:30:00.000Z' // a Roma è già il 5 dicembre

describe('emailBeta', () => {
  it('ha oggetto e testo in tre lingue per ogni tipo', () => {
    for (const tipo of TIPI) {
      const oggetti = (['it', 'en', 'es'] as const).map((l) => emailBeta(l, tipo, { piano: 'pro', giorni: 60, scadeIl: FINE }).oggetto)
      expect(new Set(oggetti).size).toBe(3)
      for (const o of oggetti) expect(o.length).toBeGreaterThan(5)
    }
  })

  it('usa la cornice Groomly, il nome del piano e la data di Roma nella lingua', () => {
    const it_ = emailBeta('it', 'invito', { piano: 'salone', giorni: 60, scadeIl: FINE })
    expect(it_.html).toContain('groomly-logo-orizzontale.svg')
    expect(it_.html).toContain('Salon')
    expect(it_.html).toContain('60')
    expect(it_.html).toContain('5 dicembre 2026')
    expect(emailBeta('en', 'fine-1', { piano: 'pro', scadeIl: FINE }).html).toContain('5 December 2026')
    expect(emailBeta('es', 'estensione', { piano: 'pro', giorni: 30, scadeIl: FINE }).html).toContain('5 de diciembre de 2026')
    expect(emailBeta('it', 'fine-7', { piano: 'pro', scadeIl: FINE }).html).toContain('Plus')
  })

  it('cita il messaggio dell’operatore con l’escape HTML', () => {
    const mail = emailBeta('it', 'invito', { piano: 'pro', giorni: 30, scadeIl: FINE, testo: 'Ciao <b>Anna</b>\nA presto' })
    expect(mail.html).toContain('Ciao &lt;b&gt;Anna&lt;/b&gt;<br>A presto')
    expect(emailBeta('it', 'revoca', { piano: 'pro' }).html).not.toContain('<blockquote')
  })

  it('dataBeta scrive giorno, mese e anno', () => {
    expect(dataBeta('it', FINE)).toBe('5 dicembre 2026')
  })
})

describe('emailOperatore', () => {
  it('scappa le righe e mette il tipo nell’oggetto', () => {
    const mail = emailOperatore('feedback', ['Salone <x>', 'Voto 5'])
    expect(mail.oggetto).toContain('Feedback')
    expect(mail.html).toContain('Salone &lt;x&gt;')
  })
})

describe('inviaEmail', () => {
  it('senza chiave o senza destinatario non invia', async () => {
    const posta = vi.fn()
    expect(await inviaEmail('', 'a@b.it', { oggetto: 'x', html: 'y' }, posta)).toBe('non_inviata')
    expect(await inviaEmail('k', '', { oggetto: 'x', html: 'y' }, posta)).toBe('non_inviata')
    expect(posta).not.toHaveBeenCalled()
  })

  it('un errore di Brevo diventa non_inviata', async () => {
    expect(await inviaEmail('k', 'a@b.it', { oggetto: 'x', html: 'y' }, async () => { throw new Error('no') })).toBe('non_inviata')
    expect(await inviaEmail('k', 'a@b.it', { oggetto: 'x', html: 'y' }, async () => undefined)).toBe('inviata')
  })
})
