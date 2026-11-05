import { beforeEach, describe, expect, it, vi } from 'vitest'

const { archivio } = vi.hoisted(() => ({ archivio: new Map<string, Record<string, unknown>>() }))
vi.mock('firebase-admin/firestore', async () => (await import('../piano/firestoreFinto.testutil')).firestoreFinto(archivio))

import { PACCHETTI } from '../../../src/lib/idAbbonamenti'
import { accendiAbbonamentiPer, confermaPartitaIvaPer, controlloAccensionePer, controlloPer, spegniAbbonamentiPer } from './accensione'
import { leggiOfferingRc, verificaOffering } from './offeringRc'

const ROBERTO = { operatorEmail: 'masala.roberto@hotmail.it', admin: true }
const ADESSO = new Date('2027-01-20T10:00:00.000Z')
const fa = (giorni: number) => new Date(ADESSO.getTime() - giorni * 86_400_000).toISOString()
const OFFERING_OK = { id: 'offering', ok: true, trovati: 6, attesi: 6, mancanti: [] } as const

function offeringJson(senza: string[] = []) {
  return {
    items: [
      { lookup_key: 'altro', packages: { items: [] } },
      {
        lookup_key: 'groomly_standard',
        packages: {
          items: Object.entries(PACCHETTI).filter(([k]) => !senza.includes(k)).map(([lookup, prodotto]) => ({
            lookup_key: lookup,
            products: { items: [{ product: { store_identifier: prodotto } }] },
          })),
        },
      },
    ],
  }
}

const globaleVerde = {
  abbonamentiAttivi: false,
  piani: { revenueCat: { chiaveSdk: 'goog_abc', offeringId: 'groomly_standard' }, annuncioPagamentiIl: fa(15), pagamentiDal: fa(0), confermaFiscaleIl: fa(1) },
}

describe('verificaOffering', () => {
  it('conta i pacchetti col prodotto giusto e dice quali mancano', () => {
    expect(verificaOffering(offeringJson(), 'groomly_standard')).toEqual({ trovati: 6, mancanti: [] })
    expect(verificaOffering(offeringJson(['posto_extra_annuale']), 'groomly_standard')).toEqual({ trovati: 5, mancanti: ['posto_extra_annuale'] })
    expect(verificaOffering(offeringJson(), 'nessuno').trovati).toBe(0)
    expect(verificaOffering('rotto', 'groomly_standard').mancanti).toHaveLength(6)
  })

  it('un pacchetto col prodotto sbagliato non conta', () => {
    const json = offeringJson()
    const pacchetto = json.items[1].packages.items[0] as { products: { items: { product: { store_identifier: string } }[] } }
    pacchetto.products.items[0].product.store_identifier = 'groomly_plus:annuale'
    expect(verificaOffering(json, 'groomly_standard').trovati).toBe(5)
  })
})

describe('leggiOfferingRc', () => {
  it('senza progetto o chiave è rosso senza chiamare la rete', async () => {
    const fetchFinto = vi.fn()
    expect(await leggiOfferingRc({ projectId: '', apiKey: 'sk', offeringId: 'groomly_standard', fetch: fetchFinto })).toMatchObject({ ok: false, errore: 'senza-accesso' })
    expect(fetchFinto).not.toHaveBeenCalled()
  })

  it('chiama l’API v2 con la chiave segreta e verifica i pacchetti', async () => {
    const fetchFinto = vi.fn(async () => new Response(JSON.stringify(offeringJson()), { status: 200 }))
    expect(await leggiOfferingRc({ projectId: 'proj1', apiKey: 'sk_x', offeringId: 'groomly_standard', fetch: fetchFinto as unknown as typeof fetch })).toEqual(OFFERING_OK)
    expect(fetchFinto).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v2/projects/proj1/offerings?expand=items.package.product&limit=100',
      { headers: { authorization: 'Bearer sk_x' } },
    )
  })

  it('401 → senza accesso, rete giù → rete', async () => {
    const no = vi.fn(async () => new Response('', { status: 401 }))
    expect(await leggiOfferingRc({ projectId: 'p', apiKey: 'k', offeringId: 'o', fetch: no as unknown as typeof fetch })).toMatchObject({ ok: false, errore: 'senza-accesso' })
    const giu = vi.fn(async () => { throw new Error('rete') })
    expect(await leggiOfferingRc({ projectId: 'p', apiKey: 'k', offeringId: 'o', fetch: giu as unknown as typeof fetch })).toMatchObject({ ok: false, errore: 'rete' })
  })
})

