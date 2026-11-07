import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('./firestoreFinto.testutil')).firestoreFinto(archivio))

import { paginaPubblicaHttp } from './paginaPubblica'

async function pagina(slug: string, browser: string, lang?: string): Promise<{ stato: number; html: string }> {
  const esito = { stato: 0, html: '' }
  const res = {
    status(codice: number) { esito.stato = codice; return res },
    set() { return res },
    send(html: string) { esito.html = html; return res },
  }
  const req = {
    path: `/s/${slug}`,
    query: lang === undefined ? {} : { lang },
    get: (nome: string) => (nome === 'accept-language' ? browser : undefined),
  }
  await paginaPubblicaHttp(req as unknown as Request, res as unknown as Response)
  return esito
}

function linguaDi(html: string): string {
  return /<html lang="(\w+)"/.exec(html)?.[1] ?? ''
}

describe('lingua della pagina del salone', () => {
  beforeEach(() => {
    archivio.clear()
    archivio.set('pubblici/i-pelosetti', { salonId: 's1', nome: 'I Pelosetti' })
    archivio.set('salons/s1/settings/main', { business: { salonName: 'I Pelosetti' }, linguaClienti: 'es' })
  })

  it('un browser in inglese vede la lingua clienti del salone', async () => {
    const { stato, html } = await pagina('i-pelosetti', 'en-US,en;q=0.9,it-IT;q=0.8')
    expect(stato).toBe(200)
    expect(linguaDi(html)).toBe('es')
  })

  it('senza lingua clienti la pagina è in italiano, come il resto di ciò che va ai clienti', async () => {
    archivio.set('salons/s1/settings/main', { business: { salonName: 'I Pelosetti' }, prenotazioniOnline: false })
    expect(linguaDi((await pagina('i-pelosetti', 'en-US')).html)).toBe('it')
    expect(linguaDi((await pagina('i-pelosetti', '')).html)).toBe('it')
  })

  it('?lang= vince sul salone', async () => {
    expect(linguaDi((await pagina('i-pelosetti', 'it-IT', 'de')).html)).toBe('de')
  })

  it('un ?lang= sconosciuto ricade sul salone', async () => {
    expect(linguaDi((await pagina('i-pelosetti', 'en-US', 'pt')).html)).toBe('es')
  })

  it('senza salone resta solo il browser', async () => {
    const { stato, html } = await pagina('nessuno', 'fr-FR')
    expect(stato).toBe(404)
    expect(linguaDi(html)).toBe('fr')
  })
})

describe('pagina intera solo per chi ha scelto di mostrarsi', () => {
  const business = { salonName: 'Da Casa', phone: '+39 333 0000000', address: 'Via Privata 1, Roma' }

  beforeEach(() => {
    archivio.clear()
    archivio.set('pubblici/da-casa', { salonId: 's2', nome: 'Da Casa' })
  })

  it('un salone che non ha mai acceso le prenotazioni né condiviso il link mostra solo il nome, fuori dai motori di ricerca', async () => {
    archivio.set('salons/s2/settings/main', { business, prenotazioniOnline: false })
    const { stato, html } = await pagina('da-casa', 'it-IT')
    expect(stato).toBe(200)
    expect(html).toContain('Da Casa')
    expect(html).not.toContain('333 0000000')
    expect(html).not.toContain('Via Privata')
    expect(html).toContain('<meta name="robots" content="noindex">')
  })

  it('con il link condiviso, le prenotazioni accese o in pausa la pagina resta intera', async () => {
    for (const [settings, pro] of [
      [{ business, paginaScelta: true }, null],
      [{ business, prenotazioniOnline: true }, null],
      [{ business, prenotazioniOnline: false }, { pausa: { prenotazioniOnline: true, attesa: null, dal: '2026-11-01T00:00:00.000Z' } }],
    ] as const) {
      archivio.set('salons/s2/settings/main', settings)
      if (pro) archivio.set('salons/s2/pro/main', pro)
      else archivio.delete('salons/s2/pro/main')
      const { html } = await pagina('da-casa', 'it-IT')
      expect(html).toContain('333 0000000')
      expect(html).toContain('Via Privata')
      expect(html).not.toContain('noindex')
    }
  })
})
