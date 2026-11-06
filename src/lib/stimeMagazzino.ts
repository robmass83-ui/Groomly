import type { Chiave } from '../i18n/t'
import type { Appointment, Dog, DogSize, Service } from '../types/models'
import { appointmentAmount, classify, periodRange } from './earnings'
import { appointmentKind } from './personal'
import { statoProdotto, type Prodotto } from './prodotti'

const GIORNO_MS = 24 * 60 * 60 * 1000
const GIORNI_CONSUMO = 30
const MARGINE_GIORNI = 7
const TOCCHI_CONFRONTO = 3
const SCARTO_CONFRONTO = 0.2

export type Lavaggi = Record<DogSize, number>

export const NESSUN_LAVAGGIO: Lavaggi = { piccola: 0, media: 0, grande: 0 }

export interface Stima {
  /** Ml di concentrato al mese. */
  consumoMese: number
  giorni: number
}

export interface Confronto {
  reali: number
  stima: number
}

function contenutoMl(prodotto: Prodotto): number | null {
  if (prodotto.quantita === null) return null
  return prodotto.unita === 'l' ? prodotto.quantita * 1000 : prodotto.quantita
}

/** Un servizio tolto dall'elenco conta come bagno: la visita resta e il suo tipo non si sa più. */
function conBagno(appuntamento: Appointment, servizi: Map<string, Service>): boolean {
  return appuntamento.services.some((voce) => {
    const servizio = servizi.get(voce.serviceId)
    return !servizio || (servizio.kind === 'principale' && !servizio.senzaBagno)
  })
}

/** I bagni completati negli ultimi 30 giorni, per taglia. Un cane non più in elenco vale media. */
export function lavaggiRecenti(appointments: Appointment[], dogs: Dog[], services: Service[], adesso: Date): Lavaggi {
  const inizio = adesso.getTime() - GIORNI_CONSUMO * GIORNO_MS
  const taglie = new Map(dogs.map((dog) => [dog.id, dog.size]))
  const servizi = new Map(services.map((service) => [service.id, service]))
  const lavaggi = { ...NESSUN_LAVAGGIO }
  for (const appuntamento of appointments) {
    const inizioVisita = appuntamento.start.getTime()
    if (appuntamento.status !== 'completato' || appointmentKind(appuntamento) === 'personale') continue
    if (inizioVisita <= inizio || inizioVisita > adesso.getTime() || !conBagno(appuntamento, servizi)) continue
    lavaggi[taglie.get(appuntamento.dogId) ?? 'media'] += 1
  }
  return lavaggi
}

export function stimaProdotto(prodotto: Prodotto, lavaggi: Lavaggi): Stima | null {
  const contenuto = contenutoMl(prodotto)
  if (prodotto.uso !== 'salone' || prodotto.mlPerCane === null || contenuto === null) return null
  const { piccola, media, grande } = prodotto.mlPerCane
  const consumoMese = lavaggi.piccola * piccola + lavaggi.media * media + lavaggi.grande * grande
  if (consumoMese === 0) return null
  return { consumoMese, giorni: (prodotto.pezzi * contenuto * GIORNI_CONSUMO) / consumoMese }
}

/** Prodotti sopra il minimo che finiranno prima del prossimo ordine. */
export function sottoStima(prodotti: Prodotto[], lavaggi: Lavaggi): ReadonlySet<string> {
  return new Set(prodotti.filter((prodotto) => {
    const stima = stimaProdotto(prodotto, lavaggi)
    return stima !== null
      && statoProdotto(prodotto) === 'ok'
      && prodotto.inArrivo === 0
      && stima.giorni < (prodotto.giorniConsegna ?? 0) + MARGINE_GIORNI
  }).map((prodotto) => prodotto.id))
}

export function fraseDurata(giorni: number): { chiave: Chiave; n: number } {
  if (giorni < 1.5) return { chiave: 'magDuraGiorno', n: 1 }
  if (giorni < 14) return { chiave: 'magDuraGiorni', n: Math.round(giorni) }
  if (giorni < 60) return { chiave: 'magDuraSettimane', n: Math.round(giorni / 7) }
  return { chiave: 'magDuraMesi', n: Math.round(giorni / 30) }
}

export function costoLavaggio(prodotto: Prodotto): number | null {
  const contenuto = contenutoMl(prodotto)
  if (prodotto.costo === null || prodotto.mlPerCane === null || contenuto === null) return null
  return (prodotto.costo / contenuto) * prodotto.mlPerCane.media
}

/** Dopo due taniche finite confronta l'ultima con la stima. I tocchi prima dell'ultima risposta non contano. */
export function confrontoTanica(prodotto: Prodotto, stima: Stima | null): Confronto | null {
  const contenuto = contenutoMl(prodotto)
  if (stima === null || contenuto === null) return null
  const tocchi = prodotto.movimenti
    .filter((movimento) => movimento.delta === -1 && movimento.at > (prodotto.confrontoIl ?? 0))
    .map((movimento) => movimento.at)
    .sort((a, b) => b - a)
  if (tocchi.length < TOCCHI_CONFRONTO) return null
  const reali = Math.max(1, Math.round((tocchi[0] - tocchi[1]) / GIORNO_MS))
  const stimati = Math.max(1, Math.round((contenuto * GIORNI_CONSUMO) / stima.consumoMese))
  return Math.abs(reali - stimati) / stimati < SCARTO_CONFRONTO ? null : { reali, stima: stimati }
}

export function chiudiConfronto(prodotto: Prodotto, adesso: Date): Prodotto {
  return { ...prodotto, confrontoIl: adesso.getTime(), updatedAt: adesso }
}

export function correggiConsumo(prodotto: Prodotto, confronto: Confronto, adesso: Date): Prodotto {
  if (prodotto.mlPerCane === null) return chiudiConfronto(prodotto, adesso)
  const corretto = (ml: number) => Math.max(1, Math.round((ml * confronto.stima) / confronto.reali))
  const { piccola, media, grande } = prodotto.mlPerCane
  return { ...chiudiConfronto(prodotto, adesso), mlPerCane: { piccola: corretto(piccola), media: corretto(media), grande: corretto(grande) } }
}

export function incassiMese(appointments: Appointment[], adesso: Date): number {
  const { from, to } = periodRange('mese', adesso)
  return appointments
    .filter((item) => item.start >= from && item.start < to && classify(item, adesso) === 'incassato')
    .reduce((totale, item) => totale + appointmentAmount(item), 0)
}

export interface Riepilogo {
  valore: number
  spesaMese: number
  /** Da 0 a 1. Senza incassi non c'è. */
  incidenza: number | null
}

/** Conta solo ciò che si consuma in salone. Il carico iniziale è nato col prodotto, non è un arrivo. */
export function riepilogoMagazzino(prodotti: Prodotto[], incassi: number, adesso: Date): Riepilogo | null {
  const conCosto = prodotti.filter((prodotto) => prodotto.uso === 'salone' && prodotto.costo !== null)
  if (conCosto.length === 0) return null
  const { from, to } = periodRange('mese', adesso)
  let valore = 0
  let spesaMese = 0
  for (const prodotto of conCosto) {
    const costo = prodotto.costo ?? 0
    valore += prodotto.pezzi * costo
    for (const { at, delta } of prodotto.movimenti) {
      if (delta > 0 && at >= from.getTime() && at < to.getTime() && at !== prodotto.createdAt.getTime()) spesaMese += delta * costo
    }
  }
  return { valore, spesaMese, incidenza: incassi > 0 ? spesaMese / incassi : null }
}