describe('controlloPer', () => {
  it('tutto vuoto: 0 di 5 (l’offering lo dice la sua voce)', () => {
    const c = controlloPer({ globale: undefined, webhook: undefined, offering: { ...OFFERING_OK, ok: false, trovati: 0 } }, ADESSO)
    expect(c).toMatchObject({ pronti: 0, tuttoVerde: false, attivi: false })
    expect(c.voci.map((v) => v.id)).toEqual(['chiave', 'offering', 'webhook', 'annuncio', 'conferma'])
  })

  it('tutto verde', () => {
    expect(controlloPer({ globale: globaleVerde, webhook: { ultimoEventoIl: fa(3) }, offering: OFFERING_OK }, ADESSO)).toMatchObject({ pronti: 5, tuttoVerde: true })
  })

  it('chiave di prova, annuncio di 14 giorni fa e partenza futura sono rossi', () => {
    const chiave = controlloPer({ globale: { piani: { revenueCat: { chiaveSdk: 'test_abc' } } }, webhook: undefined, offering: OFFERING_OK }, ADESSO)
    expect(chiave.voci[0]).toEqual({ id: 'chiave', ok: false })
    const annuncio = controlloPer({ globale: { piani: { annuncioPagamentiIl: fa(14), pagamentiDal: fa(0) } }, webhook: undefined, offering: OFFERING_OK }, ADESSO)
    expect(annuncio.voci[3]).toMatchObject({ ok: false, mancanoGiorni: 1 })
    const partenza = controlloPer({ globale: { piani: { annuncioPagamentiIl: fa(20), pagamentiDal: fa(-3) } }, webhook: undefined, offering: OFFERING_OK }, ADESSO)
    expect(partenza.voci[3]).toMatchObject({ ok: false, mancanoGiorni: 3 })
  })
})

describe('callable di accensione', () => {
  const offering = vi.fn(async () => OFFERING_OK)
  beforeEach(() => {
    archivio.clear()
    archivio.set('config/globale', structuredClone(globaleVerde))
    archivio.set('rcStato/webhook', { ultimoEventoIl: fa(2) })
    archivio.set('salons/pagante/pro/main', { piano: 'salone', stato: 'attivo', fonte: 'play', scadeIl: fa(-20) })
  })

  it('solo operatori', async () => {
    await expect(controlloAccensionePer({ operatorEmail: 'x@y.it', offering }, ADESSO)).rejects.toThrow('Accesso negato')
    await expect(spegniAbbonamentiPer({ operatorEmail: 'x@y.it' })).rejects.toThrow('Accesso negato')
  })

  it('conferma Partita IVA: segna e toglie la data', async () => {
    expect(await confermaPartitaIvaPer({ ...ROBERTO, valore: false }, ADESSO)).toEqual({ ok: true, confermatoIl: null })
    expect((await controlloAccensionePer({ ...ROBERTO, offering }, ADESSO)).voci[4].ok).toBe(false)
    expect(await confermaPartitaIvaPer({ ...ROBERTO, valore: true }, ADESSO)).toEqual({ ok: true, confermatoIl: ADESSO.toISOString() })
    await expect(confermaPartitaIvaPer({ ...ROBERTO, valore: 'si' }, ADESSO)).rejects.toThrow('Impostazione non valida')
  })

  it('accendi: rifiuta con un rosso anche se chiamata direttamente', async () => {
    archivio.delete('rcStato/webhook')
    await expect(accendiAbbonamentiPer({ ...ROBERTO, parola: 'ACCENDI', offering }, ADESSO)).rejects.toThrow('Controllo non superato')
    expect((archivio.get('config/globale') as { abbonamentiAttivi: boolean }).abbonamentiAttivi).toBe(false)
  })

  it('accendi: serve la parola esatta', async () => {
    await expect(accendiAbbonamentiPer({ ...ROBERTO, parola: 'accendi', offering }, ADESSO)).rejects.toThrow('Scrivi ACCENDI')
  })

  it('accendi con tutto verde, poi spegni lasciando il piano a chi ha pagato', async () => {
    expect(await accendiAbbonamentiPer({ ...ROBERTO, parola: 'ACCENDI', offering }, ADESSO)).toEqual({ ok: true })
    const acceso = archivio.get('config/globale') as { abbonamentiAttivi: boolean; piani: Record<string, unknown> }
    expect(acceso.abbonamentiAttivi).toBe(true)
    expect(acceso.piani.accesiIl).toBe(ADESSO.toISOString())
    expect((await controlloAccensionePer({ ...ROBERTO, offering }, ADESSO)).attivi).toBe(true)
    const prima = structuredClone(archivio.get('salons/pagante/pro/main'))
    expect(await spegniAbbonamentiPer(ROBERTO)).toEqual({ ok: true })
    expect((archivio.get('config/globale') as { abbonamentiAttivi: boolean }).abbonamentiAttivi).toBe(false)
    expect(archivio.get('salons/pagante/pro/main')).toEqual(prima)
  })
})
