import { describe, expect, it } from 'vitest'
import type { Appointment, Dog, DogSize, Service } from '../types/models'
import { DETTAGLI_VUOTI, type Movimento, type Prodotto } from './prodotti'
import { chiudiConfronto, confrontoTanica, correggiConsumo, costoLavaggio, fraseDurata, incassiMese, lavaggiRecenti, riepilogoMagazzino, sottoStima, stimaProdotto } from './stimeMagazzino'

const ADESSO = new Date('2026-11-20T12:00:00.000Z')
const GIORNO = 24 * 60 * 60 * 1000
const SHAMPOO = { piccola: 15, media: 30, grande: 50 }

function prodotto(over: Partial<Prodotto> = {}): Prodotto {
  return { id: 'p1', nome: 'Shampoo', categoria: 'lavaggio', quantita: 5, unita: 'l', ditta: '', codice: '', pezzi: 4, telefono: '', email: '', soglia: 2, inArrivo: 0, ordinatoIl: null, movimenti: [], ...DETTAGLI_VUOTI, mlPerCane: SHAMPOO, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), ...over }
}

function cane(id: string, size: DogSize): Dog {
  return { id, size } as Dog
}

function servizio(id: string, over: Partial<Service> = {}): Service {
  return { id, kind: 'principale', ...over } as Service
}

function visita(dogId: string, giorniFa: number, over: Partial<Appointment> = {}): Appointment {
  return { id: `${dogId}-${giorniFa}`, dogId, start: new Date(ADESSO.getTime() - giorniFa * GIORNO), status: 'completato', services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 30 }], ...over } as Appointment
}

const cani = [cane('p', 'piccola'), cane('m', 'media'), cane('g', 'grande')]
const servizi = [servizio('bagno'), servizio('unghie', { senzaBagno: true }), servizio('extra', { kind: 'extra' })]

describe('lavaggi recenti', () => {
  it('conta per taglia i completati degli ultimi 30 giorni', () => {
    const visite = [visita('p', 1), visita('p', 29), visita('m', 2), visita('g', 3), visita('g', 31)]
    expect(lavaggiRecenti(visite, cani, servizi, ADESSO)).toEqual({ piccola: 2, media: 1, grande: 1 })
  })

  it('non conta programmati, disdetti, assenti, personali e visite future', () => {
    const visite = [visita('p', 1, { status: 'programmato' }), visita('p', 2, { status: 'disdetto' }), visita('p', 3, { status: 'non_venuto' }), visita('p', 4, { kind: 'personale' }), visita('p', -2)]
    expect(lavaggiRecenti(visite, cani, servizi, ADESSO)).toEqual({ piccola: 0, media: 0, grande: 0 })
  })

  it('un servizio escluso o un extra da solo non è un bagno, con un principale sì', () => {
    const riga = (serviceId: string) => ({ serviceId, name: 'x', durationMin: 1, price: 1 })
    const visite = [visita('p', 1, { services: [riga('unghie')] }), visita('p', 2, { services: [riga('extra')] }), visita('m', 3, { services: [riga('extra'), riga('bagno')] })]
    expect(lavaggiRecenti(visite, cani, servizi, ADESSO)).toEqual({ piccola: 0, media: 1, grande: 0 })
  })

  it('un servizio tolto conta come bagno e un cane tolto come media', () => {
    expect(lavaggiRecenti([visita('sparito', 1, { services: [{ serviceId: 'vecchio', name: 'x', durationMin: 1, price: 1 }] })], cani, servizi, ADESSO)).toEqual({ piccola: 0, media: 1, grande: 0 })
  })
})

describe('stima', () => {
  const lavaggi = { piccola: 40, media: 30, grande: 10 }

  it('somma il consumo di ogni taglia e divide il contenuto', () => {
    const stima = stimaProdotto(prodotto({ pezzi: 2 }), lavaggi)
    expect(stima?.consumoMese).toBe(40 * 15 + 30 * 30 + 10 * 50)
    expect(stima?.giorni).toBeCloseTo((10000 * 30) / 2000)
  })

  it('i ml valgono come i litri', () => {
    expect(stimaProdotto(prodotto({ pezzi: 1, quantita: 500, unita: 'ml' }), lavaggi)?.giorni).toBeCloseTo(7.5)
  })

  it('niente stima senza consumo, formato, lavaggi o per un prodotto in vendita', () => {
    expect(stimaProdotto(prodotto({ mlPerCane: null }), lavaggi)).toBeNull()
    expect(stimaProdotto(prodotto({ quantita: null }), lavaggi)).toBeNull()
    expect(stimaProdotto(prodotto({ uso: 'vendita' }), lavaggi)).toBeNull()
    expect(stimaProdotto(prodotto(), { piccola: 0, media: 0, grande: 0 })).toBeNull()
  })

  it('la soglia è consegna più 7 giorni, senza consegna solo 7', () => {
    // 2000 ml al mese: 450 ml durano 6,75 giorni, 600 ml ne durano 9.
    const base = { pezzi: 3, soglia: 2, quantita: 150, unita: 'ml' as const }
    expect(sottoStima([prodotto({ ...base, id: 'a' })], lavaggi).has('a')).toBe(true)
    expect(sottoStima([prodotto({ ...base, id: 'b', quantita: 200 })], lavaggi).has('b')).toBe(false)
    expect(sottoStima([prodotto({ ...base, id: 'c', quantita: 200, giorniConsegna: 3 })], lavaggi).has('c')).toBe(true)
  })

  it('non segnala chi è già sotto il minimo o già in arrivo', () => {
    expect(sottoStima([prodotto({ pezzi: 1, soglia: 2, quantita: 10, unita: 'ml' })], lavaggi).size).toBe(0)
    expect(sottoStima([prodotto({ pezzi: 3, soglia: 2, quantita: 10, unita: 'ml', inArrivo: 4 })], lavaggi).size).toBe(0)
  })

  it('dice la durata in giorni, settimane o mesi', () => {
    expect(fraseDurata(0.4)).toEqual({ chiave: 'magDuraGiorno', n: 1 })
    expect(fraseDurata(5.2)).toEqual({ chiave: 'magDuraGiorni', n: 5 })
    expect(fraseDurata(21)).toEqual({ chiave: 'magDuraSettimane', n: 3 })
    expect(fraseDurata(90)).toEqual({ chiave: 'magDuraMesi', n: 3 })
  })

  it('il costo per lavaggio guarda la taglia media', () => {
    expect(costoLavaggio(prodotto({ costo: 50 }))).toBeCloseTo(0.3)
    expect(costoLavaggio(prodotto())).toBeNull()
    expect(costoLavaggio(prodotto({ costo: 50, quantita: null }))).toBeNull()
  })
})

