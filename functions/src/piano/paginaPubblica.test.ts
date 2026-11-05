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