describe('confronto tanica', () => {
  const stima = { consumoMese: 6000, giorni: 100 }
  const tocco = (giorniFa: number, delta = -1): Movimento => ({ at: ADESSO.getTime() - giorniFa * GIORNO, delta, dopo: 1 })

  it('parla solo dopo due taniche finite', () => {
    expect(confrontoTanica(prodotto({ movimenti: [tocco(0), tocco(18)] }), stima)).toBeNull()
    expect(confrontoTanica(prodotto({ movimenti: [tocco(0), tocco(18), tocco(36)] }), stima)).toEqual({ reali: 18, stima: 25 })
  })

  it('tace se la stima è giusta o se manca', () => {
    expect(confrontoTanica(prodotto({ movimenti: [tocco(0), tocco(24), tocco(48)] }), stima)).toBeNull()
    expect(confrontoTanica(prodotto({ movimenti: [tocco(0), tocco(18), tocco(36)] }), null)).toBeNull()
  })

  it('gli arrivi e i tocchi di più pezzi non contano', () => {
    expect(confrontoTanica(prodotto({ movimenti: [tocco(0), tocco(5, 3), tocco(18), tocco(30, -2)] }), stima)).toBeNull()
  })

  it('due tocchi nello stesso giorno valgono almeno un giorno', () => {
    expect(confrontoTanica(prodotto({ movimenti: [tocco(0), tocco(0.01), tocco(20)] }), stima)?.reali).toBe(1)
  })

  it('con Sì aggiorna il consumo e riparte da capo', () => {
    const corretto = correggiConsumo(prodotto({ movimenti: [tocco(0), tocco(18), tocco(36)] }), { reali: 18, stima: 25 }, ADESSO)
    expect(corretto.mlPerCane).toEqual({ piccola: 21, media: 42, grande: 69 })
    expect(confrontoTanica(corretto, stima)).toBeNull()
  })

  it('con No non ripete la domanda finché non passano altre due taniche', () => {
    const movimenti = [tocco(0), tocco(18), tocco(36)]
    const chiuso = chiudiConfronto(prodotto({ movimenti }), new Date(ADESSO.getTime() + 1))
    expect(chiuso.mlPerCane).toEqual(SHAMPOO)
    expect(confrontoTanica(chiuso, stima)).toBeNull()
    const dopo = [-60, -40, -20].map((giorni) => tocco(giorni))
    expect(confrontoTanica({ ...chiuso, movimenti: [...dopo, ...movimenti] }, stima)).toEqual({ reali: 20, stima: 25 })
  })
})

describe('riepilogo', () => {
  const dentro = new Date('2026-11-10T10:00:00.000Z').getTime()
  const fuori = new Date('2026-10-10T10:00:00.000Z').getTime()

  it('non c’è senza costi', () => {
    expect(riepilogoMagazzino([prodotto()], 1000, ADESSO)).toBeNull()
    expect(riepilogoMagazzino([prodotto({ uso: 'vendita', costo: 10 })], 1000, ADESSO)).toBeNull()
  })

  it('valore e spesa contano solo il salone e gli arrivi del mese', () => {
    const creato = new Date(fuori + GIORNO)
    const elenco = [
      prodotto({ costo: 10, pezzi: 3, movimenti: [{ at: dentro, delta: 2, dopo: 3 }, { at: dentro, delta: -1, dopo: 1 }, { at: fuori, delta: 5, dopo: 2 }], createdAt: creato }),
      prodotto({ id: 'v', uso: 'vendita', costo: 100, pezzi: 9, movimenti: [{ at: dentro, delta: 9, dopo: 9 }] }),
    ]
    expect(riepilogoMagazzino(elenco, 400, ADESSO)).toEqual({ valore: 30, spesaMese: 20, incidenza: 0.05 })
  })

  it('il carico iniziale non è un arrivo', () => {
    const elenco = [prodotto({ costo: 10, pezzi: 3, movimenti: [{ at: dentro, delta: 3, dopo: 3 }], createdAt: new Date(dentro) })]
    expect(riepilogoMagazzino(elenco, 400, ADESSO)?.spesaMese).toBe(0)
  })

  it('senza incassi l’incidenza non c’è', () => {
    expect(riepilogoMagazzino([prodotto({ costo: 10 })], 0, ADESSO)?.incidenza).toBeNull()
  })

  it('gli incassi sono i completati del mese', () => {
    const visite = [visita('p', 1, { total: 40 }), visita('p', 2, { total: 10, status: 'disdetto' }), visita('p', 45, { total: 99 })]
    expect(incassiMese(visite, ADESSO)).toBe(40)
  })
})
